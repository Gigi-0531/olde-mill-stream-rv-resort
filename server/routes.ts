import type { Express } from "express";
import type { Server } from "http";
import session from "express-session";
import connectRedis from "connect-redis";
import Redis from "ioredis";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import csrf from "csurf";

import { storage } from "./storage";
import { api } from "@shared/routes";
import {
  registerObjectStorageRoutes,
  ObjectStorageService,
} from "./replit_integrations/object_storage";
import { getVapidPublicKey, sendResortAlert } from "./pushService";
import { moderateText } from "./contentModeration";

// ----------------------
// SESSION TYPE EXTENSION
// ----------------------
declare module "express-session" {
  interface SessionData {
    userId?: number;
    userRole?: string;
    pendingProfiles?: number[];
  }
}

// ----------------------
// HELPERS
// ----------------------
function safeUser(user: any) {
  const { password, ...safe } = user;
  return safe;
}

const objectStorageService = new ObjectStorageService();

// ----------------------
// AUTH MIDDLEWARE
// ----------------------
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

async function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

// ----------------------
// RATE LIMITERS
// ----------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});

// ----------------------
// CSRF (SCOPED)
// ----------------------
const csrfProtection = csrf({ cookie: false });

// ----------------------
// MAIN
// ----------------------
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required");
  }

  // ----------------------
  // REDIS SESSION STORE
  // ----------------------
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

  redis.on("error", (err) => {
    console.error("Redis error:", err);
  });

  const RedisStore = connectRedis(session);

  app.use(
    session({
      name: "session",
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: new RedisStore({ client: redis }),
      cookie: {
        maxAge: 86400000,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

  // ----------------------
  // CSRF TOKEN ENDPOINT
  // ----------------------
  app.get("/api/csrf-token", csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // ----------------------
  // AUTH
  // ----------------------
  app.post(api.auth.login.path, loginLimiter, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      let user;

      // ADMIN LOGIN
      if (input.role === "admin") {
        user = await storage.getUserByUsername(input.username);
        if (!user || user.role !== "admin") {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(input.password, user.password!);
        if (!valid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
      } else {
        // RESIDENT LOGIN
        const residents = await storage.getUsersByLotAndName(
          input.lotNumber,
          input.lastName
        );

        if (!residents.length) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        if (residents.length === 1) {
          user = residents[0];
          req.session.regenerate((err) => {
            if (err) {
              console.error("Session regenerate failed:", err);
              return res.status(500).json({ message: "Login failed" });
            }
            req.session.userId = user.id;
            req.session.userRole = user.role;
            res.json(safeUser(user));
          });
          return;
        }

        req.session.pendingProfiles = residents.map((r) => r.id);
        return res.json({
          requiresProfileSelection: true,
          profiles: residents.map((r) => ({
            id: r.id,
            firstName: r.firstName || "Resident",
            profilePicture: r.profilePicture
              ? objectStorageService.normalizeObjectEntityPath(
                  r.profilePicture
                )
              : null,
          })),
        });
      }

      // SUCCESS
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regenerate failed:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        req.session.userId = user.id;
        req.session.userRole = user.role;
        res.json(safeUser(user));
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // ----------------------
  // PROFILE SELECTION
  // ----------------------
  app.post("/api/auth/select-profile", async (req, res) => {
    try {
      const profileId = Number(req.body.profileId);
      if (!profileId || Number.isNaN(profileId)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }

      if (!req.session.pendingProfiles?.includes(profileId)) {
        return res.status(401).json({ message: "Invalid profile selection" });
      }

      const user = await storage.getUser(profileId);
      if (!user) {
        return res.status(404).json({ message: "Profile not found" });
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regenerate failed:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        req.session.userId = user.id;
        req.session.userRole = user.role;
        delete req.session.pendingProfiles;
        res.json(safeUser(user));
      });
    } catch (err) {
      console.error("Profile selection error:", err);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // ----------------------
  // LOGOUT
  // ----------------------
  app.post(api.auth.logout.path, requireAuth, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // ----------------------
  // CURRENT USER
  // ----------------------
  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const safe = safeUser(user);
    if (safe.profilePicture) {
      safe.profilePicture =
        objectStorageService.normalizeObjectEntityPath(
          safe.profilePicture
        );
    }
    res.json(safe);
  });

  // ----------------------
  // MESSAGES
  // ----------------------
  app.get(api.messages.community.path, requireAuth, async (req, res) => {
    const isAdmin = req.session.userRole === "admin";
    res.json(await storage.getCommunityMessages(isAdmin));
  });

  app.post(
    api.messages.create.path,
    requireAuth,
    csrfProtection,
    messageLimiter,
    async (req, res) => {
      try {
        const input = api.messages.create.input.parse(req.body);
        const isAdmin = req.session.userRole === "admin";

        const moderation = await moderateText(input.content);
        if (!moderation.isAllowed) {
          return res.status(400).json({
            message: "Message blocked",
            reason: moderation.reason || "Content violates guidelines",
          });
        }

        const message = await storage.createMessage({
          senderId: req.session.userId,
          recipientId: input.recipientId || null,
          content: input.content,
          approved: isAdmin || input.recipientId !== null,
        });

        res.status(201).json(message);
      } catch (err) {
        console.error("Message create error:", err);
        res.status(400).json({ message: "Invalid input" });
      }
    }
  );

  // ----------------------
  // PUSH
  // ----------------------
  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.post(
    "/api/push/send-alert",
    requireAuth,
    requireAdmin,
    csrfProtection,
    async (req, res) => {
      try {
        const { title, body } = req.body;
        if (!title || !body) {
          return res.status(400).json({ message: "Title and body required" });
        }

        res.json({ sent: await sendResortAlert(title, body) });
      } catch (err) {
        console.error("Push send-alert error:", err);
        res.status(500).json({ message: "Failed to send notifications" });
      }
    }
  );

  // ----------------------
  // STORAGE
  // ----------------------
  registerObjectStorageRoutes(app);

  return httpServer;
}
