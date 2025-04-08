import { 
  User, InsertUser, ApiToken, InsertApiToken, 
  LdapConnection, InsertLdapConnection, 
  AdUser, InsertAdUser, AdGroup, InsertAdGroup, 
  AdOrgUnit, InsertAdOrgUnit, AdComputer, InsertAdComputer, 
  AdDomain, InsertAdDomain,
  users, apiTokens, ldapConnections, adUsers, adGroups, adOrgUnits, adComputers, adDomains
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import crypto from "crypto";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";

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

  async listAdUsers(connectionId: number, query?: any): Promise<AdUser[]> {
    let adUsersQuery = db.select().from(adUsers).where(eq(adUsers.connectionId, connectionId));
    
    // Handle filtering logic
    if (query && query.select) {
      // Note: This is a simplified implementation
      // For production, you would need a more robust property selection mechanism
      const users = await adUsersQuery;
      const properties = query.select.split(',');
      
      return users.map(user => {
        const result: any = { id: user.id };
        properties.forEach(prop => {
          if ((user as any)[prop] !== undefined) {
            result[prop] = (user as any)[prop];
          }
        });
        return result as AdUser;
      });
    }
    
    return adUsersQuery;
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

  async listAdGroups(connectionId: number, query?: any): Promise<AdGroup[]> {
    let adGroupsQuery = db.select().from(adGroups).where(eq(adGroups.connectionId, connectionId));
    
    // Handle filtering logic (similar to listAdUsers)
    if (query && query.select) {
      const groups = await adGroupsQuery;
      const properties = query.select.split(',');
      
      return groups.map(group => {
        const result: any = { id: group.id };
        properties.forEach(prop => {
          if ((group as any)[prop] !== undefined) {
            result[prop] = (group as any)[prop];
          }
        });
        return result as AdGroup;
      });
    }
    
    return adGroupsQuery;
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
        properties.forEach(prop => {
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
        properties.forEach(prop => {
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
        properties.forEach(prop => {
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
