import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* ============================
   ENUMS (SECURITY)
============================ */

export const userRoleEnum = pgEnum("user_role", ["admin", "resident"]);

/* ============================
   USERS
============================ */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  role: userRoleEnum("role")
    .notNull()
    .default("resident"),

  // Admin-only
  username: text("username").unique(),
  password: text("password"), // bcrypt hash ONLY

  // Resident-only
  firstName: text("first_name"),
  lastName: text("last_name"),
  lotNumber: text("lot_number"),
  phoneNumber: text("phone_number"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================
   ACTIVITIES
============================ */

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================
   NOTIFICATIONS
============================ */

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  active: boolean("active").default(true).notNull(),
});

/* ============================
   GALLERY
============================ */

export const galleryPhotos = pgTable("gallery_photos", {
  id: serial("id").primaryKey(),
  title: text("title"),
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================
   ZOD INSERT SCHEMAS (STRICT)
============================ */

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().email().optional(),
  password: z.string().min(60).optional(), // bcrypt hashes are ~60 chars
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

/* ============================
   TYPES
============================ */

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type GalleryPhoto = typeof galleryPhotos.$inferSelect;
export type InsertGalleryPhoto = z.infer<typeof insertGalleryPhotoSchema>;

/* ============================
   LOGIN INPUT (SAFE)
============================ */

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
