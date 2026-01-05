import { db } from "./db";
import {
  users, activities, notifications, galleryPhotos,
  type User, type InsertUser,
  type Activity, type InsertActivity,
  type Notification, type InsertNotification,
  type GalleryPhoto, type InsertGalleryPhoto
} from "@shared/schema";
import { eq, ilike, or, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByLotAndName(lotNumber: string, lastName: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  searchUsers(query?: string): Promise<User[]>;

  // Activities
  getActivities(): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  deleteActivity(id: number): Promise<void>;

  // Notifications
  getNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  getActiveNotifications(): Promise<Notification[]>;

  // Gallery
  getGalleryPhotos(): Promise<GalleryPhoto[]>;
  createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto>;
  deleteGalleryPhoto(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByLotAndName(lotNumber: string, lastName: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.lotNumber, lotNumber),
        ilike(users.lastName, lastName)
      )
    );
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async searchUsers(query?: string): Promise<User[]> {
    if (!query) {
      return db.select().from(users).where(eq(users.role, 'resident'));
    }
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    return db.select().from(users).where(
      and(
        eq(users.role, 'resident'),
        or(
          ilike(users.firstName, lowercaseQuery),
          ilike(users.lastName, lowercaseQuery),
          ilike(users.lotNumber, lowercaseQuery)
        )
      )
    );
  }

  async getActivities(): Promise<Activity[]> {
    return db.select().from(activities).orderBy(activities.date);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async deleteActivity(id: number): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  async getNotifications(): Promise<Notification[]> {
    return db.select().from(notifications).orderBy(notifications.createdAt);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotif] = await db.insert(notifications).values(notification).returning();
    return newNotif;
  }

  async getActiveNotifications(): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.active, true)).orderBy(notifications.createdAt);
  }

  async getGalleryPhotos(): Promise<GalleryPhoto[]> {
    return db.select().from(galleryPhotos).orderBy(desc(galleryPhotos.createdAt));
  }

  async createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto> {
    const [newPhoto] = await db.insert(galleryPhotos).values(photo).returning();
    return newPhoto;
  }

  async deleteGalleryPhoto(id: number): Promise<void> {
    await db.delete(galleryPhotos).where(eq(galleryPhotos.id, id));
  }
}

export const storage = new DatabaseStorage();
