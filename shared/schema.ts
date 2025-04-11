import { pgTable, text, serial, integer, boolean, timestamp, jsonb, json, primaryKey } from "drizzle-orm/pg-core";
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
  MOVE_AD_USERS: "move:ad_users",
  
  VIEW_AD_GROUPS: "view:ad_groups",
  CREATE_AD_GROUPS: "create:ad_groups",
  UPDATE_AD_GROUPS: "update:ad_groups",
  DELETE_AD_GROUPS: "delete:ad_groups",
  MANAGE_GROUP_MEMBERSHIP: "manage:group_membership",
  
  VIEW_AD_OUS: "view:ad_ous",
  CREATE_AD_OUS: "create:ad_ous",
  UPDATE_AD_OUS: "update:ad_ous",
  DELETE_AD_OUS: "delete:ad_ous",
  
  VIEW_AD_COMPUTERS: "view:ad_computers",
  CREATE_AD_COMPUTERS: "create:ad_computers",
  UPDATE_AD_COMPUTERS: "update:ad_computers",
  DELETE_AD_COMPUTERS: "delete:ad_computers",
  MOVE_AD_COMPUTERS: "move:ad_computers",
  
  VIEW_AD_DOMAINS: "view:ad_domains",

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
  "move:ad_users",
  "view:ad_groups",
  "create:ad_groups",
  "update:ad_groups",
  "delete:ad_groups",
  "manage:group_membership",
  "view:ad_ous",
  "create:ad_ous",
  "update:ad_ous",
  "delete:ad_ous",
  "view:ad_computers",
  "create:ad_computers",
  "update:ad_computers",
  "delete:ad_computers",
  "move:ad_computers",
  "view:ad_domains",
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

// User schema for authentication (local, LDAP, or OIDC)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  roleId: integer("role_id").references(() => roles.id),
  authProvider: text("auth_provider").default("local"),
  providerUserId: text("provider_user_id"),
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

// Define schedule type for human-readable schedule descriptions
export const scheduleFrequencies = [
  "once",
  "minutely",
  "hourly", 
  "daily", 
  "weekly", 
  "monthly", 
  "yearly"
] as const;

export const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
] as const;

// Schedule rules for dynamic group membership updates
export const scheduleRules = pgTable("schedule_rules", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").references(() => dynamicGroupRules.id, { onDelete: "cascade" }).notNull(),
  frequency: text("frequency").notNull(), // once, minutely, hourly, daily, weekly, monthly, yearly
  minute: integer("minute"), // 0-59
  hour: integer("hour"), // 0-23
  dayOfMonth: integer("day_of_month"), // 1-31
  month: integer("month"), // 1-12
  dayOfWeek: text("day_of_week"), // sunday-saturday
  cronExpression: text("cron_expression"), // Raw cron expression for custom schedules
  description: text("description"), // Human-readable description
  enabled: boolean("enabled").default(true),
  priority: integer("priority").default(0), // For ordering multiple schedules
  nextRunTime: timestamp("next_run_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dynamic Group Membership Rules
export const dynamicGroupRules = pgTable("dynamic_group_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  targetGroup: text("target_group").notNull(), // DN of the target AD group
  enabled: boolean("enabled").default(true),
  schedule: text("schedule").default("0 0 * * *"), // Legacy cron format (default: daily at midnight)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastRun: timestamp("last_run"),
  lastRunStatus: text("last_run_status"),
  variablePattern: text("variable_pattern"), // Pattern for dynamic group name, e.g. "{{department}}-Users"
  useAdvancedScheduling: boolean("use_advanced_scheduling").default(false),
  createGroupIfNotExists: boolean("create_group_if_not_exists").default(true), // Changed default to true
  createOUIfNotExists: boolean("create_ou_if_not_exists").default(true), // Changed default to true
  createGroupForEachAttributeValue: boolean("create_group_for_each_attribute_value").default(false),
  createOUForEachAttributeValue: boolean("create_ou_for_each_attribute_value").default(false),
  autoAddRootDSE: boolean("auto_add_root_dse").default(true), // Added with default true
});

// Rule conditions (filter logic)
export const dynamicGroupConditions = pgTable("dynamic_group_conditions", {
  id: serial("id").primaryKey(), 
  ruleId: integer("rule_id").references(() => dynamicGroupRules.id, { onDelete: "cascade" }).notNull(),
  parentId: integer("parent_id").references(() => dynamicGroupConditions.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "condition", "group"
  operator: text("operator"), // "and", "or", "not" for groups; "equals", "contains", "startsWith", etc. for conditions
  attribute: text("attribute"), // LDAP attribute name (e.g., "department", "title")
  value: text("value"), // Value to compare against
  position: integer("position").default(0), // For ordering conditions within a group
});

// Many-to-many relationship between rules and connections
export const dynamicGroupRuleConnections = pgTable("dynamic_group_rule_connections", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").references(() => dynamicGroupRules.id, { onDelete: "cascade" }).notNull(),
  connectionId: integer("connection_id").references(() => ldapConnections.id, { onDelete: "cascade" }).notNull(),
});

// Active Directory schemas
export const adUsers = pgTable("ad_users", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  objectGUID: text("object_guid").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  canonicalName: text("canonical_name"),
  cn: text("cn"),
  sAMAccountName: text("sam_account_name").notNull(),
  userPrincipalName: text("user_principal_name"),
  givenName: text("given_name"),
  surname: text("surname"),
  displayName: text("display_name"),
  email: text("email"),
  enabled: boolean("enabled").default(true),
  lastLogon: timestamp("last_logon"),
  managedBy: text("managed_by"),
  memberOf: jsonb("member_of"),
  adProperties: jsonb("ad_properties"),
});

