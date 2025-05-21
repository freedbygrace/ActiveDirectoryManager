import { EventEmitter } from 'events';
import ldap from 'ldapjs';
import { LdapConnection } from '@shared/schema';
import { storage } from './storage';

// DN escaping utilities
const DN_SPECIAL_CHARS = /[,=+<>#;\\"\n]/;
const RDN_SPECIAL_CHARS = /[,=+<>#;\\"\n/]/;

// Escape a string for use in a DN
function escapeDN(value: string): string {
  if (!value) return '';

  // If the value doesn't contain special characters, return it as is
  if (!DN_SPECIAL_CHARS.test(value)) return value;

  // Otherwise, escape each special character
  return value.replace(/([\\\,\=\+\<\>\#\;\"\n])/g, '\\$1');
}

// Escape a string for use in an RDN
function escapeRDN(value: string): string {
  if (!value) return '';

  // If the value doesn't contain special characters, return it as is
  if (!RDN_SPECIAL_CHARS.test(value)) return value;

  // Otherwise, escape each special character
  return value.replace(/([\\\,\=\+\<\>\#\;\"\n\/])/g, '\\$1');
}

// Parse a DN into its component parts
function parseDN(dn: string): { attribute: string, value: string }[] {
  if (!dn) return [];

  const parts = [];
  let inEscape = false;
  let currentPart = '';

  for (let i = 0; i < dn.length; i++) {
    const char = dn[i];

    if (inEscape) {
      currentPart += char;
      inEscape = false;
    } else if (char === '\\') {
      inEscape = true;
    } else if (char === ',' && !inEscape) {
      if (currentPart) {
        const [attribute, value] = currentPart.split('=', 2);
        parts.push({ attribute: attribute.trim(), value: value.trim() });
        currentPart = '';
      }
    } else {
      currentPart += char;
    }
  }

  if (currentPart) {
    const [attribute, value] = currentPart.split('=', 2);
    parts.push({ attribute: attribute.trim(), value: value.trim() });
  }

  return parts;
}

// Build a DN from component parts
function buildDN(parts: { attribute: string, value: string }[]): string {
  return parts.map(part => `${part.attribute}=${escapeDN(part.value)}`).join(',');
}

// Connection pool configuration
interface ConnectionPoolConfig {
  maxConnections: number;
  idleTimeout: number; // in milliseconds
  acquireTimeout: number; // in milliseconds
}

// Default connection pool configuration
const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
  maxConnections: 10,
  idleTimeout: 60000, // 1 minute
  acquireTimeout: 10000 // 10 seconds
};

// Connection pool entry
interface PoolEntry {
  client: ldap.Client;
  lastUsed: number;
  inUse: boolean;
}

class LdapClient extends EventEmitter {
  private readonly clients: Map<number, ldap.Client> = new Map();
  private readonly isConnected: Map<number, boolean> = new Map();
  private readonly connectionPools: Map<number, PoolEntry[]> = new Map();
  private readonly poolConfig: ConnectionPoolConfig;

  constructor(poolConfig?: Partial<ConnectionPoolConfig>) {
    super();
    this.poolConfig = { ...DEFAULT_POOL_CONFIG, ...poolConfig };

    // Start the idle connection cleanup timer
    setInterval(() => this.cleanupIdleConnections(), this.poolConfig.idleTimeout);
  }

  // Clean up idle connections
  private cleanupIdleConnections(): void {
    const now = Date.now();

    for (const [connectionId, pool] of this.connectionPools.entries()) {
      // Filter out idle connections that exceed the idle timeout
      const activeConnections = pool.filter(entry => {
        const isIdle = !entry.inUse && (now - entry.lastUsed > this.poolConfig.idleTimeout);

        if (isIdle) {
          try {
            // Unbind the idle connection
            entry.client.unbind();
            console.log(`Closed idle LDAP connection for connection ID ${connectionId}`);
          } catch (error) {
            console.error(`Error closing idle LDAP connection: ${error instanceof Error ? error.message : String(error)}`);
          }
          return false;
        }

        return true;
      });

      // Update the pool with only active connections
      this.connectionPools.set(connectionId, activeConnections);

      // If all connections are gone, update the connection status
      if (activeConnections.length === 0 && this.isConnected.get(connectionId)) {
        this.isConnected.set(connectionId, false);
      }
    }
  }

  // Get a connection from the pool or create a new one
  private async getPooledConnection(connection: LdapConnection): Promise<ldap.Client> {
    const connectionId = connection.id;
    let pool = this.connectionPools.get(connectionId) || [];

    // Look for an available connection in the pool
    const availableEntry = pool.find(entry => !entry.inUse);

    if (availableEntry) {
      // Mark the connection as in use
      availableEntry.inUse = true;
      availableEntry.lastUsed = Date.now();
      return availableEntry.client;
    }

    // Check if we've reached the maximum number of connections
    if (pool.length >= this.poolConfig.maxConnections) {
      // Wait for a connection to become available
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timed out waiting for an available LDAP connection after ${this.poolConfig.acquireTimeout}ms`));
        }, this.poolConfig.acquireTimeout);

        const checkForAvailableConnection = () => {
          const pool = this.connectionPools.get(connectionId) || [];
          const availableEntry = pool.find(entry => !entry.inUse);

          if (availableEntry) {
            clearTimeout(timeout);
            availableEntry.inUse = true;
            availableEntry.lastUsed = Date.now();
            resolve(availableEntry.client);
          } else {
            // Check again in 100ms
            setTimeout(checkForAvailableConnection, 100);
          }
        };

        checkForAvailableConnection();
      });
    }

    // Create a new connection
    const clientOptions: ldap.ClientOptions = {
      url: `${connection.useTLS ? 'ldaps' : 'ldap'}://${connection.server}:${connection.port}`,
      reconnect: {
        initialDelay: 1000,
        maxDelay: 10000,
        failAfter: 10
      },
      timeout: 5000,
      connectTimeout: 10000
    };

    const client = ldap.createClient(clientOptions);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout after ${this.poolConfig.acquireTimeout}ms`));
      }, this.poolConfig.acquireTimeout);

      client.on('error', async (err) => {
        console.error(`LDAP connection error for ${connection.name}:`, err);

        // Remove this client from the pool if it exists
        const pool = this.connectionPools.get(connectionId) || [];
        const updatedPool = pool.filter(entry => entry.client !== client);
        this.connectionPools.set(connectionId, updatedPool);

        if (updatedPool.length === 0) {
          this.isConnected.set(connectionId, false);
          await storage.updateLdapConnection(connectionId, { status: 'disconnected' });
          this.emit('status', {
            connectionId,
            status: 'disconnected',
            error: err.message
          });
        }
      });

      client.bind(connection.username, connection.password, (err) => {
        clearTimeout(timeout);

        if (err) {
          console.error(`LDAP bind error for ${connection.name}:`, err);
          this.isConnected.set(connectionId, false);

          // Update connection status in database
          storage.updateLdapConnection(connectionId, { status: 'disconnected' })
            .catch(dbErr => console.error(`Error updating LDAP connection status: ${dbErr}`));

          this.emit('status', {
            connectionId,
            status: 'disconnected',
            error: err.message
          });

          reject(err);
          return;
        }

        // Add the new connection to the pool
        const newEntry: PoolEntry = {
          client,
          lastUsed: Date.now(),
          inUse: true
        };

        pool.push(newEntry);
        this.connectionPools.set(connectionId, pool);
        this.isConnected.set(connectionId, true);

        // Update connection status in database
        storage.updateLdapConnection(connectionId, {
          status: 'connected',
          lastConnected: new Date()
        }).catch(dbErr => console.error(`Error updating LDAP connection status: ${dbErr}`));

        this.emit('status', {
          connectionId,
          status: 'connected'
        });

        resolve(client);
      });
    });
  }

  // Release a connection back to the pool
  private releaseConnection(connectionId: number, client: ldap.Client): void {
    const pool = this.connectionPools.get(connectionId);
    if (!pool) return;

    const entry = pool.find(e => e.client === client);
    if (entry) {
      entry.inUse = false;
      entry.lastUsed = Date.now();
    }
  }

  async connect(connection: LdapConnection): Promise<boolean> {
    try {
      await this.getPooledConnection(connection);
      return true;
    } catch (error) {
      console.error(`LDAP connection error for ${connection.name}:`, error);
      this.isConnected.set(connection.id, false);
      await storage.updateLdapConnection(connection.id, { status: 'disconnected' });
      this.emit('status', {
        connectionId: connection.id,
        status: 'disconnected',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async disconnect(connectionId: number): Promise<void> {
    // Close all connections in the pool
    const pool = this.connectionPools.get(connectionId) || [];

    for (const entry of pool) {
      try {
        entry.client.unbind();
      } catch (error) {
        console.error(`Error unbinding LDAP connection: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Clear the pool
    this.connectionPools.delete(connectionId);
    this.isConnected.set(connectionId, false);

    // Also handle legacy client if it exists
    const client = this.clients.get(connectionId);
    if (client) {
      try {
        client.unbind();
        this.clients.delete(connectionId);
      } catch (error) {
        console.error(`Error unbinding legacy LDAP connection: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  async getClient(connectionId: number): Promise<ldap.Client | undefined> {
    // First check if we have a connection in the pool
    const pool = this.connectionPools.get(connectionId) || [];
    const availableEntry = pool.find(entry => !entry.inUse);

    if (availableEntry) {
      availableEntry.inUse = true;
      availableEntry.lastUsed = Date.now();
      return availableEntry.client;
    }

    // Fall back to legacy client
    return this.clients.get(connectionId);
  }

  isConnectionActive(connectionId: number): boolean {
    // Check if we have any active connections in the pool
    const pool = this.connectionPools.get(connectionId) || [];
    if (pool.length > 0) return true;

    // Fall back to legacy connection status
    return this.isConnected.get(connectionId) || false;
  }

  // LDAP CRUD operations with paging support
  async searchWithPaging(
    connectionId: number,
    baseDN: string,
    filter: string,
    attributes: string[],
    pageSize = 1000
  ): Promise<any[]> {
    const client = await this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    return new Promise((resolve, reject) => {
      const allResults: any[] = [];
      let finished = false;

      // Create a paged search control
      const controls = [
        new ldap.PagedResultsControl({ value: { size: pageSize } })
      ];

      const processPage = (err: any, res: any) => {
        if (err) {
          reject(new Error(`LDAP search error: ${err.message}`));
          return;
        }

        let cookie: Buffer | undefined;

        res.on('searchEntry', (entry: any) => {
          allResults.push(entry.object);
        });

        res.on('error', (err: any) => {
          reject(new Error(`LDAP search error: ${err.message}`));
        });

        res.on('end', (result: any) => {
          if (finished) return;

          // Check if we need to get more pages
          if (result && result.controls) {
            const control = result.controls.find(
              (c: any) => c instanceof ldap.PagedResultsControl
            );

            if (control && control.value.cookie && control.value.cookie.length > 0) {
              cookie = control.value.cookie;

              // Get the next page
              const nextControls = [
                new ldap.PagedResultsControl({ value: { size: pageSize, cookie } })
              ];

              client.search(baseDN, {
                filter,
                scope: 'sub',
                attributes,
                controls: nextControls
              }, processPage);
            } else {
              // No more pages, we're done
              finished = true;
              resolve(allResults);
            }
          } else {
            // No paging control in response, we're done
            finished = true;
            resolve(allResults);
          }
        });
      };

      // Start the paged search
      client.search(baseDN, {
        filter,
        scope: 'sub',
        attributes,
        controls
      }, processPage);
    });
  }

  async searchUsers(connectionId: number, filter = '(objectClass=user)', attributes?: string[], pageSize = 1000): Promise<any[]> {
    const connection = await storage.getLdapConnection(connectionId);
    if (!connection) throw new Error('LDAP connection not found');

    const baseDN = connection.baseDN || '';
    const defaultAttributes = ['cn', 'sAMAccountName', 'mail', 'distinguishedName', 'objectGUID', 'userAccountControl'];
    const searchAttributes = attributes?.length ? attributes : defaultAttributes;

    try {
      return await this.searchWithPaging(connectionId, baseDN, filter, searchAttributes, pageSize);
    } catch (error) {
      throw new Error(`Failed to search users: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchGroups(connectionId: number, filter = '(objectClass=group)', attributes?: string[], pageSize = 1000): Promise<any[]> {
    const connection = await storage.getLdapConnection(connectionId);
    if (!connection) throw new Error('LDAP connection not found');

    const baseDN = connection.baseDN || '';
    const defaultAttributes = ['cn', 'distinguishedName', 'member', 'objectGUID', 'sAMAccountName'];
    const searchAttributes = attributes?.length ? attributes : defaultAttributes;

    try {
      return await this.searchWithPaging(connectionId, baseDN, filter, searchAttributes, pageSize);
    } catch (error) {
      throw new Error(`Failed to search groups: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchOUs(connectionId: number, filter = '(objectClass=organizationalUnit)', attributes?: string[], pageSize = 1000): Promise<any[]> {
    const connection = await storage.getLdapConnection(connectionId);
    if (!connection) throw new Error('LDAP connection not found');

    const baseDN = connection.baseDN || '';
    const defaultAttributes = ['ou', 'distinguishedName', 'objectGUID'];
    const searchAttributes = attributes?.length ? attributes : defaultAttributes;

    try {
      return await this.searchWithPaging(connectionId, baseDN, filter, searchAttributes, pageSize);
    } catch (error) {
      throw new Error(`Failed to search OUs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchComputers(connectionId: number, filter = '(objectClass=computer)', attributes?: string[], pageSize = 1000): Promise<any[]> {
    const connection = await storage.getLdapConnection(connectionId);
    if (!connection) throw new Error('LDAP connection not found');

    const baseDN = connection.baseDN || '';
    const defaultAttributes = ['cn', 'distinguishedName', 'dNSHostName', 'operatingSystem', 'objectGUID', 'userAccountControl'];
    const searchAttributes = attributes?.length ? attributes : defaultAttributes;

    try {
      return await this.searchWithPaging(connectionId, baseDN, filter, searchAttributes, pageSize);
    } catch (error) {
      throw new Error(`Failed to search computers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchSites(connectionId: number, filter = '(objectClass=site)', attributes?: string[], pageSize = 1000): Promise<any[]> {
    const defaultAttributes = ['cn', 'distinguishedName', 'description', 'location', 'managedBy', 'objectGUID'];

    const connection = await storage.getLdapConnection(connectionId);
    if (!connection) throw new Error('LDAP connection not found');

    // Sites are located in the Configuration container
    const baseDN = 'CN=Sites,CN=Configuration,' + this.getDomainDN(connection);
    const searchAttributes = attributes?.length ? attributes : defaultAttributes;

    try {
      return await this.searchWithPaging(connectionId, baseDN, filter, searchAttributes, pageSize);
    } catch (error) {
      throw new Error(`Failed to search sites: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchSubnets(connectionId: number, filter = '(objectClass=subnet)', attributes?: string[], pageSize = 1000): Promise<any[]> {
    const defaultAttributes = ['cn', 'distinguishedName', 'description', 'location', 'siteObject', 'managedBy', 'objectGUID'];

    const connection = await storage.getLdapConnection(connectionId);
    if (!connection) throw new Error('LDAP connection not found');

    // Subnets are located in the Configuration container
    const baseDN = 'CN=Subnets,CN=Sites,CN=Configuration,' + this.getDomainDN(connection);
    const searchAttributes = attributes?.length ? attributes : defaultAttributes;

    try {
      return await this.searchWithPaging(connectionId, baseDN, filter, searchAttributes, pageSize);
    } catch (error) {
      throw new Error(`Failed to search subnets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Helper function to extract domain DN from connection
  getDomainDN(connection: LdapConnection): string {
    const domainParts = connection.domain.split('.');
    return domainParts.map(part => `DC=${part}`).join(',');
  }

  async createEntry(connectionId: number, dn: string, attributes: any): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    return new Promise((resolve, reject) => {
      client.add(dn, attributes, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(true);
      });
    });
  }

  async updateEntry(connectionId: number, dn: string, changes: any[]): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    return new Promise((resolve, reject) => {
      client.modify(dn, changes, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(true);
      });
    });
  }

  // Update a single attribute of an LDAP entry
  async updateAttribute(
    connectionId: number,
    dn: string,
    attributeName: string,
    attributeValue: string | string[] | null,
    operation: 'add' | 'replace' | 'delete' = 'replace'
  ): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    // Ensure DN is properly escaped
    const escapedDN = buildDN(parseDN(dn));

    let change: any;

    if (attributeValue === null) {
      // If value is null, we're removing the attribute
      change = new ldap.Change({
        operation: 'delete',
        modification: {
          [attributeName]: []
        }
      });
    } else {
      // Otherwise, we're adding or replacing the attribute
      change = new ldap.Change({
        operation,
        modification: {
          [attributeName]: Array.isArray(attributeValue) ? attributeValue : [attributeValue]
        }
      });
    }

    try {
      return await this.updateEntry(connectionId, escapedDN, [change]);
    } catch (error) {
      throw new Error(`Failed to update attribute ${attributeName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Update multiple attributes of an LDAP entry in a single operation
  async updateAttributes(
    connectionId: number,
    dn: string,
    attributes: Record<string, string | string[] | null>,
    operation: 'add' | 'replace' | 'delete' = 'replace'
  ): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    // Ensure DN is properly escaped
    const escapedDN = buildDN(parseDN(dn));

    const changes: any[] = [];

    // Create a change for each attribute
    for (const [attributeName, attributeValue] of Object.entries(attributes)) {
      if (attributeValue === null) {
        // If value is null, we're removing the attribute
        changes.push(new ldap.Change({
          operation: 'delete',
          modification: {
            [attributeName]: []
          }
        }));
      } else {
        // Otherwise, we're adding or replacing the attribute
        changes.push(new ldap.Change({
          operation,
          modification: {
            [attributeName]: Array.isArray(attributeValue) ? attributeValue : [attributeValue]
          }
        }));
      }
    }

    try {
      return await this.updateEntry(connectionId, escapedDN, changes);
    } catch (error) {
      throw new Error(`Failed to update attributes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteEntry(connectionId: number, dn: string): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    return new Promise((resolve, reject) => {
      client.del(dn, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(true);
      });
    });
  }

  // Get the managed by attribute for an object
  async getManagedBy(connectionId: number, dn: string): Promise<string | null> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    return new Promise((resolve, reject) => {
      client.search(dn, {
        scope: 'base',
        attributes: ['managedBy']
      }, (err, res) => {
        if (err) {
          reject(err);
          return;
        }

        let managedBy: string | null = null;

        res.on('searchEntry', (entry) => {
          const attrs = entry.attributes;
          for (const attr of attrs) {
            if (attr.type === 'managedBy' && attr.vals && attr.vals.length > 0) {
              managedBy = attr.vals[0].toString();
            }
          }
        });

        res.on('error', (err) => {
          reject(err);
        });

        res.on('end', (result) => {
          if (result.status !== 0) {
            reject(new Error(`LDAP search error: ${result.errorMessage}`));
            return;
          }
          resolve(managedBy);
        });
      });
    });
  }

  // Set the managed by attribute for an object
  async setManagedBy(connectionId: number, dn: string, managerDn: string | null): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    const changes = [];

    if (managerDn === null) {
      // Remove the managedBy attribute
      changes.push(new ldap.Change({
        operation: 'delete',
        modification: {
          managedBy: []
        }
      }));
    } else {
      // Add or replace the managedBy attribute
      changes.push(new ldap.Change({
        operation: 'replace',
        modification: {
          managedBy: managerDn
        }
      }));
    }

    return this.updateEntry(connectionId, dn, changes);
  }

  // Validate password against common AD password policies
  private validatePassword(password: string): { valid: boolean; message?: string } {
    if (!password) {
      return { valid: false, message: 'Password cannot be empty' };
    }

    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    // Check for complexity requirements (at least 3 of 4 character types)
    let complexity = 0;
    if (/[a-z]/.test(password)) complexity++; // lowercase
    if (/[A-Z]/.test(password)) complexity++; // uppercase
    if (/[0-9]/.test(password)) complexity++; // digits
    if (/[^a-zA-Z0-9]/.test(password)) complexity++; // special chars

    if (complexity < 3) {
      return {
        valid: false,
        message: 'Password must contain at least 3 of the following: lowercase letters, uppercase letters, digits, and special characters'
      };
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      return { valid: false, message: 'Password cannot contain repeated character sequences' };
    }

    return { valid: true };
  }

  // Reset a user's password
  async resetUserPassword(connectionId: number, userDN: string, newPassword: string, skipValidation = false): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    // Validate the password against common AD policies
    if (!skipValidation) {
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        throw new Error(`Password validation failed: ${validation.message}`);
      }
    }

    // Ensure the DN is properly escaped
    const escapedUserDN = buildDN(parseDN(userDN));

    // Unicode password format for Active Directory
    const unicodePassword = Buffer.from(`"${newPassword}"`, 'utf16le');

    const changes = [
      new ldap.Change({
        operation: 'replace',
        modification: {
          unicodePwd: unicodePassword
        }
      })
    ];

    try {
      return await this.updateEntry(connectionId, escapedUserDN, changes);
    } catch (error) {
      throw new Error(`Failed to reset password: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Enable or disable a user account
  async setUserAccountStatus(connectionId: number, userDN: string, enabled: boolean): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    // Ensure the DN is properly escaped
    const escapedUserDN = buildDN(parseDN(userDN));

    // First, get the current userAccountControl value
    const users = await this.searchUsers(connectionId, `(distinguishedName=${escapedUserDN})`, ['userAccountControl']);
    if (!users || users.length === 0) {
      throw new Error('User not found');
    }

    let userAccountControl = parseInt(users[0].userAccountControl ?? '0');

    // The ACCOUNTDISABLE flag is 0x2 (2)
    if (enabled) {
      // Remove the ACCOUNTDISABLE flag
      userAccountControl &= ~2;
    } else {
      // Add the ACCOUNTDISABLE flag
      userAccountControl |= 2;
    }

    const changes = [
      new ldap.Change({
        operation: 'replace',
        modification: {
          userAccountControl: userAccountControl.toString()
        }
      })
    ];

    try {
      return await this.updateEntry(connectionId, escapedUserDN, changes);
    } catch (error) {
      throw new Error(`Failed to ${enabled ? 'enable' : 'disable'} user account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Move an object to a different OU
  async moveObject(connectionId: number, objectDN: string, targetOU: string): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    // Extract the RDN (Relative Distinguished Name) from the DN
    const dnParts = parseDN(objectDN);
    if (!dnParts.length) throw new Error('Invalid distinguished name format');

    // The first part is the RDN
    const rdn = `${dnParts[0].attribute}=${escapeDN(dnParts[0].value)}`;

    // Ensure the target OU is properly escaped
    const escapedTargetOU = targetOU.split(',').map(part => {
      const [attr, val] = part.split('=', 2);
      return `${attr}=${escapeDN(val.trim())}`;
    }).join(',');

    return new Promise((resolve, reject) => {
      client.modifyDN(objectDN, {
        newRdn: rdn,
        deleteOldRdn: true,
        newSuperior: escapedTargetOU
      }, (err) => {
        if (err) {
          reject(new Error(`Failed to move object: ${err.message}`));
          return;
        }
        resolve(true);
      });
    });
  }

  // Check if a user is a member of a group (direct or nested)
  async isUserMemberOfGroup(connectionId: number, userDN: string, groupDN: string, maxDepth = 10): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    // Ensure DNs are properly escaped
    const escapedUserDN = buildDN(parseDN(userDN));
    const escapedGroupDN = buildDN(parseDN(groupDN));

    // First check direct membership
    try {
      const groups = await this.searchGroups(
        connectionId,
        `(&(distinguishedName=${escapedGroupDN})(member=${escapedUserDN}))`,
        ['distinguishedName']
      );

      if (groups && groups.length > 0) {
        // User is directly in the group
        return true;
      }
    } catch (error) {
      console.warn(`Error checking direct group membership: ${error instanceof Error ? error.message : String(error)}`);
    }

    // If not a direct member, check nested groups
    return this.checkNestedGroupMembership(connectionId, userDN, groupDN, 0, maxDepth);
  }

  // Recursively check nested group membership
  private async checkNestedGroupMembership(
    connectionId: number,
    memberDN: string,
    groupDN: string,
    currentDepth: number,
    maxDepth: number,
    visitedGroups: Set<string> = new Set()
  ): Promise<boolean> {
    // Prevent infinite recursion
    if (currentDepth >= maxDepth) return false;

    // Prevent cycles
    if (visitedGroups.has(groupDN)) return false;
    visitedGroups.add(groupDN);

    // Ensure DNs are properly escaped
    const escapedMemberDN = buildDN(parseDN(memberDN));
    const escapedGroupDN = buildDN(parseDN(groupDN));

    try {
      // Get all groups that the member is directly a member of
      const memberGroups = await this.searchGroups(
        connectionId,
        `(member=${escapedMemberDN})`,
        ['distinguishedName']
      );

      // For each of these groups, check if they are members of the target group
      for (const memberGroup of memberGroups) {
        // Check if this group is a direct member of the target group
        const isDirectMember = await this.searchGroups(
          connectionId,
          `(&(distinguishedName=${escapedGroupDN})(member=${memberGroup.distinguishedName}))`,
          ['distinguishedName']
        );

        if (isDirectMember && isDirectMember.length > 0) {
          return true;
        }

        // Recursively check if this group is a nested member of the target group
        const isNestedMember = await this.checkNestedGroupMembership(
          connectionId,
          memberGroup.distinguishedName,
          groupDN,
          currentDepth + 1,
          maxDepth,
          visitedGroups
        );

        if (isNestedMember) {
          return true;
        }
      }
    } catch (error) {
      console.warn(`Error checking nested group membership: ${error instanceof Error ? error.message : String(error)}`);
    }

    return false;
  }

  // Get all groups a user is a member of (direct and nested)
  async getUserGroups(connectionId: number, userDN: string, maxDepth = 10): Promise<any[]> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    // Ensure DN is properly escaped
    const escapedUserDN = buildDN(parseDN(userDN));

    // Get direct group memberships
    const directGroups = await this.searchGroups(
      connectionId,
      `(member=${escapedUserDN})`,
      ['distinguishedName', 'cn', 'objectGUID', 'sAMAccountName']
    );

    // Set to track all groups to avoid duplicates
    const allGroupDNs = new Set<string>();
    const allGroups: any[] = [];

    // Add direct groups to the result
    for (const group of directGroups) {
      if (!allGroupDNs.has(group.distinguishedName)) {
        allGroupDNs.add(group.distinguishedName);
        allGroups.push({
          ...group,
          membershipType: 'direct'
        });
      }
    }

    // Get nested groups
    const nestedGroups = await this.getNestedGroups(
      connectionId,
      directGroups.map(g => g.distinguishedName),
      1,
      maxDepth,
      allGroupDNs
    );

    // Add nested groups to the result
    for (const group of nestedGroups) {
      allGroups.push({
        ...group,
        membershipType: 'nested'
      });
    }

    return allGroups;
  }

  // Recursively get nested groups
  private async getNestedGroups(
    connectionId: number,
    groupDNs: string[],
    currentDepth: number,
    maxDepth: number,
    visitedGroups: Set<string>
  ): Promise<any[]> {
    if (currentDepth >= maxDepth || groupDNs.length === 0) return [];

    const nestedGroups: any[] = [];

    for (const groupDN of groupDNs) {
      // Ensure DN is properly escaped
      const escapedGroupDN = buildDN(parseDN(groupDN));

      // Get groups that this group is a member of
      const parentGroups = await this.searchGroups(
        connectionId,
        `(member=${escapedGroupDN})`,
        ['distinguishedName', 'cn', 'objectGUID', 'sAMAccountName']
      );

      // Filter out groups we've already seen
      const newGroups = parentGroups.filter(g => !visitedGroups.has(g.distinguishedName));

      // Add new groups to the result and visited set
      for (const group of newGroups) {
        visitedGroups.add(group.distinguishedName);
        nestedGroups.push(group);
      }

      // Recursively get the next level of nested groups
      if (newGroups.length > 0) {
        const nextLevelGroups = await this.getNestedGroups(
          connectionId,
          newGroups.map(g => g.distinguishedName),
          currentDepth + 1,
          maxDepth,
          visitedGroups
        );

        nestedGroups.push(...nextLevelGroups);
      }
    }

    return nestedGroups;
  }

  // Add a member to a group
  async addToGroup(connectionId: number, groupDN: string, memberDN: string): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    // Ensure DNs are properly escaped
    const escapedGroupDN = buildDN(parseDN(groupDN));
    const escapedMemberDN = buildDN(parseDN(memberDN));

    // First check if the member is already in the group to avoid errors
    try {
      const groups = await this.searchGroups(
        connectionId,
        `(&(distinguishedName=${escapedGroupDN})(member=${escapedMemberDN}))`,
        ['distinguishedName']
      );

      if (groups && groups.length > 0) {
        // Member is already in the group
        return true;
      }

      // Also check for nested membership to warn about it
      const isNestedMember = await this.isUserMemberOfGroup(connectionId, memberDN, groupDN);
      if (isNestedMember) {
        console.warn(`Member ${memberDN} is already a nested member of group ${groupDN}`);
        // We still add the direct membership even if there's a nested membership
      }
    } catch (error) {
      // Continue with the add operation even if the check fails
      console.warn(`Error checking group membership: ${error instanceof Error ? error.message : String(error)}`);
    }

    const changes = [
      new ldap.Change({
        operation: 'add',
        modification: {
          member: escapedMemberDN
        }
      })
    ];

    try {
      return await this.updateEntry(connectionId, escapedGroupDN, changes);
    } catch (error) {
      throw new Error(`Failed to add member to group: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Remove a member from a group
  async removeFromGroup(connectionId: number, groupDN: string, memberDN: string): Promise<boolean> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');

    // Ensure DNs are properly escaped
    const escapedGroupDN = buildDN(parseDN(groupDN));
    const escapedMemberDN = buildDN(parseDN(memberDN));

    // First check if the member is in the group to avoid errors
    try {
      const groups = await this.searchGroups(
        connectionId,
        `(&(distinguishedName=${escapedGroupDN})(member=${escapedMemberDN}))`,
        ['distinguishedName']
      );

      if (!groups || groups.length === 0) {
        // Member is not directly in the group

        // Check if it's a nested member
        const isNestedMember = await this.isUserMemberOfGroup(connectionId, memberDN, groupDN);
        if (isNestedMember) {
          throw new Error(`Cannot remove nested group membership. Member ${memberDN} is a nested member of group ${groupDN}, not a direct member.`);
        }

        // Not a member at all
        return true;
      }
    } catch (error) {
      // Only continue if it's not our specific nested membership error
      if (error instanceof Error && error.message.includes('Cannot remove nested group membership')) {
        throw error;
      }

      // Continue with the remove operation for other errors
      console.warn(`Error checking group membership: ${error instanceof Error ? error.message : String(error)}`);
    }

    const changes = [
      new ldap.Change({
        operation: 'delete',
        modification: {
          member: escapedMemberDN
        }
      })
    ];

    try {
      return await this.updateEntry(connectionId, escapedGroupDN, changes);
    } catch (error) {
      throw new Error(`Failed to remove member from group: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Bulk Operations

  // Move multiple objects to a target OU
  async bulkMoveObjects(connectionId: number, objectDNs: string[], targetOU: string): Promise<{ success: string[]; failed: { dn: string; error: string }[] }> {
    const results = {
      success: [] as string[],
      failed: [] as { dn: string; error: string }[]
    };

    for (const dn of objectDNs) {
      try {
        const success = await this.moveObject(connectionId, dn, targetOU);
        if (success) {
          results.success.push(dn);
        } else {
          results.failed.push({ dn, error: 'Unknown error' });
        }
      } catch (error) {
        results.failed.push({
          dn,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  // Add multiple members to a group
  async bulkAddToGroup(connectionId: number, groupDN: string, memberDNs: string[]): Promise<{ success: string[]; failed: { dn: string; error: string }[] }> {
    const results = {
      success: [] as string[],
      failed: [] as { dn: string; error: string }[]
    };

    for (const dn of memberDNs) {
      try {
        const success = await this.addToGroup(connectionId, groupDN, dn);
        if (success) {
          results.success.push(dn);
        } else {
          results.failed.push({ dn, error: 'Unknown error' });
        }
      } catch (error) {
        results.failed.push({
          dn,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  // Remove multiple members from a group
  async bulkRemoveFromGroup(connectionId: number, groupDN: string, memberDNs: string[]): Promise<{ success: string[]; failed: { dn: string; error: string }[] }> {
    const results = {
      success: [] as string[],
      failed: [] as { dn: string; error: string }[]
    };

    for (const dn of memberDNs) {
      try {
        const success = await this.removeFromGroup(connectionId, groupDN, dn);
        if (success) {
          results.success.push(dn);
        } else {
          results.failed.push({ dn, error: 'Unknown error' });
        }
      } catch (error) {
        results.failed.push({
          dn,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  // Enable or disable multiple user accounts
  async bulkSetUserAccountStatus(connectionId: number, userDNs: string[], enabled: boolean): Promise<{ success: string[]; failed: { dn: string; error: string }[] }> {
    const results = {
      success: [] as string[],
      failed: [] as { dn: string; error: string }[]
    };

    for (const dn of userDNs) {
      try {
        const success = await this.setUserAccountStatus(connectionId, dn, enabled);
        if (success) {
          results.success.push(dn);
        } else {
          results.failed.push({ dn, error: 'Unknown error' });
        }
      } catch (error) {
        results.failed.push({
          dn,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  // Update the same attribute for multiple objects
  async bulkUpdateAttribute(
    connectionId: number,
    dns: string[],
    attributeName: string,
    attributeValue: string | string[] | null,
    operation: 'add' | 'replace' | 'delete' = 'replace'
  ): Promise<{ success: string[]; failed: { dn: string; error: string }[] }> {
    const results = {
      success: [] as string[],
      failed: [] as { dn: string; error: string }[]
    };

    for (const dn of dns) {
      try {
        const success = await this.updateAttribute(connectionId, dn, attributeName, attributeValue, operation);
        if (success) {
          results.success.push(dn);
        } else {
          results.failed.push({ dn, error: 'Unknown error' });
        }
      } catch (error) {
        results.failed.push({
          dn,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  // Helper method to handle LDAP errors with more detailed information
  private handleLdapError(err: any): Error {
    // Map common LDAP error codes to more user-friendly messages
    const errorMap: Record<string, string> = {
      '32': 'No such object exists in the directory',
      '49': 'Invalid credentials',
      '50': 'Insufficient access rights',
      '53': 'Unable to perform operation, directory server unwilling to process request',
      '65': 'Object class violation',
      '68': 'Entry already exists',
      '69': 'Object class modifications prohibited',
      '71': 'Affects multiple DSAs (directory server agents)',
      '80': 'Other error'
    };

    const code = err.code?.toString();
    const message = errorMap[code] || err.message || 'Unknown LDAP error';

    // Create a more detailed error
    const error = new Error(`LDAP Error ${code}: ${message}`);
    (error as any).ldapCode = code;
    (error as any).originalError = err;

    return error;
  }
}

export const ldapClient = new LdapClient();
