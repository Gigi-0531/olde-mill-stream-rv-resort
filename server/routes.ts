// backend/routes.ts
import express, { Request, Response, NextFunction, Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import multer from "multer";
import ExcelJS from "exceljs";

import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, ilike, sql } from "drizzle-orm";
import { ObjectStorageService } from "./replit_integrations/object_storage";

const MemoryStore = createMemoryStore(session);
const objectStorageService = new ObjectStorageService();

// ------------------- Utilities -------------------
function sanitizeAlphanumeric(input: string) {
  return input.replace(/[^a-zA-Z0-9]/g, "");
}

function safeUser(user: any) {
  const { password, ...safe } = user;
  return safe;
}

function requireAuth(req: Request & { session: any }, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Please log in" });
  next();
}

async function requireAdmin(req: Request & { session: any }, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Please log in" });
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});

// ------------------- Routes -------------------
export function registerRoutes(_server: any, app: Express) {
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required");

  const isProduction = process.env.NODE_ENV === "production";

  app.use(
    session({
      name: "oms.sid",
      secret: process.env.SESSION_SECRET!,
      resave: true,
      saveUninitialized: true,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: {
        maxAge: 86400000,
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      },
    })
  );

  // -------- Register User --------
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const username = String(req.body.username || "").trim();
      const password = String(req.body.password || "");
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = await storage.createUser({ username, password: hashedPassword, role: "admin" });
      res.status(201).json(safeUser(user));
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // -------- Unified Login (matches frontend /api/auth/login) --------
  app.post("/api/auth/login", loginLimiter, async (req: Request & { session: any }, res: Response) => {
    try {
      const role = req.body.role;

      if (role === "admin") {
        const username = String(req.body.username || "").trim();
        const password = String(req.body.password || "");

        if (!username || !password) {
          return res.status(400).json({ message: "Please enter your email and password." });
        }

        const user = await storage.getUserByUsername(username);
        if (!user || user.role !== "admin") {
          return res.status(401).json({ message: "Incorrect email or password. Please try again." });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return res.status(401).json({ message: "Incorrect email or password. Please try again." });
        }

        req.session.userId = user.id;
        return res.json(safeUser(user));

      } else if (role === "resident") {
        const lotNumber = String(req.body.lotNumber || "").trim();
        const lastName = String(req.body.lastName || "").trim();

        if (!lotNumber || !lastName) {
          return res.status(400).json({ message: "Please enter your lot number and last name." });
        }

        const residents = await storage.getUsersByLotAndName(lotNumber, lastName);

        if (residents.length === 0) {
          return res.status(401).json({ message: "No resident found with that lot number and last name. Please check your info and try again." });
        } else if (residents.length === 1) {
          const user = residents[0];
          req.session.userId = user.id;
          return res.json(safeUser(user));
        } else {
          req.session.pendingProfiles = residents.map(r => r.id);
          return res.json({
            requiresProfileSelection: true,
            profiles: residents.map(r => ({
              id: r.id,
              firstName: r.firstName || "Resident",
              profilePicture: r.profilePicture
                ? objectStorageService.normalizeObjectEntityPath(r.profilePicture)
                : null,
            })),
          });
        }
      } else {
        return res.status(400).json({ message: "Invalid login type." });
      }
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // -------- Get Current User --------
  app.get("/api/auth/me", async (req: Request & { session: any }, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not logged in" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "Not logged in" });
      }
      res.json(safeUser(user));
    } catch {
      res.status(401).json({ message: "Not logged in" });
    }
  });

  // -------- Select profile if multiple --------
  app.post("/api/auth/select-profile", async (req: Request & { session: any }, res: Response) => {
    try {
      const profileId = Number(req.body.profileId);
      if (isNaN(profileId)) return res.status(400).json({ message: "Invalid profile ID" });

      const pendingProfiles: number[] = req.session.pendingProfiles || [];
      if (!pendingProfiles.includes(profileId)) return res.status(401).json({ message: "Invalid profile selection" });

      const user = await storage.getUser(profileId);
      if (!user) return res.status(404).json({ message: "Profile not found" });

      req.session.userId = user.id;
      delete req.session.pendingProfiles;
      res.json(safeUser(user));
    } catch {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // -------- Logout --------
  app.post("/api/auth/logout", (req: Request & { session: any }, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // -------- Directory: Get all residents with contact info --------
  app.get("/api/directory", requireAuth, async (req: Request & { session: any }, res: Response) => {
    try {
      const residents = await db.select().from(users).where(eq(users.role, "resident"));
      const safeResidents = residents.map(r => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        lotNumber: r.lotNumber,
        phoneNumber: r.phoneNumber,
        username: r.username,
        profilePicture: r.profilePicture
          ? objectStorageService.normalizeObjectEntityPath(r.profilePicture)
          : null,
      }));
      res.json(safeResidents);
    } catch (err) {
      console.error("Directory error:", err);
      res.status(500).json({ message: "Failed to load directory" });
    }
  });

  // -------- Directory: Get last updated timestamp --------
  app.get("/api/directory/updated", requireAuth, async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(
        sql`SELECT value FROM app_settings WHERE key = 'directory_updated_at'`
      );
      const rows = result as any;
      const value = rows?.rows?.[0]?.value || rows?.[0]?.value || null;
      res.json({ updatedAt: value });
    } catch {
      res.json({ updatedAt: null });
    }
  });

  // -------- Admin: Upload Excel directory --------
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post("/api/admin/directory/upload", requireAdmin, upload.single("file"), async (req: Request & { session: any }, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const ws = workbook.worksheets[0];
      if (!ws) {
        return res.status(400).json({ message: "No worksheet found in file" });
      }

      const rows: { lotNumber: string; name: string }[] = [];
      ws.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
        if (rowNumber === 1) return;
        const lotNumber = String(row.values[1] || "").trim();
        const name = String(row.values[2] || "").trim();
        if (lotNumber && name) {
          rows.push({ lotNumber, name });
        }
      });

      if (rows.length === 0) {
        return res.status(400).json({ message: "No resident data found in file" });
      }

      const existing = await db.select().from(users).where(eq(users.role, "resident"));
      const existingByLot = new Map<string, typeof existing[0]>();
      for (const r of existing) {
        if (r.lotNumber) existingByLot.set(r.lotNumber.toLowerCase(), r);
      }

      let inserted = 0;
      let skipped = 0;

      for (const row of rows) {
        const key = row.lotNumber.toLowerCase();
        if (existingByLot.has(key)) {
          const existingResident = existingByLot.get(key)!;
          if (existingResident.lastName !== row.name) {
            await db.update(users).set({ lastName: row.name }).where(eq(users.id, existingResident.id));
          }
          skipped++;
          continue;
        }

        await db.insert(users).values({
          role: "resident",
          lastName: row.name,
          lotNumber: row.lotNumber,
        } as any);
        inserted++;
      }

      await db.execute(
        sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('directory_updated_at', NOW()::text, NOW()) ON CONFLICT (key) DO UPDATE SET value = NOW()::text, updated_at = NOW()`
      );

      res.json({ message: `Directory updated: ${inserted} added, ${skipped} existing.`, inserted, skipped, total: rows.length });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Failed to process file" });
    }
  });
}
