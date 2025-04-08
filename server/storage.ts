import { users, apiTokens, ldapConnections, activityLogs } from "@shared/schema";
import type { 
  User, InsertUser, 
  ApiToken, InsertApiToken, 
  LdapConnection, InsertLdapConnection, 
  ActivityLog, InsertActivityLog 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  listUsers(filters?: any): Promise<User[]>;

  // API Tokens
  getApiToken(id: number): Promise<ApiToken | undefined>;
  getApiTokenByToken(token: string): Promise<ApiToken | undefined>;
  createApiToken(token: InsertApiToken & { token: string }): Promise<ApiToken>;
  updateApiToken(id: number, token: Partial<ApiToken>): Promise<ApiToken | undefined>;
  deleteApiToken(id: number): Promise<boolean>;
  listApiTokens(userId?: number): Promise<ApiToken[]>;

  // LDAP Connections
  getLdapConnection(id: number): Promise<LdapConnection | undefined>;
  createLdapConnection(connection: InsertLdapConnection): Promise<LdapConnection>;
  updateLdapConnection(id: number, connection: Partial<LdapConnection>): Promise<LdapConnection | undefined>;
  deleteLdapConnection(id: number): Promise<boolean>;
  listLdapConnections(): Promise<LdapConnection[]>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  listActivityLogs(limit?: number): Promise<ActivityLog[]>;

  // Session Store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private apiTokens: Map<number, ApiToken>;
  private ldapConnections: Map<number, LdapConnection>;
  private activityLogs: ActivityLog[];
  
  currentUserId: number;
  currentTokenId: number;
  currentConnectionId: number;
  currentLogId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.apiTokens = new Map();
    this.ldapConnections = new Map();
    this.activityLogs = [];
    
    this.currentUserId = 1;
    this.currentTokenId = 1;
    this.currentConnectionId = 1;
    this.currentLogId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async listUsers(filters?: any): Promise<User[]> {
    const users = Array.from(this.users.values());
    if (!filters) return users;
    
    // Apply filters if provided
    return users.filter(user => {
      for (const [key, value] of Object.entries(filters)) {
        if (user[key as keyof User] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  // API Tokens
  async getApiToken(id: number): Promise<ApiToken | undefined> {
    return this.apiTokens.get(id);
  }

  async getApiTokenByToken(token: string): Promise<ApiToken | undefined> {
    return Array.from(this.apiTokens.values()).find(
      (apiToken) => apiToken.token === token,
    );
  }

  async createApiToken(tokenData: InsertApiToken & { token: string }): Promise<ApiToken> {
    const id = this.currentTokenId++;
    const createdAt = new Date();
    const apiToken: ApiToken = { 
      ...tokenData, 
      id, 
      createdAt,
      lastUsedAt: null
    };
    this.apiTokens.set(id, apiToken);
    return apiToken;
  }

  async updateApiToken(id: number, updates: Partial<ApiToken>): Promise<ApiToken | undefined> {
    const token = this.apiTokens.get(id);
    if (!token) return undefined;
    
    const updatedToken = { ...token, ...updates };
    this.apiTokens.set(id, updatedToken);
    return updatedToken;
  }

  async deleteApiToken(id: number): Promise<boolean> {
    return this.apiTokens.delete(id);
  }

  async listApiTokens(userId?: number): Promise<ApiToken[]> {
    const tokens = Array.from(this.apiTokens.values());
    if (userId === undefined) return tokens;
    
    return tokens.filter(token => token.userId === userId);
  }

  // LDAP Connections
  async getLdapConnection(id: number): Promise<LdapConnection | undefined> {
    return this.ldapConnections.get(id);
  }

  async createLdapConnection(connectionData: InsertLdapConnection): Promise<LdapConnection> {
    const id = this.currentConnectionId++;
    const ldapConnection: LdapConnection = { 
      ...connectionData, 
      id, 
      status: "disconnected",
      lastConnected: null
    };
    this.ldapConnections.set(id, ldapConnection);
    return ldapConnection;
  }

  async updateLdapConnection(id: number, updates: Partial<LdapConnection>): Promise<LdapConnection | undefined> {
    const connection = this.ldapConnections.get(id);
    if (!connection) return undefined;
    
    const updatedConnection = { ...connection, ...updates };
    this.ldapConnections.set(id, updatedConnection);
    return updatedConnection;
  }

  async deleteLdapConnection(id: number): Promise<boolean> {
    return this.ldapConnections.delete(id);
  }

  async listLdapConnections(): Promise<LdapConnection[]> {
    return Array.from(this.ldapConnections.values());
  }

  // Activity Logs
  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    const id = this.currentLogId++;
    const timestamp = new Date();
    const log: ActivityLog = { ...logData, id, timestamp };
    this.activityLogs.push(log);
    return log;
  }

  async listActivityLogs(limit = 10): Promise<ActivityLog[]> {
    // Sort by timestamp descending (newest first)
    return [...this.activityLogs]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
