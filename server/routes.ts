import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import createMemoryStore from "memorystore";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

const MemoryStore = createMemoryStore(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Session setup
  app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: 'keyboard cat'
  }));

  // Auth Routes
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { role, username, password, lotNumber, lastName } = api.auth.login.input.parse(req.body);
      
      let user;
      if (role === 'admin') {
        if (!username || !password) return res.status(400).json({ message: "Username and password required" });
        user = await storage.getUserByUsername(username);
        // Simple password check for prototype
        if (!user || user.password !== password) {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }
      } else {
        if (!lotNumber || !lastName) return res.status(400).json({ message: "Lot number and last name required" });
        user = await storage.getUserByLotAndName(lotNumber, lastName);
        if (!user) {
          return res.status(401).json({ message: "Resident not found" });
        }
      }

      (req.session as any).userId = user.id;
      res.json(user);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json(user);
  });

  // Activities
  app.get(api.activities.list.path, async (req, res) => {
    const activities = await storage.getActivities();
    res.json(activities);
  });

  app.post(api.activities.create.path, async (req, res) => {
    try {
      const input = api.activities.create.input.parse(req.body);
      const activity = await storage.createActivity(input);
      res.status(201).json(activity);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.activities.delete.path, async (req, res) => {
    await storage.deleteActivity(Number(req.params.id));
    res.status(204).send();
  });

  // Notifications
  app.get(api.notifications.list.path, async (req, res) => {
    const notifications = await storage.getActiveNotifications();
    res.json(notifications);
  });

  app.post(api.notifications.create.path, async (req, res) => {
    try {
      const input = api.notifications.create.input.parse(req.body);
      const notif = await storage.createNotification(input);
      res.status(201).json(notif);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.notifications.delete.path, async (req, res) => {
    await storage.deleteNotification(Number(req.params.id));
    res.status(204).send();
  });

  // Users / Directory
  app.get(api.users.list.path, async (req, res) => {
    const query = req.query.search as string | undefined;
    const users = await storage.searchUsers(query);
    res.json(users);
  });

  // Weather (Mock)
  app.get(api.weather.get.path, (req, res) => {
    res.json({
      location: "Umatilla, FL",
      temp: 78,
      condition: "Sunny",
      forecast: [
        { day: "Today", temp: 78, condition: "Sunny" },
        { day: "Tomorrow", temp: 76, condition: "Partly Cloudy" },
        { day: "Wed", temp: 80, condition: "Clear" },
      ]
    });
  });

  // Gallery
  app.get(api.gallery.list.path, async (req, res) => {
    const photos = await storage.getGalleryPhotos();
    res.json(photos);
  });

  app.post(api.gallery.create.path, async (req, res) => {
    try {
      const input = api.gallery.create.input.parse(req.body);
      const photo = await storage.createGalleryPhoto(input);
      res.status(201).json(photo);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.gallery.delete.path, async (req, res) => {
    await storage.deleteGalleryPhoto(Number(req.params.id));
    res.status(204).send();
  });

  // Register Object Storage routes
  registerObjectStorageRoutes(app);

  // Seed Data
  if ((await storage.searchUsers()).length === 0) {
    console.log("Seeding database...");
    await storage.createUser({
      role: 'admin',
      username: 'omsmanagement86@gmail.com',
      password: 'admin!',
      firstName: 'Admin',
      lastName: 'User'
    });
    
    await storage.createUser({
      role: 'resident',
      lotNumber: 'A1',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '555-0101'
    });

    await storage.createUser({
      role: 'resident',
      lotNumber: 'B12',
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: '555-0102'
    });

    await storage.createActivity({
      title: 'Potluck Dinner',
      description: 'Bring a dish to share!',
      date: new Date('2025-06-15T18:00:00'),
      location: 'Community Hall'
    });

    await storage.createNotification({
      content: 'Water shutoff maintenance on Tuesday 10am-12pm',
      active: true
    });
  }

  return httpServer;
}
