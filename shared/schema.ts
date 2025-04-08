import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  isAdmin: true,
});

// API Tokens
export const apiTokens = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
});

export const insertApiTokenSchema = createInsertSchema(apiTokens).pick({
  name: true,
  userId: true,
  expiresAt: true,
});

// LDAP Connections
export const ldapConnections = pgTable("ldap_connections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  server: text("server").notNull(),
  port: integer("port").notNull(),
  authType: text("auth_type").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  baseDN: text("base_dn"),
  useTLS: boolean("use_tls").default(false),
  status: text("status").default("disconnected"),
  lastConnected: timestamp("last_connected"),
});

export const insertLdapConnectionSchema = createInsertSchema(ldapConnections).pick({
  name: true,
  server: true,
  port: true,
  authType: true,
  username: true,
  password: true,
  baseDN: true,
  useTLS: true,
});

// Activity Log
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceType: text("resource_type").notNull(),
  userId: integer("user_id"),
  username: text("username"),
  status: text("status").notNull(),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  action: true,
  resource: true,
  resourceType: true,
  userId: true,
  username: true,
  status: true,
  details: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ApiToken = typeof apiTokens.$inferSelect;
export type InsertApiToken = z.infer<typeof insertApiTokenSchema>;

export type LdapConnection = typeof ldapConnections.$inferSelect;
export type InsertLdapConnection = z.infer<typeof insertLdapConnectionSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
