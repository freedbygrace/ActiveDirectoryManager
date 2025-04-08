import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Role-based access control tables
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define available permissions
export const PERMISSIONS = {
  // User management
  VIEW_USERS: "view:users",
  CREATE_USERS: "create:users",
  UPDATE_USERS: "update:users",
  DELETE_USERS: "delete:users",
  
  // LDAP connections
  VIEW_LDAP_CONNECTIONS: "view:ldap_connections",
  CREATE_LDAP_CONNECTIONS: "create:ldap_connections",
  UPDATE_LDAP_CONNECTIONS: "update:ldap_connections",
  DELETE_LDAP_CONNECTIONS: "delete:ldap_connections",
  
  // Active Directory management
  VIEW_AD_USERS: "view:ad_users",
  CREATE_AD_USERS: "create:ad_users",
  UPDATE_AD_USERS: "update:ad_users",
  DELETE_AD_USERS: "delete:ad_users",
  
  VIEW_AD_GROUPS: "view:ad_groups",
  CREATE_AD_GROUPS: "create:ad_groups",
  UPDATE_AD_GROUPS: "update:ad_groups",
  DELETE_AD_GROUPS: "delete:ad_groups",
  
  VIEW_AD_OUS: "view:ad_ous",
  CREATE_AD_OUS: "create:ad_ous",
  UPDATE_AD_OUS: "update:ad_ous",
  DELETE_AD_OUS: "delete:ad_ous",
  
  VIEW_AD_COMPUTERS: "view:ad_computers",
  CREATE_AD_COMPUTERS: "create:ad_computers",
  UPDATE_AD_COMPUTERS: "update:ad_computers",
  DELETE_AD_COMPUTERS: "delete:ad_computers",
  
  VIEW_AD_DOMAINS: "view:ad_domains",
  
  // LDAP Query Builder
  VIEW_LDAP_QUERIES: "view:ldap_queries",
  CREATE_LDAP_QUERIES: "create:ldap_queries",
  UPDATE_LDAP_QUERIES: "update:ldap_queries",
  DELETE_LDAP_QUERIES: "delete:ldap_queries",
  RUN_LDAP_QUERIES: "run:ldap_queries",

  // API Token management
  MANAGE_API_TOKENS: "manage:api_tokens",
  
  // Administrative functions
  MANAGE_ROLES: "manage:roles",
  SYSTEM_ADMIN: "admin:system",
} as const;

// Create a Zod schema for permissions
export const permissionsSchema = z.enum([
  "view:users",
  "create:users",
  "update:users",
  "delete:users",
  "view:ldap_connections",
  "create:ldap_connections",
  "update:ldap_connections",
  "delete:ldap_connections",
  "view:ad_users",
  "create:ad_users",
  "update:ad_users",
  "delete:ad_users",
  "view:ad_groups",
  "create:ad_groups",
  "update:ad_groups",
  "delete:ad_groups",
  "view:ad_ous",
  "create:ad_ous",
  "update:ad_ous",
  "delete:ad_ous",
  "view:ad_computers",
  "create:ad_computers",
  "update:ad_computers",
  "delete:ad_computers",
  "view:ad_domains",
  "view:ldap_queries",
  "create:ldap_queries",
  "update:ldap_queries", 
  "delete:ldap_queries",
  "run:ldap_queries",
  "manage:api_tokens",
  "manage:roles",
  "admin:system"
]);

export type Permission = z.infer<typeof permissionsSchema>;

export const rolePermissions = pgTable("role_permissions", {
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
}, table => {
  return {
    pk: primaryKey({ columns: [table.roleId, table.permission] }),
  };
});

// User schema for local authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  roleId: integer("role_id").references(() => roles.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// API Token schema
export const apiTokens = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").references(() => roles.id),
  customPermissions: jsonb("custom_permissions"),
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

