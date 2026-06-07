import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* ======================================================
   ENUMS
====================================================== */

export const userRoleEnum = pgEnum("user_role", ["admin", "resident"]);

/* ======================================================
   USERS
====================================================== */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  role: userRoleEnum("role")
    .notNull()
    .default("resident"),

  // Admin-only fields
  username: text("username").unique(),
  password: text("password"), // bcrypt hash ONLY

  // Resident-only fields
  firstName: text("first_name"),
  lastName: text("last_name"),
  lotNumber: text("lot_number"),
  phoneNumber: text("phone_number"),
  profilePicture: text("profile_picture"), // Object storage path

  // Push notifications
  onesignalExternalUserId: text("onesignal_external_user_id"),

  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
}, (table) => [
  index("users_onesignal_external_user_id_idx").on(table.onesignalExternalUserId),
]);

/* ======================================================
   ACTIVITIES
====================================================== */

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date", { withTimezone: false }).notNull(),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

/* ======================================================
   NOTIFICATIONS
====================================================== */

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

/* ======================================================
   GALLERY
====================================================== */

export const photoStatusEnum = pgEnum("photo_status", ["pending", "approved", "rejected"]);

export const galleryPhotos = pgTable("gallery_photos", {
  id: serial("id").primaryKey(),
  title: text("title"),
  objectPath: text("object_path").notNull(),
  status: photoStatusEnum("status").notNull().default("approved"),
  submitterId: integer("submitter_id"),
  submitterName: text("submitter_name"),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

/* ======================================================
   MESSAGES
====================================================== */

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id"), // null = community-wide message
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  approved: boolean("approved").notNull().default(false), // community messages need admin approval
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

/* ======================================================
   PUBLIC DIRECTORY
====================================================== */

export const directoryEntries = pgTable("directory_entries", {
  id: serial("id").primaryKey(),
  lotNumber: text("lot_number"),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

/* ======================================================
   PUSH SUBSCRIPTIONS
====================================================== */

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  weatherEnabled: boolean("weather_enabled").notNull().default(true),
  alertsEnabled: boolean("alerts_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

/* ======================================================
   APNS TOKENS
====================================================== */

export const apnsTokens = pgTable("apns_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export type ApnsToken = typeof apnsTokens.$inferSelect;

/* ======================================================
   INSERT SCHEMAS (ZOD)
====================================================== */

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().email().optional(),
  password: z.string().min(60).optional(), // bcrypt hash length
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  lotNumber: z.string().min(1).optional(),
  phoneNumber: z.string().min(7).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertGalleryPhotoSchema = createInsertSchema(galleryPhotos).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

/* ======================================================
   TYPES
====================================================== */

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type GalleryPhoto = typeof galleryPhotos.$inferSelect;
export type InsertGalleryPhoto = z.infer<typeof insertGalleryPhotoSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export type DirectoryEntry = typeof directoryEntries.$inferSelect;

/* ======================================================
   AUTH / LOGIN INPUT (SAFE UNION)
====================================================== */

export const loginSchema = z.union([
  z.object({
    role: z.literal("admin"),
    username: z.string().email(),
    password: z.string().min(8),
  }),
  z.object({
    role: z.literal("resident"),
    lotNumber: z.string().min(1),
    lastName: z.string().min(1),
  }),
]);

export type LoginRequest = z.infer<typeof loginSchema>;
