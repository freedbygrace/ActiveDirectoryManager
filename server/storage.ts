import { 
  User, InsertUser, ApiToken, InsertApiToken, 
  LdapConnection, InsertLdapConnection, 
  AdUser, InsertAdUser, AdGroup, InsertAdGroup, 
  AdOrgUnit, InsertAdOrgUnit, AdComputer, InsertAdComputer, 
  AdDomain, InsertAdDomain 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import crypto from "crypto";

// Memory store for sessions
const MemoryStore = createMemoryStore(session);

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
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private apiTokens: Map<number, ApiToken>;
  private ldapConnections: Map<number, LdapConnection>;
  private adUsers: Map<number, AdUser>;
  private adGroups: Map<number, AdGroup>;
  private adOrgUnits: Map<number, AdOrgUnit>;
  private adComputers: Map<number, AdComputer>;
  private adDomains: Map<number, AdDomain>;
  sessionStore: session.SessionStore;
  
  private userCurrentId: number;
  private tokenCurrentId: number;
  private connectionCurrentId: number;
  private adUserCurrentId: number;
  private adGroupCurrentId: number;
  private adOrgUnitCurrentId: number;
  private adComputerCurrentId: number;
  private adDomainCurrentId: number;

  constructor() {
    this.users = new Map();
    this.apiTokens = new Map();
    this.ldapConnections = new Map();
    this.adUsers = new Map();
    this.adGroups = new Map();
    this.adOrgUnits = new Map();
    this.adComputers = new Map();
    this.adDomains = new Map();
    
    this.userCurrentId = 1;
    this.tokenCurrentId = 1;
    this.connectionCurrentId = 1;
    this.adUserCurrentId = 1;
    this.adGroupCurrentId = 1;
    this.adOrgUnitCurrentId = 1;
    this.adComputerCurrentId = 1;
    this.adDomainCurrentId = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24h
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now,
      role: insertUser.role || "user"
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // API Token management
  async getApiToken(id: number): Promise<ApiToken | undefined> {
    return this.apiTokens.get(id);
  }

  async getApiTokenByToken(token: string): Promise<ApiToken | undefined> {
    return Array.from(this.apiTokens.values()).find(
      (apiToken) => apiToken.token === token,
    );
  }

  async createApiToken(insertToken: InsertApiToken): Promise<ApiToken> {
    const id = this.tokenCurrentId++;
    const now = new Date();
    const token: ApiToken = { ...insertToken, id, createdAt: now };
    this.apiTokens.set(id, token);
    return token;
  }

  async deleteApiToken(id: number): Promise<boolean> {
    return this.apiTokens.delete(id);
  }

  async listApiTokensByUserId(userId: number): Promise<ApiToken[]> {
    return Array.from(this.apiTokens.values()).filter(
      (token) => token.userId === userId,
    );
  }

  // LDAP Connection management
  async getLdapConnection(id: number): Promise<LdapConnection | undefined> {
    return this.ldapConnections.get(id);
  }

  async createLdapConnection(insertConnection: InsertLdapConnection): Promise<LdapConnection> {
    const id = this.connectionCurrentId++;
    const now = new Date();
    const connection: LdapConnection = { 
      ...insertConnection, 
      id, 
      createdAt: now,
      lastConnected: null,
      status: "disconnected"
    };
    this.ldapConnections.set(id, connection);
    return connection;
  }

  async updateLdapConnection(id: number, connectionData: Partial<LdapConnection>): Promise<LdapConnection | undefined> {
    const connection = await this.getLdapConnection(id);
    if (!connection) return undefined;
    
    const updatedConnection = { ...connection, ...connectionData };
    this.ldapConnections.set(id, updatedConnection);
    return updatedConnection;
  }

  async deleteLdapConnection(id: number): Promise<boolean> {
    return this.ldapConnections.delete(id);
  }

  async listLdapConnections(): Promise<LdapConnection[]> {
    return Array.from(this.ldapConnections.values());
  }

  // AD Users
  async getAdUser(id: number): Promise<AdUser | undefined> {
    return this.adUsers.get(id);
  }

  async createAdUser(user: InsertAdUser): Promise<AdUser> {
    const id = this.adUserCurrentId++;
    const adUser: AdUser = { ...user, id };
    this.adUsers.set(id, adUser);
    return adUser;
  }

  async updateAdUser(id: number, userData: Partial<AdUser>): Promise<AdUser | undefined> {
    const user = await this.getAdUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.adUsers.set(id, updatedUser);
    return updatedUser;
  }

  async deleteAdUser(id: number): Promise<boolean> {
    return this.adUsers.delete(id);
  }

  async listAdUsers(connectionId: number, query?: any): Promise<AdUser[]> {
    let users = Array.from(this.adUsers.values()).filter(
      (user) => user.connectionId === connectionId,
    );
    
    // Apply filtering logic based on query
    if (query) {
      if (query.filter) {
        // Simple filter implementation - can be expanded
        const filterParts = query.filter.split(' ');
        if (filterParts.length === 3) {
          const [property, operator, value] = filterParts;
          const unquotedValue = value.replace(/^'|'$/g, '');
          
          if (operator === 'eq') {
            users = users.filter(user => (user as any)[property] === unquotedValue);
          }
        }
      }
      
      // Apply property selection
      if (query.select) {
        const properties = query.select.split(',');
        users = users.map(user => {
          const result: any = { id: user.id };
          properties.forEach(prop => {
            if ((user as any)[prop] !== undefined) {
              result[prop] = (user as any)[prop];
            }
          });
          return result as AdUser;
        });
      }
    }
    
    return users;
  }

  // AD Groups
  async getAdGroup(id: number): Promise<AdGroup | undefined> {
    return this.adGroups.get(id);
  }

  async createAdGroup(group: InsertAdGroup): Promise<AdGroup> {
    const id = this.adGroupCurrentId++;
    const adGroup: AdGroup = { ...group, id };
    this.adGroups.set(id, adGroup);
    return adGroup;
  }

  async updateAdGroup(id: number, groupData: Partial<AdGroup>): Promise<AdGroup | undefined> {
    const group = await this.getAdGroup(id);
    if (!group) return undefined;
    
    const updatedGroup = { ...group, ...groupData };
    this.adGroups.set(id, updatedGroup);
    return updatedGroup;
  }

  async deleteAdGroup(id: number): Promise<boolean> {
    return this.adGroups.delete(id);
  }

  async listAdGroups(connectionId: number, query?: any): Promise<AdGroup[]> {
    let groups = Array.from(this.adGroups.values()).filter(
      (group) => group.connectionId === connectionId,
    );
    
    // Apply filtering logic
    if (query) {
      if (query.select) {
        const properties = query.select.split(',');
        groups = groups.map(group => {
          const result: any = { id: group.id };
          properties.forEach(prop => {
            if ((group as any)[prop] !== undefined) {
              result[prop] = (group as any)[prop];
            }
          });
          return result as AdGroup;
        });
      }
    }
    
    return groups;
  }

  // AD Organizational Units
  async getAdOrgUnit(id: number): Promise<AdOrgUnit | undefined> {
    return this.adOrgUnits.get(id);
  }

  async createAdOrgUnit(ou: InsertAdOrgUnit): Promise<AdOrgUnit> {
    const id = this.adOrgUnitCurrentId++;
    const adOrgUnit: AdOrgUnit = { ...ou, id };
    this.adOrgUnits.set(id, adOrgUnit);
    return adOrgUnit;
  }

  async updateAdOrgUnit(id: number, ouData: Partial<AdOrgUnit>): Promise<AdOrgUnit | undefined> {
    const ou = await this.getAdOrgUnit(id);
    if (!ou) return undefined;
    
    const updatedOu = { ...ou, ...ouData };
    this.adOrgUnits.set(id, updatedOu);
    return updatedOu;
  }

  async deleteAdOrgUnit(id: number): Promise<boolean> {
    return this.adOrgUnits.delete(id);
  }

  async listAdOrgUnits(connectionId: number, query?: any): Promise<AdOrgUnit[]> {
    let orgUnits = Array.from(this.adOrgUnits.values()).filter(
      (ou) => ou.connectionId === connectionId,
    );
    
    // Apply filtering logic
    if (query) {
      if (query.select) {
        const properties = query.select.split(',');
        orgUnits = orgUnits.map(ou => {
          const result: any = { id: ou.id };
          properties.forEach(prop => {
            if ((ou as any)[prop] !== undefined) {
              result[prop] = (ou as any)[prop];
            }
          });
          return result as AdOrgUnit;
        });
      }
    }
    
    return orgUnits;
  }

  // AD Computers
  async getAdComputer(id: number): Promise<AdComputer | undefined> {
    return this.adComputers.get(id);
  }

  async createAdComputer(computer: InsertAdComputer): Promise<AdComputer> {
    const id = this.adComputerCurrentId++;
    const adComputer: AdComputer = { ...computer, id };
    this.adComputers.set(id, adComputer);
    return adComputer;
  }

  async updateAdComputer(id: number, computerData: Partial<AdComputer>): Promise<AdComputer | undefined> {
    const computer = await this.getAdComputer(id);
    if (!computer) return undefined;
    
    const updatedComputer = { ...computer, ...computerData };
    this.adComputers.set(id, updatedComputer);
    return updatedComputer;
  }

  async deleteAdComputer(id: number): Promise<boolean> {
    return this.adComputers.delete(id);
  }

  async listAdComputers(connectionId: number, query?: any): Promise<AdComputer[]> {
    let computers = Array.from(this.adComputers.values()).filter(
      (computer) => computer.connectionId === connectionId,
    );
    
    // Apply filtering logic
    if (query) {
      if (query.select) {
        const properties = query.select.split(',');
        computers = computers.map(computer => {
          const result: any = { id: computer.id };
          properties.forEach(prop => {
            if ((computer as any)[prop] !== undefined) {
              result[prop] = (computer as any)[prop];
            }
          });
          return result as AdComputer;
        });
      }
    }
    
    return computers;
  }

  // AD Domains
  async getAdDomain(id: number): Promise<AdDomain | undefined> {
    return this.adDomains.get(id);
  }

  async createAdDomain(domain: InsertAdDomain): Promise<AdDomain> {
    const id = this.adDomainCurrentId++;
    const adDomain: AdDomain = { ...domain, id };
    this.adDomains.set(id, adDomain);
    return adDomain;
  }

  async updateAdDomain(id: number, domainData: Partial<AdDomain>): Promise<AdDomain | undefined> {
    const domain = await this.getAdDomain(id);
    if (!domain) return undefined;
    
    const updatedDomain = { ...domain, ...domainData };
    this.adDomains.set(id, updatedDomain);
    return updatedDomain;
  }

  async deleteAdDomain(id: number): Promise<boolean> {
    return this.adDomains.delete(id);
  }

  async listAdDomains(connectionId: number, query?: any): Promise<AdDomain[]> {
    let domains = Array.from(this.adDomains.values()).filter(
      (domain) => domain.connectionId === connectionId,
    );
    
    // Apply filtering logic
    if (query) {
      if (query.select) {
        const properties = query.select.split(',');
        domains = domains.map(domain => {
          const result: any = { id: domain.id };
          properties.forEach(prop => {
            if ((domain as any)[prop] !== undefined) {
              result[prop] = (domain as any)[prop];
            }
          });
          return result as AdDomain;
        });
      }
    }
    
    return domains;
  }
}

export const storage = new MemStorage();