// LDAP Query Builder schemas
export const ldapQueries = pgTable("ldap_queries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  targetObject: text("target_object").notNull(), // users, groups, computers, ous
  filterJson: jsonb("filter").notNull(), // Serialized filter conditions
  ldapFilter: text("ldap_filter").notNull(), // The actual LDAP filter string
  readableFilter: text("readable_filter").notNull(), // Human-readable representation
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").notNull().references(() => users.id),
  modifiedBy: integer("modified_by").notNull().references(() => users.id, { onDelete: "set null" }).default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// LDAP Query Versions for revision history
export const ldapQueryVersions = pgTable("ldap_query_versions", {
  id: serial("id").primaryKey(),
  queryId: integer("query_id").notNull().references(() => ldapQueries.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  filterJson: jsonb("filter").notNull(), // Serialized filter conditions
  ldapFilter: text("ldap_filter").notNull(), // The actual LDAP filter string
  readableFilter: text("readable_filter").notNull(), // Human-readable representation
  targetObject: text("target_object").notNull(), // users, groups, computers, ous
  createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: "set null" }).default(1), 
  modifiedBy: integer("modified_by").notNull().references(() => users.id, { onDelete: "set null" }).default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations between tables
export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  users: many(users),
  apiTokens: many(apiTokens),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  apiTokens: many(apiTokens),
  createdQueries: many(ldapQueries, { relationName: "createdQueries" }),
  modifiedQueries: many(ldapQueries, { relationName: "modifiedQueries" }),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [apiTokens.roleId],
    references: [roles.id],
  }),
}));

export const ldapQueriesRelations = relations(ldapQueries, ({ one, many }) => ({
  creator: one(users, {
    fields: [ldapQueries.createdBy],
    references: [users.id],
    relationName: "createdQueries",
  }),
  modifier: one(users, {
    fields: [ldapQueries.modifiedBy],
    references: [users.id],
    relationName: "modifiedQueries",
  }),
  versions: many(ldapQueryVersions),
}));

export const ldapQueryVersionsRelations = relations(ldapQueryVersions, ({ one }) => ({
  query: one(ldapQueries, {
    fields: [ldapQueryVersions.queryId],
    references: [ldapQueries.id],
  }),
  modifier: one(users, {
    fields: [ldapQueryVersions.modifiedBy],
    references: [users.id],
  }),
}));

// Generate insertion schemas
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissions);
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertApiTokenSchema = createInsertSchema(apiTokens).omit({ id: true, createdAt: true });
export const insertLdapConnectionSchema = createInsertSchema(ldapConnections).omit({ id: true, createdAt: true, lastConnected: true });
export const insertAdUserSchema = createInsertSchema(adUsers).omit({ id: true });
export const insertAdGroupSchema = createInsertSchema(adGroups).omit({ id: true });
export const insertAdOrgUnitSchema = createInsertSchema(adOrgUnits).omit({ id: true });
export const insertAdComputerSchema = createInsertSchema(adComputers).omit({ id: true });
export const insertAdDomainSchema = createInsertSchema(adDomains).omit({ id: true });
export const insertLdapQuerySchema = createInsertSchema(ldapQueries).omit({ id: true, createdAt: true, updatedAt: true, version: true });
export const insertLdapQueryVersionSchema = createInsertSchema(ldapQueryVersions).omit({ id: true, createdAt: true });

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
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type User = typeof users.$inferSelect & {
  // For API token authentication
  tokenId?: number;
  customPermissions?: string[];
  role?: string;
};
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
export type LdapQuery = typeof ldapQueries.$inferSelect;
export type InsertLdapQuery = z.infer<typeof insertLdapQuerySchema>;
export type LdapQueryVersion = typeof ldapQueryVersions.$inferSelect;
export type InsertLdapQueryVersion = z.infer<typeof insertLdapQueryVersionSchema>;
export type Login = z.infer<typeof loginSchema>;
export type ApiQuery = z.infer<typeof apiQuerySchema>;
