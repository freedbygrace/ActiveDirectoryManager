import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for local authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

// API Token schema
export const apiTokens = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  permissions: jsonb("permissions").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// LDAP Connection schema
export const ldapConnections = pgTable("ldap_connections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  server: text("server").notNull(),
  domain: text("domain").notNull(),
  port: integer("port").default(389),
  useSSL: boolean("use_ssl").default(true),
  username: text("username").notNull(),
  password: text("password").notNull(),
  status: text("status").default("disconnected"),
  lastConnected: timestamp("last_connected"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Active Directory schemas
export const adUsers = pgTable("ad_users", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  sAMAccountName: text("sam_account_name").notNull(),
  userPrincipalName: text("user_principal_name"),
  givenName: text("given_name"),
  surname: text("surname"),
  displayName: text("display_name"),
  email: text("email"),
  enabled: boolean("enabled").default(true),
  lastLogon: timestamp("last_logon"),
  memberOf: jsonb("member_of"),
  adProperties: jsonb("ad_properties"),
});

export const adGroups = pgTable("ad_groups", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  sAMAccountName: text("sam_account_name").notNull(),
  groupType: text("group_type"),
  description: text("description"),
  members: jsonb("members"),
  adProperties: jsonb("ad_properties"),
});

export const adOrgUnits = pgTable("ad_org_units", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  adProperties: jsonb("ad_properties"),
});

export const adComputers = pgTable("ad_computers", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  name: text("name").notNull(),
  dnsHostName: text("dns_host_name"),
  operatingSystem: text("operating_system"),
  operatingSystemVersion: text("operating_system_version"),
  lastLogon: timestamp("last_logon"),
  enabled: boolean("enabled").default(true),
  adProperties: jsonb("ad_properties"),
});

export const adDomains = pgTable("ad_domains", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  name: text("name").notNull(),
  netBIOSName: text("net_bios_name"),
  forestName: text("forest_name"),
  domainFunctionality: text("domain_functionality"),
  adProperties: jsonb("ad_properties"),
});

// Generate insertion schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertApiTokenSchema = createInsertSchema(apiTokens).omit({ id: true, createdAt: true });
export const insertLdapConnectionSchema = createInsertSchema(ldapConnections).omit({ id: true, createdAt: true, lastConnected: true });
export const insertAdUserSchema = createInsertSchema(adUsers).omit({ id: true });
export const insertAdGroupSchema = createInsertSchema(adGroups).omit({ id: true });
export const insertAdOrgUnitSchema = createInsertSchema(adOrgUnits).omit({ id: true });
export const insertAdComputerSchema = createInsertSchema(adComputers).omit({ id: true });
export const insertAdDomainSchema = createInsertSchema(adDomains).omit({ id: true });

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// API query parameters schema
export const apiQuerySchema = z.object({
  filter: z.string().optional(),
  select: z.string().optional(),
  expand: z.string().optional(),
  orderBy: z.string().optional(),
  top: z.string().optional(),
  skip: z.string().optional(),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ApiToken = typeof apiTokens.$inferSelect;
export type InsertApiToken = z.infer<typeof insertApiTokenSchema>;
export type LdapConnection = typeof ldapConnections.$inferSelect;
export type InsertLdapConnection = z.infer<typeof insertLdapConnectionSchema>;
export type AdUser = typeof adUsers.$inferSelect;
export type InsertAdUser = z.infer<typeof insertAdUserSchema>;
export type AdGroup = typeof adGroups.$inferSelect;
export type InsertAdGroup = z.infer<typeof insertAdGroupSchema>;
export type AdOrgUnit = typeof adOrgUnits.$inferSelect;
export type InsertAdOrgUnit = z.infer<typeof insertAdOrgUnitSchema>;
export type AdComputer = typeof adComputers.$inferSelect;
export type InsertAdComputer = z.infer<typeof insertAdComputerSchema>;
export type AdDomain = typeof adDomains.$inferSelect;
export type InsertAdDomain = z.infer<typeof insertAdDomainSchema>;
export type Login = z.infer<typeof loginSchema>;
export type ApiQuery = z.infer<typeof apiQuerySchema>;
