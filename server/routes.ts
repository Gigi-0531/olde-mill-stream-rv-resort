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
import { users, insertActivitySchema } from "@shared/schema";
import { eq, ilike, sql, and, isNull } from "drizzle-orm";
import { ObjectStorageService } from "./replit_integrations/object_storage";
import { moderateText, moderateImage } from "./contentModeration";
import { getVapidPublicKey, sendResortAlert } from "./pushService";

const MemoryStore = createMemoryStore(session);
const objectStorageService = new ObjectStorageService();

// ------------------- Utilities -------------------
function sanitizeAlphanumeric(input: string) {
  return input.replace(/[^a-zA-Z0-9]/g, "");
}

function isValidObjectPath(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  return (
    value.startsWith("/objects/") ||
    value.startsWith("https://storage.googleapis.com/")
  );
}

function generatePin(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
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

// ------------------- Startup: backfill PINs for residents missing one -------------------
async function backfillResidentPins() {
  try {
    const rows = await db.select({ id: users.id }).from(users).where(
      and(eq(users.role, "resident"), isNull(users.pin))
    );
    for (const row of rows) {
      await db.update(users).set({ pin: generatePin() }).where(eq(users.id, row.id));
    }
    if (rows.length > 0) {
      console.log(`[startup] Assigned PINs to ${rows.length} resident(s) who had none.`);
    }
  } catch (err) {
    console.error("[startup] PIN backfill failed:", err);
  }
}

// ------------------- Routes -------------------
export function registerRoutes(_server: any, app: Express) {
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required");

  backfillResidentPins();

  const isProduction = process.env.NODE_ENV === "production";

  app.set("trust proxy", 1);

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
        secure: isProduction,
      },
    })
  );

  // -------- Register User (bootstrap only — allowed only when no admin accounts exist) --------
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const existingAdmin = await storage.getFirstAdmin();
      if (existingAdmin) {
        return res.status(403).json({ message: "Registration is not available." });
      }

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

        let match = false;
        const isHashed = user.password.startsWith("$2b$") || user.password.startsWith("$2a$");
        if (isHashed) {
          match = await bcrypt.compare(password, user.password);
        } else {
          match = (password === user.password);
          if (match) {
            const hashed = await bcrypt.hash(password, 10);
            await db.update(users).set({ password: hashed }).where(eq(users.id, user.id));
          }
        }

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

        const candidates = await storage.getUsersByLotAndName(lotNumber, lastName);

        if (candidates.length === 0) {
          return res.status(401).json({ message: "No resident found with that lot number and last name. Please check your info and try again." });
        }

        const matching = candidates;

        if (matching.length === 1) {
          const user = matching[0];
          req.session.userId = user.id;
          return res.json(safeUser(user));
        } else {
          req.session.pendingProfiles = matching.map(r => r.id);
          return res.json({
            requiresProfileSelection: true,
            profiles: matching.map(r => ({
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
      res.setHeader("Cache-Control", "no-store");
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

        const newPin = generatePin();
        await db.insert(users).values({
          role: "resident",
          lastName: row.name,
          lotNumber: row.lotNumber,
          pin: newPin,
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

  // -------- Activities CRUD --------
  app.get("/api/activities", async (_req: Request, res: Response) => {
    try {
      const acts = await storage.getActivities();
      res.json(acts);
    } catch (err) {
      console.error("Activities error:", err);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(parsed);
      res.status(201).json(activity);
    } catch (err) {
      console.error("Create activity error:", err);
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.delete("/api/activities/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteActivity(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ message: "Activity not found" });
    }
  });

  // -------- Notifications CRUD --------
  app.get("/api/notifications", async (_req: Request, res: Response) => {
    try {
      const notifs = await storage.getNotifications();
      res.json(notifs);
    } catch (err) {
      console.error("Notifications error:", err);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", requireAdmin, async (req: Request, res: Response) => {
    try {
      const notification = await storage.createNotification(req.body);
      try {
        await sendResortAlert("Resort Alert", notification.content);
      } catch {}
      res.status(201).json(notification);
    } catch (err) {
      console.error("Create notification error:", err);
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.delete("/api/notifications/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteNotification(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ message: "Notification not found" });
    }
  });

  // -------- Gallery CRUD --------
  app.get("/api/gallery", async (_req: Request, res: Response) => {
    try {
      const photos = await storage.getGalleryPhotos(true);
      const normalized = photos.map(p => ({
        ...p,
        objectPath: objectStorageService.normalizeObjectEntityPath(p.objectPath),
      }));
      res.json(normalized);
    } catch (err) {
      console.error("Gallery error:", err);
      res.status(500).json({ message: "Failed to fetch gallery" });
    }
  });

  app.get("/api/gallery/pending", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const photos = await storage.getPendingGalleryPhotos();
      const normalized = photos.map(p => ({
        ...p,
        objectPath: objectStorageService.normalizeObjectEntityPath(p.objectPath),
      }));
      res.json(normalized);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch pending photos" });
    }
  });

  app.post("/api/gallery", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!isValidObjectPath(req.body.objectPath)) {
        return res.status(400).json({ message: "Invalid image path" });
      }
      const photo = await storage.createGalleryPhoto({
        ...req.body,
        status: "approved",
      });
      res.status(201).json(photo);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/gallery/submit", requireAuth, async (req: Request & { session: any }, res: Response) => {
    try {
      if (!isValidObjectPath(req.body.objectPath)) {
        return res.status(400).json({ message: "Invalid image path" });
      }
      const user = await storage.getUser(req.session.userId);
      const photo = await storage.createGalleryPhoto({
        ...req.body,
        status: "pending",
        submitterId: req.session.userId,
        submitterName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "Unknown",
      });
      res.status(201).json(photo);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/gallery/:id/approve", requireAdmin, async (req: Request, res: Response) => {
    try {
      const photo = await storage.updateGalleryPhotoStatus(Number(req.params.id), "approved");
      if (!photo) return res.status(404).json({ message: "Photo not found" });
      res.json(photo);
    } catch (err) {
      res.status(500).json({ message: "Failed to approve photo" });
    }
  });

  app.post("/api/gallery/:id/reject", requireAdmin, async (req: Request, res: Response) => {
    try {
      const photo = await storage.updateGalleryPhotoStatus(Number(req.params.id), "rejected");
      if (!photo) return res.status(404).json({ message: "Photo not found" });
      res.json(photo);
    } catch (err) {
      res.status(500).json({ message: "Failed to reject photo" });
    }
  });

  app.delete("/api/gallery/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteGalleryPhoto(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ message: "Photo not found" });
    }
  });

  // -------- Messages --------
  app.get("/api/messages/community", requireAuth, async (req: Request & { session: any }, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId);
      const includeUnapproved = user?.role === "admin";
      const msgs = await storage.getCommunityMessages(includeUnapproved);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/pending", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const msgs = await storage.getPendingMessages();
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch pending messages" });
    }
  });

  app.post("/api/messages", requireAuth, async (req: Request & { session: any }, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const content = String(req.body.content || "").trim();
      if (!content) return res.status(400).json({ message: "Message content is required" });

      const moderation = await moderateText(content);
      if (!moderation.isAllowed) {
        return res.status(400).json({ message: moderation.reason || "Message violates community guidelines", reason: moderation.reason });
      }

      const isAdmin = user.role === "admin";
      const msg = await storage.createMessage({
        senderId: user.id,
        recipientId: req.body.recipientId || null,
        content,
        approved: isAdmin,
      });
      res.status(201).json(msg);
    } catch (err) {
      console.error("Message error:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:id/approve", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.approveMessage(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to approve message" });
    }
  });

  app.delete("/api/messages/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteMessage(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ message: "Message not found" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.markMessageRead(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  // -------- Users / Residents --------
  app.get("/api/users", requireAuth, async (_req: Request, res: Response) => {
    try {
      const allUsers = await storage.searchUsers();
      const safe = allUsers.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        lotNumber: u.lotNumber,
        profilePicture: u.profilePicture
          ? objectStorageService.normalizeObjectEntityPath(u.profilePicture)
          : null,
        role: u.role,
      }));
      res.json(safe);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/residents", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const residents = await storage.getResidents();
      res.json(residents);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch residents" });
    }
  });

  app.post("/api/residents", requireAdmin, async (req: Request, res: Response) => {
    try {
      const pin = generatePin();
      const resident = await storage.createUser({
        role: "resident",
        lotNumber: req.body.lotNumber,
        lastName: req.body.lastName,
        firstName: req.body.firstName,
        phoneNumber: req.body.phoneNumber,
        pin,
      });
      res.status(201).json({ ...resident, pin });
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/residents/:id/reset-pin", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const pin = generatePin();
      const updated = await storage.updateResident(id, { pin });
      if (!updated) return res.status(404).json({ message: "Resident not found" });
      res.json({ pin });
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.patch("/api/residents/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateResident(Number(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Resident not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.delete("/api/residents/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteResident(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ message: "Resident not found" });
    }
  });

  app.delete("/api/residents", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const count = await storage.deleteAllResidents();
      res.json({ message: `Deleted ${count} residents`, count });
    } catch (err) {
      console.error("Delete all residents error:", err);
      res.status(500).json({ message: "Failed to delete residents" });
    }
  });

  // -------- Weather --------
  app.get("/api/weather", async (_req: Request, res: Response) => {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        return res.json({
          temp: 75,
          condition: "Sunny",
          location: "Umatilla, FL",
          forecast: [
            { day: "Tomorrow", temp: 77, condition: "Partly Cloudy" },
            { day: "Wed", temp: 80, condition: "Sunny" },
            { day: "Thu", temp: 73, condition: "Rain" },
          ],
        });
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=Umatilla,FL,US&units=imperial&appid=${apiKey}`
      );
      const data = await response.json();

      if (!data.list) {
        throw new Error("Invalid weather data");
      }

      const current = data.list[0];
      const forecastDays = data.list
        .filter((_: any, i: number) => i % 8 === 0)
        .slice(1, 4)
        .map((item: any) => ({
          day: new Date(item.dt * 1000).toLocaleDateString("en-US", { weekday: "short" }),
          temp: Math.round(item.main.temp),
          condition: item.weather[0].main,
        }));

      res.json({
        temp: Math.round(current.main.temp),
        condition: current.weather[0].main,
        location: "Umatilla, FL",
        forecast: forecastDays,
      });
    } catch (err) {
      console.error("Weather error:", err);
      res.json({
        temp: 75,
        condition: "Sunny",
        location: "Umatilla, FL",
        forecast: [
          { day: "Tomorrow", temp: 77, condition: "Partly Cloudy" },
          { day: "Wed", temp: 80, condition: "Sunny" },
          { day: "Thu", temp: 73, condition: "Rain" },
        ],
      });
    }
  });

  // -------- Push Notifications --------
  app.get("/api/push/vapid-key", (_req: Request, res: Response) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.get("/api/push/subscription", requireAuth, async (req: Request & { session: any }, res: Response) => {
    try {
      const sub = await storage.getPushSubscription(req.session.userId);
      res.json(sub || null);
    } catch (err) {
      res.status(500).json({ message: "Failed to get subscription" });
    }
  });

  app.post("/api/push/subscribe", requireAuth, async (req: Request & { session: any }, res: Response) => {
    try {
      const sub = await storage.savePushSubscription({
        userId: req.session.userId,
        endpoint: req.body.endpoint,
        p256dh: req.body.keys.p256dh,
        auth: req.body.keys.auth,
        weatherEnabled: req.body.weatherEnabled ?? true,
        alertsEnabled: req.body.alertsEnabled ?? true,
      });
      res.status(201).json(sub);
    } catch (err) {
      res.status(400).json({ message: "Failed to subscribe" });
    }
  });

  app.patch("/api/push/preferences", requireAuth, async (req: Request & { session: any }, res: Response) => {
    try {
      await storage.updatePushPreferences(
        req.session.userId,
        req.body.weatherEnabled,
        req.body.alertsEnabled
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  app.delete("/api/push/unsubscribe", requireAuth, async (req: Request & { session: any }, res: Response) => {
    try {
      await storage.deletePushSubscription(req.session.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // -------- Help / Contact --------
  app.post("/api/help", requireAuth, async (req: Request & { session: any }, res: Response) => {
    try {
      const content = String(req.body.content || "").trim();
      if (!content) return res.status(400).json({ message: "Message is required" });

      const admin = await storage.getFirstAdmin();
      if (!admin) return res.status(500).json({ message: "No admin found" });

      const msg = await storage.createMessage({
        senderId: req.session.userId,
        recipientId: admin.id,
        content,
        approved: true,
      });
      res.status(201).json(msg);
    } catch (err) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // -------- Content Moderation --------
  app.post("/api/moderate/image", requireAuth, async (req: Request, res: Response) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) return res.status(400).json({ message: "Image data required" });
      const result = await moderateImage(image, mimeType || "image/jpeg");
      res.json(result);
    } catch (err) {
      res.json({ isAllowed: true });
    }
  });

  // -------- Profile Picture --------
  app.patch("/api/profile/picture", requireAuth, async (req: Request & { session: any }, res: Response) => {
    try {
      const { objectPath } = req.body;
      if (!isValidObjectPath(objectPath)) {
        return res.status(400).json({ message: "Invalid image path" });
      }

      await storage.updateProfilePicture(req.session.userId, objectPath);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update profile picture" });
    }
  });
}