export const adGroups = pgTable("ad_groups", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  objectGUID: text("object_guid").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  canonicalName: text("canonical_name"),
  cn: text("cn"),
  sAMAccountName: text("sam_account_name").notNull(),
  groupType: text("group_type"),
  description: text("description"),
  managedBy: text("managed_by"),
  members: jsonb("members"),
  adProperties: jsonb("ad_properties"),
});

export const adOrgUnits = pgTable("ad_org_units", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  objectGUID: text("object_guid").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  canonicalName: text("canonical_name"),
  cn: text("cn"),
  name: text("name").notNull(),
  description: text("description"),
  managedBy: text("managed_by"),
  adProperties: jsonb("ad_properties"),
});

export const adComputers = pgTable("ad_computers", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  objectGUID: text("object_guid").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  canonicalName: text("canonical_name"),
  cn: text("cn"),
  name: text("name").notNull(),
  sAMAccountName: text("sam_account_name"),
  dnsHostName: text("dns_host_name"),
  operatingSystem: text("operating_system"),
  operatingSystemVersion: text("operating_system_version"),
  lastLogon: timestamp("last_logon"),
  enabled: boolean("enabled").default(true),
  managedBy: text("managed_by"),
  memberOf: jsonb("member_of"),
  adProperties: jsonb("ad_properties"),
});

export const adDomains = pgTable("ad_domains", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  objectGUID: text("object_guid").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  canonicalName: text("canonical_name"),
  cn: text("cn"),
  name: text("name").notNull(),
  netBIOSName: text("net_bios_name"),
  forestName: text("forest_name"),
  domainFunctionality: text("domain_functionality"),
  adProperties: jsonb("ad_properties"),
});

// AD Sites table for Sites and Services
export const adSites = pgTable("ad_sites", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  objectGUID: text("object_guid").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  cn: text("cn"),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  managedBy: text("managed_by"),
  adProperties: jsonb("ad_properties"),
  objectType: text("object_type").default("site").notNull(),
});

