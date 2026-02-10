// backend/routes.ts
import express, { Request, Response, NextFunction, Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";

import { storage } from "./storage"; // your DB/storage methods
import { ObjectStorageService } from "./replit_integrations/object_storage";

const MemoryStore = createMemoryStore(session);
const objectStorageService = new ObjectStorageService();

// ------------------- Utilities -------------------
function sanitize(input: string) {
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

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // max attempts
  message: { message: "Too many login attempts, please try again later." },
});

// ------------------- Routes -------------------
export function registerRoutes(app: Express) {
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
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction || process.env.REPL_ID !== undefined,
      },
    })
  );

  // -------- Register User --------
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const username = sanitize(req.body.username);
      const password = sanitize(req.body.password);
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = await storage.createUser({ username, password: hashedPassword, role: "admin" });
      res.status(201).json(safeUser(user));
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // -------- Admin Login --------
  app.post("/api/login/admin", loginLimiter, async (req: Request & { session: any }, res: Response) => {
    try {
      const username = sanitize(req.body.username);
      const password = sanitize(req.body.password);

      const user = await storage.getUserByUsername(username);
      if (!user || user.role !== "admin") {
        return res.status(401).json({ message: "One tiny step away! Your admin powers are waiting—try again." });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: "One tiny step away! Your admin powers are waiting—try again." });
      }

      req.session.userId = user.id;
      res.json(safeUser(user));
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // -------- RV Resident Login --------
  app.post("/api/login/resident", loginLimiter, async (req: Request & { session: any }, res: Response) => {
    try {
      const lotNumber = sanitize(req.body.lotNumber);
      const lastName = sanitize(req.body.lastName);

      const residents = await storage.getUsersByLotAndName(lotNumber, lastName);

      if (residents.length === 0) {
        return res.status(401).json({ message: "One step from your lot! Your RV is waiting—try again." });
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
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // -------- Select profile if multiple --------
  app.post("/api/login/select-profile", async (req: Request & { session: any }, res: Response) => {
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
  app.post("/api/logout", requireAuth, (req: Request & { session: any }, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });
}
