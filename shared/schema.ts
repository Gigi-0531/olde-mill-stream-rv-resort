import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  role: text("role").notNull().default("resident"), // 'admin' | 'resident'
  username: text("username").unique(), // For admin email
  password: text("password"), // For admin
  lastName: text("last_name"), // For resident
  lotNumber: text("lot_number"), // For resident
  firstName: text("first_name"),
  phoneNumber: text("phone_number"),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  location: text("location"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  active: boolean("active").default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type LoginRequest = {
  role: 'admin' | 'resident';
  username?: string; // Admin email
  password?: string; // Admin password
  lotNumber?: string; // Resident
  lastName?: string; // Resident
};
