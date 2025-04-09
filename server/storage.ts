import { 
  User, InsertUser, ApiToken, InsertApiToken, 
  LdapConnection, InsertLdapConnection, 
  AdUser, InsertAdUser, AdGroup, InsertAdGroup, 
  AdOrgUnit, InsertAdOrgUnit, AdComputer, InsertAdComputer, 
  AdDomain, InsertAdDomain, Role, ApiQuery,
  LdapFilter, InsertLdapFilter, LdapFilterRevision, InsertLdapFilterRevision,
  LdapAttribute, InsertLdapAttribute, AuditLog, InsertAuditLog,
  users, apiTokens, ldapConnections, adUsers, adGroups, adOrgUnits, adComputers, adDomains,
  roles, ldapFilters, ldapFilterRevisions, ldapAttributes, auditLogs
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import crypto from "crypto";
import { db } from "./db";
import { eq, and, type SQL, desc, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";
import { applyQueryOptions } from "./query-parser";
import debugLib from 'debug';
import { getCached, setCached, CACHE_TTL, invalidateCache, invalidateCachePattern } from './cache';

const debug = debugLib('api:storage');

// Memory store for sessions
const MemoryStore = createMemoryStore(session);

// PostgreSQL session store
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const PostgresStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  listUsers(): Promise<User[]>;
  
  // Role management
  getRole(id: number): Promise<Role | undefined>;
  getDefaultRole(): Promise<Role | undefined>;
  
  // API Token management
  getApiToken(id: number): Promise<ApiToken | undefined>;
  getApiTokenByToken(token: string): Promise<ApiToken | undefined>;
  createApiToken(token: InsertApiToken): Promise<ApiToken>;
  deleteApiToken(id: number): Promise<boolean>;
  listApiTokensByUserId(userId: number): Promise<ApiToken[]>;

  // LDAP Connection management
  getLdapConnection(id: number): Promise<LdapConnection | undefined>;
  createLdapConnection(connection: InsertLdapConnection): Promise<LdapConnection>;
  updateLdapConnection(id: number, connection: Partial<LdapConnection>): Promise<LdapConnection | undefined>;
  deleteLdapConnection(id: number): Promise<boolean>;
  listLdapConnections(): Promise<LdapConnection[]>;

  // LDAP Query Builder
  getLdapAttributes(connectionId: number, objectClass: string): Promise<LdapAttribute[]>;
  createLdapAttribute(attribute: InsertLdapAttribute): Promise<LdapAttribute>;
  updateLdapAttribute(id: number, attribute: Partial<LdapAttribute>): Promise<LdapAttribute | undefined>;
  deleteLdapAttribute(id: number): Promise<boolean>;
  
  getLdapFilter(id: number): Promise<LdapFilter | undefined>;
  createLdapFilter(filter: InsertLdapFilter): Promise<LdapFilter>;
  updateLdapFilter(id: number, filter: Partial<LdapFilter>): Promise<LdapFilter | undefined>;
  deleteLdapFilter(id: number): Promise<boolean>;
  listLdapFilters(connectionId: number): Promise<LdapFilter[]>;
  
  getLdapFilterRevisions(filterId: number): Promise<LdapFilterRevision[]>;
  getLdapFilterRevision(id: number): Promise<LdapFilterRevision | undefined>;
  createLdapFilterRevision(revision: InsertLdapFilterRevision): Promise<LdapFilterRevision>;
  revertLdapFilterToRevision(filterId: number, revisionId: number): Promise<LdapFilter | undefined>;
  
  testLdapFilter(connectionId: number, ldapFilter: string, objectClass: string): Promise<any[]>;

  // AD Users
  getAdUser(id: number): Promise<AdUser | undefined>;
  getAdUserByObjectGUID(connectionId: number, objectGUID: string): Promise<AdUser | undefined>;
  createAdUser(user: InsertAdUser): Promise<AdUser>;
  updateAdUser(id: number, user: Partial<AdUser>): Promise<AdUser | undefined>;
  updateAdUserByObjectGUID(connectionId: number, objectGUID: string, user: Partial<AdUser>): Promise<AdUser | undefined>;
  deleteAdUser(id: number): Promise<boolean>;
  listAdUsers(connectionId: number, query?: any): Promise<AdUser[]>;

  // AD Groups
  getAdGroup(id: number): Promise<AdGroup | undefined>;
  getAdGroupByObjectGUID(connectionId: number, objectGUID: string): Promise<AdGroup | undefined>;
  createAdGroup(group: InsertAdGroup): Promise<AdGroup>;
  updateAdGroup(id: number, group: Partial<AdGroup>): Promise<AdGroup | undefined>;
  updateAdGroupByObjectGUID(connectionId: number, objectGUID: string, group: Partial<AdGroup>): Promise<AdGroup | undefined>;
  deleteAdGroup(id: number): Promise<boolean>;
  listAdGroups(connectionId: number, query?: any): Promise<AdGroup[]>;

  // AD Organizational Units
  getAdOrgUnit(id: number): Promise<AdOrgUnit | undefined>;
  getAdOrgUnitByObjectGUID(connectionId: number, objectGUID: string): Promise<AdOrgUnit | undefined>;
  createAdOrgUnit(ou: InsertAdOrgUnit): Promise<AdOrgUnit>;
  updateAdOrgUnit(id: number, ou: Partial<AdOrgUnit>): Promise<AdOrgUnit | undefined>;
  updateAdOrgUnitByObjectGUID(connectionId: number, objectGUID: string, ou: Partial<AdOrgUnit>): Promise<AdOrgUnit | undefined>;
  deleteAdOrgUnit(id: number): Promise<boolean>;
  listAdOrgUnits(connectionId: number, query?: any): Promise<AdOrgUnit[]>;

  // AD Computers
  getAdComputer(id: number): Promise<AdComputer | undefined>;
  getAdComputerByObjectGUID(connectionId: number, objectGUID: string): Promise<AdComputer | undefined>;
  createAdComputer(computer: InsertAdComputer): Promise<AdComputer>;
  updateAdComputer(id: number, computer: Partial<AdComputer>): Promise<AdComputer | undefined>;
  updateAdComputerByObjectGUID(connectionId: number, objectGUID: string, computer: Partial<AdComputer>): Promise<AdComputer | undefined>;
  deleteAdComputer(id: number): Promise<boolean>;
  listAdComputers(connectionId: number, query?: any): Promise<AdComputer[]>;

  // AD Domains
  getAdDomain(id: number): Promise<AdDomain | undefined>;
  createAdDomain(domain: InsertAdDomain): Promise<AdDomain>;
  updateAdDomain(id: number, domain: Partial<AdDomain>): Promise<AdDomain | undefined>;
  deleteAdDomain(id: number): Promise<boolean>;
  listAdDomains(connectionId: number, query?: any): Promise<AdDomain[]>;
  
  // Audit logging
  createAuditLogEntry(entry: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(connectionId?: number, userId?: number, page?: number, pageSize?: number): Promise<{ data: AuditLog[], metadata: { currentPage: number, totalPages: number, totalRecords: number, nextPage: number | null, prevPage: number | null } }>;

  // Session store
  sessionStore: any;
}

// Database Storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return result.length > 0;
  }

  async listUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  // Role management
  async getRole(id: number): Promise<Role | undefined> {
    const result = await db.select().from(roles).where(eq(roles.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getDefaultRole(): Promise<Role | undefined> {
    const result = await db.select().from(roles).where(eq(roles.isDefault, true));
    return result.length > 0 ? result[0] : undefined;
  }

  // API Token management
  async getApiToken(id: number): Promise<ApiToken | undefined> {
    const result = await db.select().from(apiTokens).where(eq(apiTokens.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getApiTokenByToken(token: string): Promise<ApiToken | undefined> {
    const result = await db.select().from(apiTokens).where(eq(apiTokens.token, token));
    return result.length > 0 ? result[0] : undefined;
  }

  async createApiToken(insertToken: InsertApiToken): Promise<ApiToken> {
    const result = await db.insert(apiTokens).values(insertToken).returning();
    return result[0];
  }

  async deleteApiToken(id: number): Promise<boolean> {
    const result = await db.delete(apiTokens).where(eq(apiTokens.id, id)).returning({ id: apiTokens.id });
    return result.length > 0;
  }

  async listApiTokensByUserId(userId: number): Promise<ApiToken[]> {
    return db.select().from(apiTokens).where(eq(apiTokens.userId, userId));
  }

  // LDAP Connection management
  async getLdapConnection(id: number): Promise<LdapConnection | undefined> {
    const result = await db.select().from(ldapConnections).where(eq(ldapConnections.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async createLdapConnection(insertConnection: InsertLdapConnection): Promise<LdapConnection> {
    const result = await db.insert(ldapConnections).values(insertConnection).returning();
    return result[0];
  }

  async updateLdapConnection(id: number, connectionData: Partial<LdapConnection>): Promise<LdapConnection | undefined> {
    const result = await db.update(ldapConnections).set(connectionData).where(eq(ldapConnections.id, id)).returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteLdapConnection(id: number): Promise<boolean> {
    const result = await db.delete(ldapConnections).where(eq(ldapConnections.id, id)).returning({ id: ldapConnections.id });
    return result.length > 0;
  }

  async listLdapConnections(): Promise<LdapConnection[]> {
    return db.select().from(ldapConnections);
  }
  
  // LDAP Query Builder methods
  async getLdapAttributes(connectionId: number, objectClass: string): Promise<LdapAttribute[]> {
    const cacheKey = `ldapAttributes:${connectionId}:${objectClass}`;
    
    // Try to get from cache first
    const cachedData = await getCached<LdapAttribute[]>(cacheKey);
    if (cachedData) {
      debug(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    const attributes = await db.select()
      .from(ldapAttributes)
      .where(
        and(
          eq(ldapAttributes.connectionId, connectionId),
          eq(ldapAttributes.objectClass, objectClass)
        )
      );
    
    // Cache the result
    await setCached(cacheKey, attributes, CACHE_TTL.LONG);
    return attributes;
  }
  
  async createLdapAttribute(attribute: InsertLdapAttribute): Promise<LdapAttribute> {
    debug(`Creating LDAP attribute: ${JSON.stringify(attribute)}`);
    const result = await db.insert(ldapAttributes).values(attribute).returning();
    
    // Invalidate cache for the specific connection and object class
    await invalidateCache(`ldapAttributes:${attribute.connectionId}:${attribute.objectClass}`);
    
    return result[0];
  }
  
  async updateLdapAttribute(id: number, attribute: Partial<LdapAttribute>): Promise<LdapAttribute | undefined> {
    debug(`Updating LDAP attribute ${id}: ${JSON.stringify(attribute)}`);
    
    // Get the attribute first to get connectionId and objectClass for cache invalidation
    const existingAttribute = await this.getLdapAttribute(id);
    if (!existingAttribute) {
      return undefined;
    }
    
    const result = await db.update(ldapAttributes)
      .set({
        ...attribute,
        updatedAt: new Date()
      })
      .where(eq(ldapAttributes.id, id))
      .returning();
    
    // Invalidate cache for the specific connection and object class
    await invalidateCache(`ldapAttributes:${existingAttribute.connectionId}:${existingAttribute.objectClass}`);
    
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getLdapAttribute(id: number): Promise<LdapAttribute | undefined> {
    const result = await db.select().from(ldapAttributes).where(eq(ldapAttributes.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async deleteLdapAttribute(id: number): Promise<boolean> {
    debug(`Deleting LDAP attribute ${id}`);
    
    // Get the attribute first to get connectionId and objectClass for cache invalidation
    const existingAttribute = await this.getLdapAttribute(id);
    if (!existingAttribute) {
      return false;
    }
    
    const result = await db.delete(ldapAttributes)
      .where(eq(ldapAttributes.id, id))
      .returning({ id: ldapAttributes.id });
    
    // Invalidate cache for the specific connection and object class
    if (result.length > 0) {
      await invalidateCache(`ldapAttributes:${existingAttribute.connectionId}:${existingAttribute.objectClass}`);
      return true;
    }
    
    return false;
  }
  
  async getLdapFilter(id: number): Promise<LdapFilter | undefined> {
    debug(`Getting LDAP filter ${id}`);
    const result = await db.select().from(ldapFilters).where(eq(ldapFilters.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async createLdapFilter(filter: InsertLdapFilter): Promise<LdapFilter> {
    debug(`Creating LDAP filter: ${JSON.stringify(filter)}`);
    
    // Create the filter
    const newFilter = await db.insert(ldapFilters).values({
      ...filter,
      currentVersion: 1,
      modifiedAt: new Date(),
    }).returning();
    
    // Also create the initial revision
    await this.createLdapFilterRevision({
      filterId: newFilter[0].id,
      version: 1,
      filter: filter.filter,
      ldapFilter: filter.ldapFilter,
      createdBy: filter.createdBy,
      comment: "Initial version"
    });
    
    // Invalidate the list cache
    await invalidateCache(`ldapFilters:${filter.connectionId}`);
    
    return newFilter[0];
  }
  
  async updateLdapFilter(id: number, filter: Partial<LdapFilter>): Promise<LdapFilter | undefined> {
    debug(`Updating LDAP filter ${id}: ${JSON.stringify(filter)}`);
    
    // Get the current filter
    const currentFilter = await this.getLdapFilter(id);
    if (!currentFilter) {
      return undefined;
    }
    
    // If the filter structure or LDAP filter is changing, increment the version
    const currentVersion = currentFilter.currentVersion || 1;
    const newVersion = (filter.filter || filter.ldapFilter) 
      ? currentVersion + 1 
      : currentVersion;
    
    // Update the filter
    const result = await db.update(ldapFilters)
      .set({
        ...filter,
        currentVersion: newVersion,
        modifiedAt: new Date()
      })
      .where(eq(ldapFilters.id, id))
      .returning();
    
    // If version incremented, create a new revision
    if (newVersion > (currentFilter.currentVersion || 0) && filter.filter && filter.ldapFilter) {
      await this.createLdapFilterRevision({
        filterId: id,
        version: newVersion,
        filter: filter.filter,
        ldapFilter: filter.ldapFilter,
        createdBy: filter.modifiedBy,
        comment: `Version ${newVersion}`
      });
    }
    
    // Invalidate the cache
    await invalidateCache(`ldapFilters:${currentFilter.connectionId}`);
    await invalidateCache(`ldapFilter:${id}`);
    
    return result.length > 0 ? result[0] : undefined;
  }
  
  async deleteLdapFilter(id: number): Promise<boolean> {
    debug(`Deleting LDAP filter ${id}`);
    
    // Get the filter first for connection ID
    const filter = await this.getLdapFilter(id);
    if (!filter) {
      return false;
    }
    
    // Delete the filter (related revisions will be cascade deleted)
    const result = await db.delete(ldapFilters)
      .where(eq(ldapFilters.id, id))
      .returning({ id: ldapFilters.id });
    
    // Invalidate the cache
    if (result.length > 0) {
      await invalidateCache(`ldapFilters:${filter.connectionId}`);
      await invalidateCache(`ldapFilter:${id}`);
      await invalidateCache(`ldapFilterRevisions:${id}`);
      return true;
    }
    
    return false;
  }
  
  async listLdapFilters(connectionId: number): Promise<LdapFilter[]> {
    const cacheKey = `ldapFilters:${connectionId}`;
    
    // Try to get from cache first
    const cachedData = await getCached<LdapFilter[]>(cacheKey);
    if (cachedData) {
      debug(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    const filters = await db.select()
      .from(ldapFilters)
      .where(eq(ldapFilters.connectionId, connectionId));
    
    // Cache the result
    await setCached(cacheKey, filters, CACHE_TTL.MEDIUM);
    return filters;
  }
  
  async getLdapFilterRevisions(filterId: number): Promise<LdapFilterRevision[]> {
    const cacheKey = `ldapFilterRevisions:${filterId}`;
    
    // Try to get from cache first
    const cachedData = await getCached<LdapFilterRevision[]>(cacheKey);
    if (cachedData) {
      debug(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    const revisions = await db.select()
      .from(ldapFilterRevisions)
      .where(eq(ldapFilterRevisions.filterId, filterId))
      .orderBy(ldapFilterRevisions.version);
    
    // Cache the result
    await setCached(cacheKey, revisions, CACHE_TTL.MEDIUM);
    return revisions;
  }
  
  async getLdapFilterRevision(id: number): Promise<LdapFilterRevision | undefined> {
    debug(`Getting LDAP filter revision ${id}`);
    const result = await db.select().from(ldapFilterRevisions).where(eq(ldapFilterRevisions.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async createLdapFilterRevision(revision: InsertLdapFilterRevision): Promise<LdapFilterRevision> {
    debug(`Creating LDAP filter revision: ${JSON.stringify(revision)}`);
    const result = await db.insert(ldapFilterRevisions)
      .values({
        ...revision,
        createdAt: new Date()
      })
      .returning();
    
    // Invalidate cache for the revisions list
    await invalidateCache(`ldapFilterRevisions:${revision.filterId}`);
    
    return result[0];
  }
  
  async revertLdapFilterToRevision(filterId: number, revisionId: number): Promise<LdapFilter | undefined> {
    debug(`Reverting LDAP filter ${filterId} to revision ${revisionId}`);
    
    // Get the current filter
    const filter = await this.getLdapFilter(filterId);
    if (!filter) {
      return undefined;
    }
    
    // Get the target revision
    const revision = await this.getLdapFilterRevision(revisionId);
    if (!revision || revision.filterId !== filterId) {
      return undefined;
    }
    
    // Create a new revision with the next version number
    const currentVersion = filter.currentVersion || 1;
    const newVersion = currentVersion + 1;
    
    // Update the filter with the revision data
    const result = await db.update(ldapFilters)
      .set({
        filter: revision.filter as any,
        ldapFilter: revision.ldapFilter,
        currentVersion: newVersion,
        modifiedAt: new Date()
      })
      .where(eq(ldapFilters.id, filterId))
      .returning();
    
    // Create a new revision record
    await this.createLdapFilterRevision({
      filterId,
      version: newVersion,
      filter: revision.filter as any,
      ldapFilter: revision.ldapFilter,
      createdBy: filter.modifiedBy,
      comment: `Reverted to revision ${revision.version}`
    });
    
    // Invalidate caches
    await invalidateCache(`ldapFilters:${filter.connectionId}`);
    await invalidateCache(`ldapFilter:${filterId}`);
    
    return result.length > 0 ? result[0] : undefined;
  }
  
  async testLdapFilter(connectionId: number, ldapFilter: string, objectClass: string): Promise<any[]> {
    debug(`Testing LDAP filter for connection ${connectionId}, object class ${objectClass}: ${ldapFilter}`);
    
    // This is a placeholder. In a real implementation, this would connect to the LDAP server
    // and execute the query. For now, we'll simulate it using our existing data.
    
    let results: any[] = [];
    
    switch (objectClass) {
      case 'user':
        results = await this.listAdUsers(connectionId);
        break;
      case 'group':
        results = await this.listAdGroups(connectionId);
        break;
      case 'organizationalUnit':
        results = await this.listAdOrgUnits(connectionId);
        break;
      case 'computer':
        results = await this.listAdComputers(connectionId);
        break;
      case 'domain':
        results = await this.listAdDomains(connectionId);
        break;
      default:
        throw new Error(`Unsupported object class: ${objectClass}`);
    }
    
    // In a real implementation, we'd use the ldapFilter to filter the results
    // Here we're just returning all items since we don't have a LDAP filter parser
    
    // Adding log of the test
    debug(`LDAP filter test returned ${results.length} results`);
    
    return results;
  }

  // AD Users
  async getAdUser(id: number): Promise<AdUser | undefined> {
    const result = await db.select().from(adUsers).where(eq(adUsers.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getAdUserByObjectGUID(connectionId: number, objectGUID: string): Promise<AdUser | undefined> {
    const result = await db.select()
      .from(adUsers)
      .where(
        and(
          eq(adUsers.connectionId, connectionId),
          eq(adUsers.objectGUID, objectGUID)
        )
      );
    return result.length > 0 ? result[0] : undefined;
  }

  async createAdUser(user: InsertAdUser): Promise<AdUser> {
    const result = await db.insert(adUsers).values(user).returning();
    return result[0];
  }

  async updateAdUser(id: number, userData: Partial<AdUser>): Promise<AdUser | undefined> {
    const result = await db.update(adUsers).set(userData).where(eq(adUsers.id, id)).returning();
    return result.length > 0 ? result[0] : undefined;
  }
  
  async updateAdUserByObjectGUID(connectionId: number, objectGUID: string, userData: Partial<AdUser>): Promise<AdUser | undefined> {
    const result = await db.update(adUsers)
      .set(userData)
      .where(
        and(
          eq(adUsers.connectionId, connectionId),
          eq(adUsers.objectGUID, objectGUID)
        )
      )
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteAdUser(id: number): Promise<boolean> {
    const result = await db.delete(adUsers).where(eq(adUsers.id, id)).returning({ id: adUsers.id });
    return result.length > 0;
  }

  async listAdUsers(connectionId: number, query?: ApiQuery): Promise<AdUser[]> {
    const cacheKey = `adUsers:${connectionId}:${JSON.stringify(query || {})}`;
    
    // Try to get from cache first
    const cachedData = await getCached<AdUser[]>(cacheKey);
    if (cachedData) {
      debug(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    let baseQuery = db.select().from(adUsers)
      .where(eq(adUsers.connectionId, connectionId));
    
    if (query) {
      // Apply advanced filtering using the query parser
      const { whereClause, orderClauses, limit, offset, selectedFields } = 
        applyQueryOptions(adUsers, query);
      
      // Apply where conditions if any
      if (whereClause) {
        baseQuery = baseQuery.where(whereClause as any);
      }
      
      // Apply ordering if any
      if (orderClauses && orderClauses.length > 0) {
        baseQuery = baseQuery.orderBy(...(orderClauses as any[]));
      }
      
      // Apply pagination if specified
      if (limit !== undefined) {
        baseQuery = baseQuery.limit(limit);
      }
      
      if (offset !== undefined) {
        baseQuery = baseQuery.offset(offset);
      }
      
      // Execute the query
      const users = await baseQuery;
      
      // Handle field selection if specified
      if (selectedFields && selectedFields.length > 0) {
        const result = users.map(user => {
          const filtered: Partial<AdUser> = { id: user.id };
          selectedFields.forEach(field => {
            if (field in user) {
              filtered[field as keyof AdUser] = user[field as keyof AdUser];
            }
          });
          return filtered as AdUser;
        });
        
        // Cache the result
        await setCached(cacheKey, result, CACHE_TTL.MEDIUM);
        return result;
      }
      
      // Cache the result
      await setCached(cacheKey, users, CACHE_TTL.MEDIUM);
      return users;
    }
    
    // No query params, just return all results
    const users = await baseQuery;
    await setCached(cacheKey, users, CACHE_TTL.MEDIUM);
    return users;
  }

  // AD Groups
  async getAdGroup(id: number): Promise<AdGroup | undefined> {
    const result = await db.select().from(adGroups).where(eq(adGroups.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getAdGroupByObjectGUID(connectionId: number, objectGUID: string): Promise<AdGroup | undefined> {
    const result = await db.select()
      .from(adGroups)
      .where(
        and(
          eq(adGroups.connectionId, connectionId),
          eq(adGroups.objectGUID, objectGUID)
        )
      );
    return result.length > 0 ? result[0] : undefined;
  }

  async createAdGroup(group: InsertAdGroup): Promise<AdGroup> {
    const result = await db.insert(adGroups).values(group).returning();
    return result[0];
  }

  async updateAdGroup(id: number, groupData: Partial<AdGroup>): Promise<AdGroup | undefined> {
    const result = await db.update(adGroups).set(groupData).where(eq(adGroups.id, id)).returning();
    return result.length > 0 ? result[0] : undefined;
  }
  
  async updateAdGroupByObjectGUID(connectionId: number, objectGUID: string, groupData: Partial<AdGroup>): Promise<AdGroup | undefined> {
    const result = await db.update(adGroups)
      .set(groupData)
      .where(
        and(
          eq(adGroups.connectionId, connectionId),
          eq(adGroups.objectGUID, objectGUID)
        )
      )
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteAdGroup(id: number): Promise<boolean> {
    const result = await db.delete(adGroups).where(eq(adGroups.id, id)).returning({ id: adGroups.id });
    return result.length > 0;
  }

  async listAdGroups(connectionId: number, query?: ApiQuery): Promise<AdGroup[]> {
    const cacheKey = `adGroups:${connectionId}:${JSON.stringify(query || {})}`;
    
    // Try to get from cache first
    const cachedData = await getCached<AdGroup[]>(cacheKey);
    if (cachedData) {
      debug(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    let baseQuery = db.select().from(adGroups)
      .where(eq(adGroups.connectionId, connectionId));
    
    if (query) {
      // Apply advanced filtering using the query parser
      const { whereClause, orderClauses, limit, offset, selectedFields } = 
        applyQueryOptions(adGroups, query);
      
      // Apply where conditions if any
      if (whereClause) {
        baseQuery = baseQuery.where(whereClause as any);
      }
      
      // Apply ordering if any
      if (orderClauses && orderClauses.length > 0) {
        baseQuery = baseQuery.orderBy(...(orderClauses as any[]));
      }
      
      // Apply pagination if specified
      if (limit !== undefined) {
        baseQuery = baseQuery.limit(limit);
      }
      
      if (offset !== undefined) {
        baseQuery = baseQuery.offset(offset);
      }
      
      // Execute the query
      const groups = await baseQuery;
      
      // Handle field selection if specified
      if (selectedFields && selectedFields.length > 0) {
        const result = groups.map(group => {
          const filtered: Partial<AdGroup> = { id: group.id };
          selectedFields.forEach(field => {
            if (field in group) {
              filtered[field as keyof AdGroup] = group[field as keyof AdGroup];
            }
          });
          return filtered as AdGroup;
        });
        
        // Cache the result
        await setCached(cacheKey, result, CACHE_TTL.MEDIUM);
        return result;
      }
      
      // Cache the result
      await setCached(cacheKey, groups, CACHE_TTL.MEDIUM);
      return groups;
    }
    
    // No query params, just return all results
    const groups = await baseQuery;
    await setCached(cacheKey, groups, CACHE_TTL.MEDIUM);
    return groups;
  }

  // AD Organizational Units
  async getAdOrgUnit(id: number): Promise<AdOrgUnit | undefined> {
    const result = await db.select().from(adOrgUnits).where(eq(adOrgUnits.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getAdOrgUnitByObjectGUID(connectionId: number, objectGUID: string): Promise<AdOrgUnit | undefined> {
    const result = await db.select()
      .from(adOrgUnits)
      .where(
        and(
          eq(adOrgUnits.connectionId, connectionId),
          eq(adOrgUnits.objectGUID, objectGUID)
        )
      );
    return result.length > 0 ? result[0] : undefined;
  }

  async createAdOrgUnit(ou: InsertAdOrgUnit): Promise<AdOrgUnit> {
    const result = await db.insert(adOrgUnits).values(ou).returning();
    return result[0];
  }

  async updateAdOrgUnit(id: number, ouData: Partial<AdOrgUnit>): Promise<AdOrgUnit | undefined> {
    const result = await db.update(adOrgUnits).set(ouData).where(eq(adOrgUnits.id, id)).returning();
    return result.length > 0 ? result[0] : undefined;
  }
  
  async updateAdOrgUnitByObjectGUID(connectionId: number, objectGUID: string, ouData: Partial<AdOrgUnit>): Promise<AdOrgUnit | undefined> {
    const result = await db.update(adOrgUnits)
      .set(ouData)
      .where(
        and(
          eq(adOrgUnits.connectionId, connectionId),
          eq(adOrgUnits.objectGUID, objectGUID)
        )
      )
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteAdOrgUnit(id: number): Promise<boolean> {
    const result = await db.delete(adOrgUnits).where(eq(adOrgUnits.id, id)).returning({ id: adOrgUnits.id });
    return result.length > 0;
  }

  async listAdOrgUnits(connectionId: number, query?: any): Promise<AdOrgUnit[]> {
    let adOrgUnitsQuery = db.select().from(adOrgUnits).where(eq(adOrgUnits.connectionId, connectionId));
    
    // Handle filtering logic (similar to listAdUsers)
    if (query && query.select) {
      const orgUnits = await adOrgUnitsQuery;
      const properties = query.select.split(',');
      
      return orgUnits.map(ou => {
        const result: any = { id: ou.id };
        properties.forEach((prop: string) => {
          if ((ou as any)[prop] !== undefined) {
            result[prop] = (ou as any)[prop];
          }
        });
        return result as AdOrgUnit;
      });
    }
    
    return adOrgUnitsQuery;
  }

  // AD Computers
  async getAdComputer(id: number): Promise<AdComputer | undefined> {
    const result = await db.select().from(adComputers).where(eq(adComputers.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getAdComputerByObjectGUID(connectionId: number, objectGUID: string): Promise<AdComputer | undefined> {
    const result = await db.select()
      .from(adComputers)
      .where(
        and(
          eq(adComputers.connectionId, connectionId),
          eq(adComputers.objectGUID, objectGUID)
        )
      );
    return result.length > 0 ? result[0] : undefined;
  }

  async createAdComputer(computer: InsertAdComputer): Promise<AdComputer> {
    const result = await db.insert(adComputers).values(computer).returning();
    return result[0];
  }

  async updateAdComputer(id: number, computerData: Partial<AdComputer>): Promise<AdComputer | undefined> {
    const result = await db.update(adComputers).set(computerData).where(eq(adComputers.id, id)).returning();
    return result.length > 0 ? result[0] : undefined;
  }
  
  async updateAdComputerByObjectGUID(connectionId: number, objectGUID: string, computerData: Partial<AdComputer>): Promise<AdComputer | undefined> {
    const result = await db.update(adComputers)
      .set(computerData)
      .where(
        and(
          eq(adComputers.connectionId, connectionId),
          eq(adComputers.objectGUID, objectGUID)
        )
      )
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteAdComputer(id: number): Promise<boolean> {
    const result = await db.delete(adComputers).where(eq(adComputers.id, id)).returning({ id: adComputers.id });
    return result.length > 0;
  }

  async listAdComputers(connectionId: number, query?: any): Promise<AdComputer[]> {
    let adComputersQuery = db.select().from(adComputers).where(eq(adComputers.connectionId, connectionId));
    
    // Handle filtering logic (similar to listAdUsers)
    if (query && query.select) {
      const computers = await adComputersQuery;
      const properties = query.select.split(',');
      
      return computers.map(computer => {
        const result: any = { id: computer.id };
        properties.forEach((prop: string) => {
          if ((computer as any)[prop] !== undefined) {
            result[prop] = (computer as any)[prop];
          }
        });
        return result as AdComputer;
      });
    }
    
    return adComputersQuery;
  }

  // AD Domains
  async getAdDomain(id: number): Promise<AdDomain | undefined> {
    const result = await db.select().from(adDomains).where(eq(adDomains.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async createAdDomain(domain: InsertAdDomain): Promise<AdDomain> {
    const result = await db.insert(adDomains).values(domain).returning();
    return result[0];
  }

  async updateAdDomain(id: number, domainData: Partial<AdDomain>): Promise<AdDomain | undefined> {
    const result = await db.update(adDomains).set(domainData).where(eq(adDomains.id, id)).returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteAdDomain(id: number): Promise<boolean> {
    const result = await db.delete(adDomains).where(eq(adDomains.id, id)).returning({ id: adDomains.id });
    return result.length > 0;
  }

  async listAdDomains(connectionId: number, query?: any): Promise<AdDomain[]> {
    let adDomainsQuery = db.select().from(adDomains).where(eq(adDomains.connectionId, connectionId));
    
    // Handle filtering logic (similar to listAdUsers)
    if (query && query.select) {
      const domains = await adDomainsQuery;
      const properties = query.select.split(',');
      
      return domains.map(domain => {
        const result: any = { id: domain.id };
        properties.forEach((prop: string) => {
          if ((domain as any)[prop] !== undefined) {
            result[prop] = (domain as any)[prop];
          }
        });
        return result as AdDomain;
      });
    }
    
    return adDomainsQuery;
  }
  
  // Audit logging
  async createAuditLogEntry(entry: InsertAuditLog): Promise<AuditLog> {
    debug(`Creating audit log entry: ${JSON.stringify(entry)}`);
    const result = await db.insert(auditLogs).values({
      ...entry,
      timestamp: new Date() // Ensure timestamp is set
    }).returning();
    return result[0];
  }
  
  async getAuditLogs(connectionId?: number, userId?: number, page: number = 1, pageSize: number = 10): Promise<{ data: AuditLog[], metadata: { currentPage: number, totalPages: number, totalRecords: number, nextPage: number | null, prevPage: number | null } }> {
    debug(`Getting audit logs: connectionId=${connectionId}, userId=${userId}, page=${page}, pageSize=${pageSize}`);
    
    // Define the base query for counting total records
    let countQuery = db.select({ count: sql`count(*)::int` }).from(auditLogs);
    let dataQuery = db.select().from(auditLogs);
    
    // Apply filters if provided
    if (connectionId !== undefined && userId !== undefined) {
      const filter = and(
        eq(auditLogs.connectionId, connectionId),
        eq(auditLogs.userId, userId)
      );
      countQuery = countQuery.where(filter);
      dataQuery = dataQuery.where(filter);
    } else if (connectionId !== undefined) {
      const filter = eq(auditLogs.connectionId, connectionId);
      countQuery = countQuery.where(filter);
      dataQuery = dataQuery.where(filter);
    } else if (userId !== undefined) {
      const filter = eq(auditLogs.userId, userId);
      countQuery = countQuery.where(filter);
      dataQuery = dataQuery.where(filter);
    }
    
    // Get total count of records
    const countResult = await countQuery;
    const totalRecords = typeof countResult[0].count === 'number' 
      ? countResult[0].count 
      : parseInt(String(countResult[0].count), 10);
    
    // Calculate pagination values
    const totalPages = Math.ceil(totalRecords / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages)); // Ensure page is within bounds
    const offset = (currentPage - 1) * pageSize;
    
    // Apply pagination and sorting to data query
    dataQuery = dataQuery
      .orderBy(desc(auditLogs.timestamp))
      .limit(pageSize)
      .offset(offset);
    
    // Execute data query
    const data = await dataQuery;
    
    // Create pagination metadata
    const metadata = {
      currentPage,
      totalPages,
      totalRecords,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      prevPage: currentPage > 1 ? currentPage - 1 : null
    };
    
    return { data, metadata };
  }
}

export const storage = new DatabaseStorage();
