import { db } from "./db";
import {
  users, activities, notifications, galleryPhotos, messages, pushSubscriptions, residentProfiles,
  type User, type InsertUser,
  type Activity, type InsertActivity,
  type Notification, type InsertNotification,
  type GalleryPhoto, type InsertGalleryPhoto,
  type Message, type InsertMessage,
  type PushSubscription, type InsertPushSubscription,
  type ResidentProfile, type InsertResidentProfile
} from "@shared/schema";
import { eq, ilike, or, and, desc, isNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByLotAndName(lotNumber: string, lastName: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  searchUsers(query?: string): Promise<User[]>;
  getResidents(): Promise<User[]>;
  getFirstAdmin(): Promise<User | undefined>;
  getAdmins(): Promise<User[]>;
  updateResident(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteResident(id: number): Promise<void>;
  updateProfilePicture(userId: number, objectPath: string): Promise<void>;

  // Activities
  getActivities(): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  deleteActivity(id: number): Promise<void>;

  // Notifications
  getNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  getActiveNotifications(): Promise<Notification[]>;
  deleteNotification(id: number): Promise<void>;

  // Gallery
  getGalleryPhotos(): Promise<GalleryPhoto[]>;
  createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto>;
  deleteGalleryPhoto(id: number): Promise<void>;

  // Messages
  getCommunityMessages(includeUnapproved?: boolean): Promise<Message[]>;
  getPendingMessages(): Promise<Message[]>;
  getDirectMessages(userId: number): Promise<Message[]>;
  getConversation(userId1: number, userId2: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageRead(id: number): Promise<void>;
  approveMessage(id: number): Promise<void>;
  deleteMessage(id: number): Promise<void>;

  // Push Subscriptions
  getPushSubscription(userId: number): Promise<PushSubscription | undefined>;
  getAllPushSubscriptions(type?: 'weather' | 'alerts'): Promise<PushSubscription[]>;
  savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  updatePushPreferences(userId: number, weatherEnabled: boolean, alertsEnabled: boolean): Promise<void>;
  deletePushSubscription(userId: number): Promise<void>;

  // Resident Profiles
  getResidentProfiles(userId: number): Promise<ResidentProfile[]>;
  getResidentProfile(profileId: number): Promise<ResidentProfile | undefined>;
  createResidentProfile(profile: InsertResidentProfile): Promise<ResidentProfile>;
  deleteResidentProfile(profileId: number): Promise<void>;
  updateResidentProfilePicture(profileId: number, objectPath: string): Promise<ResidentProfile>;
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
        ilike(users.lotNumber, `%${lotNumber}%`),
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

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
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

  async getResidents(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, 'resident')).orderBy(users.lotNumber);
  }

  async getFirstAdmin(): Promise<User | undefined> {
    const [admin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    return admin;
  }

  async getAdmins(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, 'admin'));
  }

  async updateResident(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(
      and(eq(users.id, id), eq(users.role, 'resident'))
    ).returning();
    return updated;
  }

  async deleteResident(id: number): Promise<void> {
    await db.delete(users).where(
      and(eq(users.id, id), eq(users.role, 'resident'))
    );
  }

  async updateProfilePicture(userId: number, objectPath: string): Promise<void> {
    await db.update(users).set({ profilePicture: objectPath }).where(eq(users.id, userId));
  }

  async getCommunityMessages(includeUnapproved: boolean = false): Promise<Message[]> {
    if (includeUnapproved) {
      return db.select().from(messages).where(isNull(messages.recipientId)).orderBy(desc(messages.createdAt));
    }
    return db.select().from(messages).where(
      and(isNull(messages.recipientId), eq(messages.approved, true))
    ).orderBy(desc(messages.createdAt));
  }

  async getPendingMessages(): Promise<Message[]> {
    return db.select().from(messages).where(
      and(isNull(messages.recipientId), eq(messages.approved, false))
    ).orderBy(desc(messages.createdAt));
  }

  async getDirectMessages(userId: number): Promise<Message[]> {
    return db.select().from(messages).where(
      or(
        eq(messages.senderId, userId),
        eq(messages.recipientId, userId)
      )
    ).orderBy(desc(messages.createdAt));
  }

  async getConversation(userId1: number, userId2: number): Promise<Message[]> {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
      )
    ).orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessageRead(id: number): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  }

  async approveMessage(id: number): Promise<void> {
    await db.update(messages).set({ approved: true }).where(eq(messages.id, id));
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async getPushSubscription(userId: number): Promise<PushSubscription | undefined> {
    const [subscription] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    return subscription;
  }

  async getAllPushSubscriptions(type?: 'weather' | 'alerts'): Promise<PushSubscription[]> {
    if (type === 'weather') {
      return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.weatherEnabled, true));
    }
    if (type === 'alerts') {
      return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.alertsEnabled, true));
    }
    return db.select().from(pushSubscriptions);
  }

  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    // Delete existing subscription for this user first
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, subscription.userId));
    const [newSub] = await db.insert(pushSubscriptions).values(subscription).returning();
    return newSub;
  }

  async updatePushPreferences(userId: number, weatherEnabled: boolean, alertsEnabled: boolean): Promise<void> {
    await db.update(pushSubscriptions)
      .set({ weatherEnabled, alertsEnabled })
      .where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(userId: number): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  // Resident Profiles
  async getResidentProfiles(userId: number): Promise<ResidentProfile[]> {
    return db.select().from(residentProfiles).where(eq(residentProfiles.userId, userId));
  }

  async getResidentProfile(profileId: number): Promise<ResidentProfile | undefined> {
    const [profile] = await db.select().from(residentProfiles).where(eq(residentProfiles.id, profileId));
    return profile;
  }

  async createResidentProfile(profile: InsertResidentProfile): Promise<ResidentProfile> {
    const [newProfile] = await db.insert(residentProfiles).values(profile).returning();
    return newProfile;
  }

  async deleteResidentProfile(profileId: number): Promise<void> {
    await db.delete(residentProfiles).where(eq(residentProfiles.id, profileId));
  }

  async updateResidentProfilePicture(profileId: number, objectPath: string): Promise<ResidentProfile> {
    const [updated] = await db
      .update(residentProfiles)
      .set({ profilePicture: objectPath })
      .where(eq(residentProfiles.id, profileId))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
