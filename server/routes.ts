import type { Express } from "express";
import type { Server } from "http";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";

import { storage } from "./storage";
import { api } from "@shared/routes";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
function safeUser(user: any) {
  const { password, ...safe } = user;
  return safe;
}

const MemoryStore = createMemoryStore(session);
const objectStorageService = new ObjectStorageService();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

async function requireAdmin(req: any, res: any, next: any) {
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required");
  }
  app.use(session({
    name: "session",
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    cookie: {
      maxAge: 86400000,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  }));

  app.post(api.auth.login.path, loginLimiter, async (req, res) => {
    try {
      console.log("Login attempt:", JSON.stringify(req.body));
      const input = api.auth.login.input.parse(req.body);

      let user;

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
        user = await storage.getUserByLotAndName(
          input.lotNumber,
          input.lastName
        );

        if (!user || user.role !== "resident") {
          return res.status(401).json({ message: "Invalid credentials" });
        }
      }

      req.session.userId = user.id;
      res.json(safeUser(user));


    } catch (err) {
      console.error("Login error:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.auth.logout.path, requireAuth, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(safeUser(user));
  });

  app.get(api.activities.list.path, async (_req, res) => {
    res.json(await storage.getActivities());
  });

  app.post(
    api.activities.create.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const input = api.activities.create.input.parse(req.body);
        const activity = await storage.createActivity(input);
        res.status(201).json(activity);
      } catch {
        res.status(400).json({ message: "Invalid input" });
      }
    }
  );

  app.delete(
    api.activities.delete.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      await storage.deleteActivity(Number(req.params.id));
      res.status(204).send();
    }
  );

  app.get(api.notifications.list.path, async (_req, res) => {
    res.json(await storage.getActiveNotifications());
  });

  app.post(
    api.notifications.create.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const input = api.notifications.create.input.parse(req.body);
        const notif = await storage.createNotification(input);
        res.status(201).json(notif);
      } catch {
        res.status(400).json({ message: "Invalid input" });
      }
    }
  );

  app.delete(
    api.notifications.delete.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      await storage.deleteNotification(Number(req.params.id));
      res.status(204).send();
    }
  );

  // Residents management (admin only)
  app.get(api.residents.list.path, requireAuth, requireAdmin, async (_req, res) => {
    const residents = await storage.getResidents();
    res.json(residents.map(safeUser));
  });

  app.post(api.residents.create.path, requireAuth, requireAdmin, async (req, res) => {
    try {
      const input = api.residents.create.input.parse(req.body);
      const resident = await storage.createUser({
        role: 'resident',
        lotNumber: input.lotNumber,
        lastName: input.lastName,
        firstName: input.firstName,
        phoneNumber: input.phoneNumber,
      });
      res.status(201).json(safeUser(resident));
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.patch(api.residents.update.path, requireAuth, requireAdmin, async (req, res) => {
    try {
      const input = api.residents.update.input.parse(req.body);
      const resident = await storage.updateResident(Number(req.params.id), input);
      if (!resident) {
        return res.status(404).json({ message: "Resident not found" });
      }
      res.json(safeUser(resident));
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.residents.delete.path, requireAuth, requireAdmin, async (req, res) => {
    await storage.deleteResident(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.weather.get.path, (_req, res) => {
    res.json({
      location: "Umatilla, FL",
      temp: 78,
      condition: "Sunny",
      forecast: [
        { day: "Today", temp: 78, condition: "Sunny" },
        { day: "Tomorrow", temp: 76, condition: "Partly Cloudy" },
        { day: "Wed", temp: 80, condition: "Clear" },
      ],
    });
  });

  app.get(api.gallery.list.path, async (_req, res) => {
    const photos = await storage.getGalleryPhotos();
    res.json(
      photos.map(photo => ({
        ...photo,
        objectPath: objectStorageService.normalizeObjectEntityPath(photo.objectPath),
      }))
    );
  });

  app.post(
    api.gallery.create.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const input = api.gallery.create.input.parse(req.body);
        const normalizedPath =
          objectStorageService.normalizeObjectEntityPath(input.objectPath);

        const photo = await storage.createGalleryPhoto({
          ...input,
          objectPath: normalizedPath,
        });

        res.status(201).json(photo);
      } catch {
        res.status(400).json({ message: "Invalid input" });
      }
    }
  );

  app.delete(
    api.gallery.delete.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      await storage.deleteGalleryPhoto(Number(req.params.id));
      res.status(204).send();
    }
  );

  // Messages
  app.get(api.messages.community.path, requireAuth, async (_req, res) => {
    const msgs = await storage.getCommunityMessages();
    res.json(msgs);
  });

  app.get(api.messages.direct.path, requireAuth, async (req, res) => {
    const msgs = await storage.getDirectMessages(req.session.userId);
    res.json(msgs);
  });

  app.get(api.messages.conversation.path, requireAuth, async (req, res) => {
    const msgs = await storage.getConversation(
      req.session.userId,
      Number(req.params.userId)
    );
    res.json(msgs);
  });

  app.post(api.messages.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.messages.create.input.parse(req.body);
      const message = await storage.createMessage({
        senderId: req.session.userId,
        recipientId: input.recipientId || null,
        content: input.content,
      });
      res.status(201).json(message);
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.patch(api.messages.markRead.path, requireAuth, async (req, res) => {
    await storage.markMessageRead(Number(req.params.id));
    res.json({ success: true });
  });

  registerObjectStorageRoutes(app);

  return httpServer;
}
