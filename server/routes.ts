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
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please log in" });
  }
  next();
}

async function requireAdmin(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please log in" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
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
  const isProduction = process.env.NODE_ENV === "production";
  
  app.use(session({
    name: "oms.sid",
    secret: process.env.SESSION_SECRET!,
    resave: true,
    saveUninitialized: true,
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    cookie: {
      maxAge: 86400000,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction || process.env.REPL_ID !== undefined,
    },
  }));

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);

      let user;

      if (input.role === "admin") {
        user = await storage.getUserByUsername(input.username);
        if (!user || user.role !== 'admin') {
          return res.status(401).json({ message: "Invalid email or password" });
        }
        const validPassword = await bcrypt.compare(input.password || '', user.password || '');
        if (!validPassword) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
      } else {
        const residents = await storage.getUsersByLotAndName(input.lotNumber, input.lastName);

        if (residents.length === 0) {
          return res.status(401).json({ message: "No resident found with that lot number and last name" });
        } else if (residents.length === 1) {
          user = residents[0];
        } else {
          // Multiple profiles - let user select
          return res.json({
            requiresProfileSelection: true,
            profiles: residents.map(r => ({
              id: r.id,
              firstName: r.firstName || "Resident",
              profilePicture: r.profilePicture ? objectStorageService.normalizeObjectEntityPath(r.profilePicture) : null
            }))
          });
        }
      }

      // Set session and return user
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
      console.log("Profile selected, Session ID:", req.sessionID);
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

  app.get(api.weather.get.path, async (_req, res) => {
    try {
      const apiKey = process.env.OPENWEATHERMAP_API_KEY;
      if (!apiKey) {
        return res.json({
          location: "Umatilla, FL",
          temp: 78,
          condition: "Sunny",
          forecast: [
            { day: "Today", temp: 78, condition: "Sunny" },
            { day: "Tomorrow", temp: 76, condition: "Partly Cloudy" },
            { day: "Wed", temp: 80, condition: "Clear" },
          ],
        });
      }

      // Umatilla, FL coordinates
      const lat = 28.9295;
      const lon = -81.6656;
      
      // Fetch current weather and forecast in parallel
      const [currentRes, forecastRes] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial&cnt=24`)
      ]);

      if (!currentRes.ok || !forecastRes.ok) {
        const errorData = await currentRes.text();
        console.error("Weather API response:", currentRes.status, errorData);
        throw new Error(`Weather API error: ${currentRes.status}`);
      }

      const current = await currentRes.json();
      const forecastData = await forecastRes.json();

      // Get condition from weather description
      const getCondition = (weather: any[]) => {
        if (!weather || weather.length === 0) return "Clear";
        const main = weather[0].main.toLowerCase();
        const desc = weather[0].description.toLowerCase();
        if (main.includes("rain") || desc.includes("rain")) return "Rain";
        if (main.includes("cloud") || desc.includes("cloud")) return "Cloudy";
        if (main.includes("clear") || desc.includes("clear")) return "Sunny";
        if (main.includes("storm") || desc.includes("storm")) return "Stormy";
        return weather[0].main;
      };

      // Build 3-day forecast from hourly data
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const today = new Date();
      const forecast = [];
      
      // Today
      forecast.push({
        day: "Today",
        temp: Math.round(current.main.temp),
        condition: getCondition(current.weather)
      });

      // Next 2 days - get noon forecast for each day
      for (let i = 1; i <= 2; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dayName = days[targetDate.getDay()];
        
        // Find forecast closest to noon for that day
        const dayForecast = forecastData.list.find((item: any) => {
          const itemDate = new Date(item.dt * 1000);
          return itemDate.getDate() === targetDate.getDate() && itemDate.getHours() >= 11;
        });

        if (dayForecast) {
          forecast.push({
            day: dayName,
            temp: Math.round(dayForecast.main.temp),
            condition: getCondition(dayForecast.weather)
          });
        }
      }

      res.json({
        location: "Umatilla, FL",
        temp: Math.round(current.main.temp),
        condition: getCondition(current.weather),
        humidity: current.main.humidity,
        windSpeed: Math.round(current.wind?.speed || 0),
        forecast,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Weather fetch error:", error);
      // Return fallback static data on error
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
    }
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

      // Get the submitter's name
      const user = await storage.getUser(req.session.userId);
      let submitterName = "Unknown";
      if (user) {
        if (user.role === "admin") {
          submitterName = user.email || "Admin";
        } else {
          submitterName = `Lot ${user.lotNumber}${user.firstName ? ` - ${user.firstName}` : ""}`;
        }
      }

      const photo = await storage.createGalleryPhoto({
        title: input.title,
        objectPath: normalizedPath,
        status: "pending",
        submitterId: req.session.userId,
        submitterName,
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
    const msgs = await storage.getCommunityMessages(false);
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
      
      const isDirect = input.recipientId !== null && input.recipientId !== undefined;
      
      let autoApprove = isDirect;
      if (!isDirect) {
        const sender = await storage.getUser(req.session.userId);
        autoApprove = sender?.role === 'admin';
        console.log(`[Messages] Community post by user ${req.session.userId} (role: ${sender?.role}), autoApprove: ${autoApprove}`);
      }
      
      const message = await storage.createMessage({
        senderId: req.session.userId,
        recipientId: input.recipientId || null,
        content: input.content,
        approved: autoApprove,
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
    try {
      const messageId = Number(req.params.id);
      console.log(`[MessageModeration] Approving message id=${messageId} by admin userId=${req.session.userId}`);
      await storage.approveMessage(messageId);
      console.log(`[MessageModeration] Message id=${messageId} approved successfully`);
      res.json({ success: true });
    } catch (error) {
      console.error(`[MessageModeration] Failed to approve message id=${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to approve message" });
    }
  });

  app.delete("/api/messages/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const messageId = Number(req.params.id);
      console.log(`[MessageModeration] Deleting message id=${messageId} by admin userId=${req.session.userId}`);
      await storage.deleteMessage(messageId);
      console.log(`[MessageModeration] Message id=${messageId} deleted successfully`);
      res.status(204).send();
    } catch (error) {
      console.error(`[MessageModeration] Failed to delete message id=${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete message" });
    }
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
