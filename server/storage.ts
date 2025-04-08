import { 
  User, InsertUser, ApiToken, InsertApiToken, 
  LdapConnection, InsertLdapConnection, 
  AdUser, InsertAdUser, AdGroup, InsertAdGroup, 
  AdOrgUnit, InsertAdOrgUnit, AdComputer, InsertAdComputer, 
  AdDomain, InsertAdDomain, Role, ApiQuery,
  LdapQuery, InsertLdapQuery, LdapQueryVersion, InsertLdapQueryVersion,
  users, apiTokens, ldapConnections, adUsers, adGroups, adOrgUnits, adComputers, adDomains,
  roles, ldapQueries, ldapQueryVersions
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import crypto from "crypto";
import { db } from "./db";
import { eq, and, type SQL } from "drizzle-orm";
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
  getLdapQuery(id: number): Promise<LdapQuery | undefined>;
  getLdapQueries(): Promise<LdapQuery[]>;
  createLdapQuery(query: InsertLdapQuery): Promise<LdapQuery>;
  updateLdapQuery(id: number, query: Partial<LdapQuery>): Promise<LdapQuery | undefined>;
  deleteLdapQuery(id: number): Promise<boolean>;
  getLdapQueryVersions(queryId: number): Promise<LdapQueryVersion[]>;
  createLdapQueryVersion(version: InsertLdapQueryVersion): Promise<LdapQueryVersion>;

  // AD Users
  getAdUser(id: number): Promise<AdUser | undefined>;
  createAdUser(user: InsertAdUser): Promise<AdUser>;
  updateAdUser(id: number, user: Partial<AdUser>): Promise<AdUser | undefined>;
  deleteAdUser(id: number): Promise<boolean>;
  listAdUsers(connectionId: number, query?: any): Promise<AdUser[]>;

  // AD Groups
  getAdGroup(id: number): Promise<AdGroup | undefined>;
  createAdGroup(group: InsertAdGroup): Promise<AdGroup>;
  updateAdGroup(id: number, group: Partial<AdGroup>): Promise<AdGroup | undefined>;
  deleteAdGroup(id: number): Promise<boolean>;
  listAdGroups(connectionId: number, query?: any): Promise<AdGroup[]>;

  // AD Organizational Units
  getAdOrgUnit(id: number): Promise<AdOrgUnit | undefined>;
  createAdOrgUnit(ou: InsertAdOrgUnit): Promise<AdOrgUnit>;
  updateAdOrgUnit(id: number, ou: Partial<AdOrgUnit>): Promise<AdOrgUnit | undefined>;
  deleteAdOrgUnit(id: number): Promise<boolean>;
  listAdOrgUnits(connectionId: number, query?: any): Promise<AdOrgUnit[]>;

  // AD Computers
  getAdComputer(id: number): Promise<AdComputer | undefined>;
  createAdComputer(computer: InsertAdComputer): Promise<AdComputer>;
  updateAdComputer(id: number, computer: Partial<AdComputer>): Promise<AdComputer | undefined>;
  deleteAdComputer(id: number): Promise<boolean>;
  listAdComputers(connectionId: number, query?: any): Promise<AdComputer[]>;

  // AD Domains
  getAdDomain(id: number): Promise<AdDomain | undefined>;
  createAdDomain(domain: InsertAdDomain): Promise<AdDomain>;
  updateAdDomain(id: number, domain: Partial<AdDomain>): Promise<AdDomain | undefined>;
  deleteAdDomain(id: number): Promise<boolean>;
  listAdDomains(connectionId: number, query?: any): Promise<AdDomain[]>;

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

  // LDAP Query Builder
  async getLdapQuery(id: number): Promise<LdapQuery | undefined> {
    const cacheKey = `ldapQuery:${id}`;
    
    // Try to get from cache first
    const cachedData = await getCached<LdapQuery>(cacheKey);
    if (cachedData) {
      debug(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    const result = await db.select().from(ldapQueries).where(eq(ldapQueries.id, id));
    
    if (result.length > 0) {
      // Cache the query for faster access
      await setCached(cacheKey, result[0], CACHE_TTL.MEDIUM);
      return result[0];
    }
    
    return undefined;
  }

  async getLdapQueries(): Promise<LdapQuery[]> {
    const cacheKey = 'ldapQueries:all';
    
    // Try to get from cache first
    const cachedData = await getCached<LdapQuery[]>(cacheKey);
    if (cachedData) {
      debug(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    const queries = await db.select().from(ldapQueries);
    
    // Cache the results
    await setCached(cacheKey, queries, CACHE_TTL.MEDIUM);
    return queries;
  }

  async createLdapQuery(query: InsertLdapQuery): Promise<LdapQuery> {
    // Create the query
    const result = await db.insert(ldapQueries).values({
      name: query.name,
      description: query.description,
      targetObject: query.targetObject,
      filterJson: query.filterJson,
      ldapFilter: query.ldapFilter,
      readableFilter: query.readableFilter,
      createdBy: query.createdBy,
      modifiedBy: query.createdBy // Initially, creator and modifier are the same
    }).returning();
    
    // Invalidate relevant caches
    invalidateCache('ldapQueries:all');
    
    return result[0];
  }

  async updateLdapQuery(id: number, queryData: Partial<LdapQuery>): Promise<LdapQuery | undefined> {
    // Update the query
    const result = await db.update(ldapQueries)
      .set({
        ...queryData,
        updatedAt: new Date()
      })
      .where(eq(ldapQueries.id, id))
      .returning();
    
    if (result.length > 0) {
      // Invalidate relevant caches
      invalidateCache(`ldapQuery:${id}`);
      invalidateCache('ldapQueries:all');
      
      return result[0];
    }
    
    return undefined;
  }

  async deleteLdapQuery(id: number): Promise<boolean> {
    // Delete the query (versions will be deleted via cascade)
    const result = await db.delete(ldapQueries)
      .where(eq(ldapQueries.id, id))
      .returning({ id: ldapQueries.id });
    
    const deleted = result.length > 0;
    
    if (deleted) {
      // Invalidate relevant caches
      invalidateCache(`ldapQuery:${id}`);
      invalidateCachePattern(`ldapQueryVersions:${id}:*`);
      invalidateCache('ldapQueries:all');
    }
    
    return deleted;
  }

  async getLdapQueryVersions(queryId: number): Promise<LdapQueryVersion[]> {
    const cacheKey = `ldapQueryVersions:${queryId}:all`;
    
    // Try to get from cache first
    const cachedData = await getCached<LdapQueryVersion[]>(cacheKey);
    if (cachedData) {
      debug(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    const versions = await db.select()
      .from(ldapQueryVersions)
      .where(eq(ldapQueryVersions.queryId, queryId))
      .orderBy(ldapQueryVersions.version);
    
    // Cache the results
    await setCached(cacheKey, versions, CACHE_TTL.MEDIUM);
    
    return versions;
  }

  async createLdapQueryVersion(version: InsertLdapQueryVersion): Promise<LdapQueryVersion> {
    const result = await db.insert(ldapQueryVersions).values({
      queryId: version.queryId,
      version: version.version,
      filterJson: version.filterJson,
      ldapFilter: version.ldapFilter,
      readableFilter: version.readableFilter,
      targetObject: version.targetObject,
      createdBy: version.createdBy,
      modifiedBy: version.modifiedBy
    }).returning();
    
    // Invalidate relevant caches
    invalidateCachePattern(`ldapQueryVersions:${version.queryId}:*`);
    
    return result[0];
  }

  // AD Users
  async getAdUser(id: number): Promise<AdUser | undefined> {
    const result = await db.select().from(adUsers).where(eq(adUsers.id, id));
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
        baseQuery = baseQuery.where(whereClause);
      }
      
      // Apply ordering if any
      if (orderClauses.length > 0) {
        baseQuery = baseQuery.orderBy(...orderClauses);
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
      if (selectedFields.length > 0) {
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

  async createAdGroup(group: InsertAdGroup): Promise<AdGroup> {
    const result = await db.insert(adGroups).values(group).returning();
    return result[0];
  }

  async updateAdGroup(id: number, groupData: Partial<AdGroup>): Promise<AdGroup | undefined> {
    const result = await db.update(adGroups).set(groupData).where(eq(adGroups.id, id)).returning();
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
        baseQuery = baseQuery.where(whereClause);
      }
      
      // Apply ordering if any
      if (orderClauses.length > 0) {
        baseQuery = baseQuery.orderBy(...orderClauses);
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
      if (selectedFields.length > 0) {
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

  async createAdOrgUnit(ou: InsertAdOrgUnit): Promise<AdOrgUnit> {
    const result = await db.insert(adOrgUnits).values(ou).returning();
    return result[0];
  }

  async updateAdOrgUnit(id: number, ouData: Partial<AdOrgUnit>): Promise<AdOrgUnit | undefined> {
    const result = await db.update(adOrgUnits).set(ouData).where(eq(adOrgUnits.id, id)).returning();
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

  async createAdComputer(computer: InsertAdComputer): Promise<AdComputer> {
    const result = await db.insert(adComputers).values(computer).returning();
    return result[0];
  }

  async updateAdComputer(id: number, computerData: Partial<AdComputer>): Promise<AdComputer | undefined> {
    const result = await db.update(adComputers).set(computerData).where(eq(adComputers.id, id)).returning();
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
}

export const storage = new DatabaseStorage();