// AD Subnets table for Sites and Services
export const adSubnets = pgTable("ad_subnets", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  objectGUID: text("object_guid").notNull(),
  distinguishedName: text("distinguished_name").notNull(),
  cn: text("cn"),
  name: text("name").notNull(),
  description: text("description"),
  siteObject: text("site_object"),
  location: text("location"),
  networkAddress: text("network_address"),
  networkMask: text("network_mask"),
  cidr: text("cidr"),
  managedBy: text("managed_by"),
  adProperties: jsonb("ad_properties"),
  objectType: text("object_type").default("subnet").notNull(),
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

// Dynamic Group Rules Relations
export const dynamicGroupRulesRelations = relations(dynamicGroupRules, ({ many }) => ({
  conditions: many(dynamicGroupConditions),
  connections: many(dynamicGroupRuleConnections),
  schedules: many(scheduleRules),
}));

export const dynamicGroupConditionsRelations = relations(dynamicGroupConditions, ({ one, many }) => ({
  rule: one(dynamicGroupRules, {
    fields: [dynamicGroupConditions.ruleId],
    references: [dynamicGroupRules.id],
  }),
  parent: one(dynamicGroupConditions, {
    fields: [dynamicGroupConditions.parentId],
    references: [dynamicGroupConditions.id],
  }),
  children: many(dynamicGroupConditions, {
    relationName: 'parent-child-conditions'
  }),
}));

export const dynamicGroupRuleConnectionsRelations = relations(dynamicGroupRuleConnections, ({ one }) => ({
  rule: one(dynamicGroupRules, {
    fields: [dynamicGroupRuleConnections.ruleId],
    references: [dynamicGroupRules.id],
  }),
  connection: one(ldapConnections, {
    fields: [dynamicGroupRuleConnections.connectionId],
    references: [ldapConnections.id],
  }),
}));

// Schedule Rule Relations
export const scheduleRulesRelations = relations(scheduleRules, ({ one }) => ({
  rule: one(dynamicGroupRules, {
    fields: [scheduleRules.ruleId],
    references: [dynamicGroupRules.id],
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
export const insertAdSiteSchema = createInsertSchema(adSites).omit({ id: true });
export const insertAdSubnetSchema = createInsertSchema(adSubnets).omit({ id: true });
export const insertDynamicGroupRuleSchema = createInsertSchema(dynamicGroupRules).omit({ id: true, createdAt: true, updatedAt: true, lastRun: true, lastRunStatus: true });
export const insertDynamicGroupConditionSchema = createInsertSchema(dynamicGroupConditions).omit({ id: true });
export const insertDynamicGroupRuleConnectionSchema = createInsertSchema(dynamicGroupRuleConnections).omit({ id: true });
export const insertScheduleRuleSchema = createInsertSchema(scheduleRules).omit({ id: true, createdAt: true, updatedAt: true, nextRunTime: true });

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

// Move operation schemas
export const moveComputerSchema = z.object({
  computerObjectGUID: z.string().min(1, "Computer ObjectGUID is required"),
  targetOUDistinguishedName: z.string().min(1, "Target OU DN is required"),
});

export const moveUserSchema = z.object({
  userObjectGUID: z.string().min(1, "User ObjectGUID is required"),
  targetOUDistinguishedName: z.string().min(1, "Target OU DN is required"),
});

// Group membership schemas
export const addToGroupSchema = z.object({
  objectGUID: z.string().min(1, "Object GUID is required"),
  groupObjectGUID: z.string().min(1, "Group ObjectGUID is required"),
  objectType: z.enum(["user", "computer"]),
});

export const removeFromGroupSchema = z.object({
  objectGUID: z.string().min(1, "Object GUID is required"),
  groupObjectGUID: z.string().min(1, "Group ObjectGUID is required"),
  objectType: z.enum(["user", "computer"]),
});

// ManagedBy operation schema is no longer needed as it's been replaced by object-specific PATCH endpoints

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
export type AdSite = typeof adSites.$inferSelect;
export type InsertAdSite = z.infer<typeof insertAdSiteSchema>;
export type AdSubnet = typeof adSubnets.$inferSelect;
export type InsertAdSubnet = z.infer<typeof insertAdSubnetSchema>;
export type Login = z.infer<typeof loginSchema>;
export type ApiQuery = z.infer<typeof apiQuerySchema>;
export type MoveComputer = z.infer<typeof moveComputerSchema>;
export type MoveUser = z.infer<typeof moveUserSchema>;
export type AddToGroup = z.infer<typeof addToGroupSchema>;
export type RemoveFromGroup = z.infer<typeof removeFromGroupSchema>;
export type DynamicGroupRule = typeof dynamicGroupRules.$inferSelect;
export type InsertDynamicGroupRule = z.infer<typeof insertDynamicGroupRuleSchema>;
export type DynamicGroupCondition = typeof dynamicGroupConditions.$inferSelect;
export type InsertDynamicGroupCondition = z.infer<typeof insertDynamicGroupConditionSchema>;
export type ScheduleRule = typeof scheduleRules.$inferSelect;
export type InsertScheduleRule = z.infer<typeof insertScheduleRuleSchema>;
export type ScheduleFrequency = typeof scheduleFrequencies[number];
export type Weekday = typeof weekdays[number];


// LDAP Query Builder schemas
export const ldapFilterObjectClasses = ["user", "group", "organizationalUnit", "computer", "domain", "site", "subnet"] as const;

// LDAP Filter schema
export const ldapFilters = pgTable("ldap_filters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  connectionId: integer("connection_id").references(() => ldapConnections.id, { onDelete: "cascade" }).notNull(),
  objectClass: text("object_class").notNull(),
  currentVersion: integer("current_version").default(1),
  filter: jsonb("filter").notNull(), // JSON representation of the filter structure
  ldapFilter: text("ldap_filter").notNull(), // The actual LDAP filter string
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  modifiedAt: timestamp("modified_at").defaultNow(),
  modifiedBy: integer("modified_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
});

// LDAP Filter Revision schema - stores the history of filter changes
export const ldapFilterRevisions = pgTable("ldap_filter_revisions", {
  id: serial("id").primaryKey(),
  filterId: integer("filter_id").references(() => ldapFilters.id, { onDelete: "cascade" }).notNull(),
  version: integer("version").notNull(),
  filter: jsonb("filter").notNull(), // Stores the filter structure
  ldapFilter: text("ldap_filter").notNull(), // The actual LDAP filter string
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  comment: text("comment"),
});

// Audit logs for tracking actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  targetId: text("target_id").notNull(),
  details: jsonb("details").notNull().default({}),
  userId: integer("user_id"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  connectionId: integer("connection_id"),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  connection: one(ldapConnections, {
    fields: [auditLogs.connectionId],
    references: [ldapConnections.id],
  }),
}));

// LDAP Attribute schema - stores known attributes for connections
export const ldapAttributes = pgTable("ldap_attributes", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").references(() => ldapConnections.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  displayName: text("display_name"),
  description: text("description"),
  type: text("type"),
  multiValued: boolean("multi_valued").default(false),
  objectClass: text("object_class").notNull(),
  isIndexed: boolean("is_indexed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const ldapFiltersRelations = relations(ldapFilters, ({ one, many }) => ({
  connection: one(ldapConnections, {
    fields: [ldapFilters.connectionId],
    references: [ldapConnections.id],
  }),
  creator: one(users, {
    fields: [ldapFilters.createdBy],
    references: [users.id],
  }),
  modifier: one(users, {
    fields: [ldapFilters.modifiedBy],
    references: [users.id],
  }),
  revisions: many(ldapFilterRevisions),
}));

export const ldapFilterRevisionsRelations = relations(ldapFilterRevisions, ({ one }) => ({
  filter: one(ldapFilters, {
    fields: [ldapFilterRevisions.filterId],
    references: [ldapFilters.id],
  }),
  creator: one(users, {
    fields: [ldapFilterRevisions.createdBy],
    references: [users.id],
  }),
}));

export const ldapAttributesRelations = relations(ldapAttributes, ({ one }) => ({
  connection: one(ldapConnections, {
    fields: [ldapAttributes.connectionId],
    references: [ldapConnections.id],
  }),
}));

// Generate insertion schemas
export const insertLdapFilterSchema = createInsertSchema(ldapFilters).omit({ 
  id: true, 
  createdAt: true, 
  modifiedAt: true,
  currentVersion: true 
});

export const insertLdapFilterRevisionSchema = createInsertSchema(ldapFilterRevisions).omit({ 
  id: true, 
  createdAt: true 
});

export const insertLdapAttributeSchema = createInsertSchema(ldapAttributes).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Export types
export type LdapFilter = typeof ldapFilters.$inferSelect;
export type InsertLdapFilter = z.infer<typeof insertLdapFilterSchema>;
export type LdapFilterRevision = typeof ldapFilterRevisions.$inferSelect;
export type InsertLdapFilterRevision = z.infer<typeof insertLdapFilterRevisionSchema>;
export type LdapAttribute = typeof ldapAttributes.$inferSelect;
export type InsertLdapAttribute = z.infer<typeof insertLdapAttributeSchema>;

// Audit log schema and types
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ 
  id: true, 
  timestamp: true
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
