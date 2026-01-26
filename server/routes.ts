import type { Express } from "express";
import type { Server } from "http";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";

import { storage } from "./storage";
import { api } from "@shared/routes";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { getVapidPublicKey, sendResortAlert } from "./pushService";
import { moderateText, moderateImage } from "./contentModeration";
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
        const residents = await storage.getUsersByLotAndName(
          input.lotNumber,
          input.lastName
        );

        if (!residents.length) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        if (residents.length === 1) {
          user = residents[0];
          req.session.userId = user.id;
          return res.json(safeUser(user));
        }

        req.session.pendingProfiles = residents.map(r => r.id);
        return res.json({
          requiresProfileSelection: true,
          profiles: residents.map(r => ({
            id: r.id,
            firstName: r.firstName || "Resident",
            profilePicture: r.profilePicture ? objectStorageService.normalizeObjectEntityPath(r.profilePicture) : null
          }))
        });
      }

      req.session.userId = user.id;
      res.json(safeUser(user));


    } catch (err) {
      console.error("Login error:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/auth/select-profile", async (req, res) => {
    try {
      const profileId = Number(req.body.profileId);
      if (isNaN(profileId)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }
      
      const pendingProfiles = req.session.pendingProfiles;

      if (!pendingProfiles || !pendingProfiles.includes(profileId)) {
        return res.status(401).json({ message: "Invalid profile selection" });
      }

      const user = await storage.getUser(profileId);
      if (!user) {
        return res.status(401).json({ message: "Profile not found" });
      }

      req.session.userId = user.id;
      delete req.session.pendingProfiles;
      res.json(safeUser(user));
    } catch (err) {
      console.error("Profile selection error:", err);
      res.status(400).json({ message: "Invalid request" });
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
    const safe = safeUser(user);
    if (safe.profilePicture) {
      safe.profilePicture = objectStorageService.normalizeObjectEntityPath(safe.profilePicture);
    }
    res.json(safe);
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
        console.log("Activity create attempt:", JSON.stringify(req.body));
        const input = api.activities.create.input.parse(req.body);
        const activity = await storage.createActivity(input);
        res.status(201).json(activity);
      } catch (err) {
        console.error("Activity create error:", err);
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

  // Public users list (for messaging - limited fields)
  app.get(api.users.list.path, requireAuth, async (_req, res) => {
    const residents = await storage.getResidents();
    res.json(residents.map(r => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      lotNumber: r.lotNumber,
      profilePicture: r.profilePicture ? objectStorageService.normalizeObjectEntityPath(r.profilePicture) : null,
      role: r.role,
    })));
  });

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
    const photos = await storage.getGalleryPhotos(true);
    res.json(
      photos.map(photo => ({
        ...photo,
        objectPath: objectStorageService.normalizeObjectEntityPath(photo.objectPath),
      }))
    );
  });

  app.get(api.gallery.pending.path, requireAuth, requireAdmin, async (_req, res) => {
    const photos = await storage.getPendingGalleryPhotos();
    res.json(
      photos.map(photo => ({
        ...photo,
        objectPath: objectStorageService.normalizeObjectEntityPath(photo.objectPath),
      }))
    );
  });

  app.post(api.gallery.submit.path, requireAuth, async (req, res) => {
    try {
      const input = api.gallery.submit.input.parse(req.body);
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(input.objectPath);

      const photo = await storage.createGalleryPhoto({
        title: input.title,
        objectPath: normalizedPath,
        status: "pending",
        submitterId: req.session.userId,
      });

      res.status(201).json(photo);
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
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
          status: "approved",
        });

        res.status(201).json(photo);
      } catch {
        res.status(400).json({ message: "Invalid input" });
      }
    }
  );

  app.post(api.gallery.approve.path, requireAuth, requireAdmin, async (req, res) => {
    const photo = await storage.updateGalleryPhotoStatus(Number(req.params.id), "approved");
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }
    res.json(photo);
  });

  app.post(api.gallery.reject.path, requireAuth, requireAdmin, async (req, res) => {
    const photo = await storage.updateGalleryPhotoStatus(Number(req.params.id), "rejected");
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }
    res.json(photo);
  });

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
  app.get(api.messages.community.path, requireAuth, async (req, res) => {
    const isAdmin = req.session.userRole === 'admin';
    const msgs = await storage.getCommunityMessages(isAdmin);
    res.json(msgs);
  });

  app.get("/api/messages/pending", requireAuth, requireAdmin, async (_req, res) => {
    const msgs = await storage.getPendingMessages();
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
      const isAdmin = req.session.userRole === 'admin';
      
      // Content moderation for messages
      const moderation = await moderateText(input.content);
      if (!moderation.isAllowed) {
        return res.status(400).json({ 
          message: "Message blocked", 
          reason: moderation.reason || "Content violates community guidelines" 
        });
      }
      
      const message = await storage.createMessage({
        senderId: req.session.userId,
        recipientId: input.recipientId || null,
        content: input.content,
        approved: isAdmin || input.recipientId !== null,
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

  app.patch("/api/messages/:id/approve", requireAuth, requireAdmin, async (req, res) => {
    await storage.approveMessage(Number(req.params.id));
    res.json({ success: true });
  });

  app.delete("/api/messages/:id", requireAuth, requireAdmin, async (req, res) => {
    await storage.deleteMessage(Number(req.params.id));
    res.status(204).send();
  });

  // Help endpoint - sends message directly to admin
  app.post("/api/help", requireAuth, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Content moderation
      const moderation = await moderateText(content);
      if (!moderation.isAllowed) {
        return res.status(400).json({ 
          message: "Message blocked", 
          reason: moderation.reason || "Content violates community guidelines" 
        });
      }

      // Find first admin user (for help messages)
      const admin = await storage.getFirstAdmin();
      if (!admin) {
        return res.status(500).json({ message: "Unable to send message. Please try again later." });
      }

      const message = await storage.createMessage({
        senderId: req.session.userId,
        recipientId: admin.id,
        content: content.trim(),
        approved: true,
      });
      res.status(201).json(message);
    } catch {
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  // Push Notifications
  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.get("/api/push/subscription", requireAuth, async (req, res) => {
    const subscription = await storage.getPushSubscription(req.session.userId);
    res.json(subscription || null);
  });

  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const { endpoint, keys, weatherEnabled = true, alertsEnabled = true } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      const subscription = await storage.savePushSubscription({
        userId: req.session.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        weatherEnabled,
        alertsEnabled,
      });

      res.status(201).json(subscription);
    } catch (error) {
      console.error("Push subscribe error:", error);
      res.status(500).json({ message: "Failed to save subscription" });
    }
  });

  app.patch("/api/push/preferences", requireAuth, async (req, res) => {
    try {
      const { weatherEnabled, alertsEnabled } = req.body;
      await storage.updatePushPreferences(
        req.session.userId,
        weatherEnabled ?? true,
        alertsEnabled ?? true
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  app.delete("/api/push/unsubscribe", requireAuth, async (req, res) => {
    await storage.deletePushSubscription(req.session.userId);
    res.status(204).send();
  });

  // Admin: Send push notification to all subscribers
  app.post("/api/push/send-alert", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { title, body } = req.body;
      if (!title || !body) {
        return res.status(400).json({ message: "Title and body required" });
      }
      const count = await sendResortAlert(title, body);
      res.json({ sent: count });
    } catch (error) {
      res.status(500).json({ message: "Failed to send notifications" });
    }
  });

  // Profile picture update
  app.patch("/api/profile/picture", requireAuth, async (req, res) => {
    try {
      const { objectPath, imageData, mimeType } = req.body;
      if (!objectPath) {
        return res.status(400).json({ message: "Object path required" });
      }
      
      // Server-side image moderation if image data provided
      if (imageData) {
        const moderation = await moderateImage(imageData, mimeType || "image/jpeg");
        if (!moderation.isAllowed) {
          return res.status(400).json({ 
            message: "Image not allowed", 
            reason: moderation.reason || "Image violates community guidelines" 
          });
        }
      }
      
      // Store raw path, normalize only when returning
      await storage.updateProfilePicture(req.session.userId, objectPath);
      
      res.json({ success: true, profilePicture: objectStorageService.normalizeObjectEntityPath(objectPath) });
    } catch (error) {
      console.error("Profile picture update error:", error);
      res.status(500).json({ message: "Failed to update profile picture" });
    }
  });

  // Moderate image before upload
  app.post("/api/moderate/image", requireAuth, async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ message: "Image data required" });
      }
      
      const moderation = await moderateImage(image);
      res.json(moderation);
    } catch (error) {
      console.error("Image moderation error:", error);
      res.status(500).json({ message: "Failed to moderate image" });
    }
  });

  registerObjectStorageRoutes(app);

  return httpServer;
}
