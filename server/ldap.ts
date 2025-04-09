import { EventEmitter } from 'events';
import ldap from 'ldapjs';
import { LdapConnection } from '@shared/schema';
import { storage } from './storage';

class LdapClient extends EventEmitter {
  private clients: Map<number, ldap.Client> = new Map();
  private isConnected: Map<number, boolean> = new Map();
  
  async connect(connection: LdapConnection): Promise<boolean> {
    try {
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
        client.on('error', async (err) => {
          console.error(`LDAP connection error for ${connection.name}:`, err);
          this.isConnected.set(connection.id, false);
          await storage.updateLdapConnection(connection.id, { status: 'disconnected' });
          this.emit('status', { 
            connectionId: connection.id, 
            status: 'disconnected', 
            error: err.message 
          });
        });
        
        client.bind(connection.username, connection.password, async (err) => {
          if (err) {
            console.error(`LDAP bind error for ${connection.name}:`, err);
            this.isConnected.set(connection.id, false);
            await storage.updateLdapConnection(connection.id, { status: 'disconnected' });
            this.emit('status', { 
              connectionId: connection.id, 
              status: 'disconnected', 
              error: err.message 
            });
            reject(err);
            return;
          }
          
          this.clients.set(connection.id, client);
          this.isConnected.set(connection.id, true);
          await storage.updateLdapConnection(connection.id, { 
            status: 'connected',
            lastConnected: new Date()
          });
          
          this.emit('status', { 
            connectionId: connection.id, 
            status: 'connected' 
          });
          
          resolve(true);
        });
      });
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
    const client = this.clients.get(connectionId);
    if (client) {
      return new Promise((resolve) => {
        client.unbind(() => {
          this.clients.delete(connectionId);
          this.isConnected.set(connectionId, false);
          resolve();
        });
      });
    }
  }
  
  getClient(connectionId: number): ldap.Client | undefined {
    return this.clients.get(connectionId);
  }
  
  isConnectionActive(connectionId: number): boolean {
    return this.isConnected.get(connectionId) || false;
  }
  
  // LDAP CRUD operations
  async searchUsers(connectionId: number, filter = '(objectClass=user)', attributes?: string[]): Promise<any[]> {
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');
    
    const connection = await storage.getLdapConnection(connectionId);
    if (!connection) throw new Error('LDAP connection not found');
    
    const baseDN = connection.baseDN || '';
    const defaultAttributes = ['cn', 'sAMAccountName', 'mail', 'distinguishedName'];
    const searchAttributes = attributes?.length ? attributes : defaultAttributes;
    
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      
      client.search(baseDN, {
        filter,
        scope: 'sub',
        attributes: searchAttributes
      }, (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        
        res.on('searchEntry', (entry) => {
          results.push(entry.object);
        });
        
        res.on('error', (err) => {
          reject(err);
        });
        
        res.on('end', (result) => {
          resolve(results);
        });
      });
    });
  }
  
  async searchGroups(connectionId: number, filter = '(objectClass=group)', attributes?: string[]): Promise<any[]> {
    const defaultAttributes = ['cn', 'distinguishedName', 'member'];
    return this.searchUsers(connectionId, filter, attributes || defaultAttributes);
  }
  
  async searchOUs(connectionId: number, filter = '(objectClass=organizationalUnit)', attributes?: string[]): Promise<any[]> {
    const defaultAttributes = ['ou', 'distinguishedName'];
    return this.searchUsers(connectionId, filter, attributes || defaultAttributes);
  }
  
  async searchComputers(connectionId: number, filter = '(objectClass=computer)', attributes?: string[]): Promise<any[]> {
    const defaultAttributes = ['cn', 'distinguishedName', 'operatingSystem'];
    return this.searchUsers(connectionId, filter, attributes || defaultAttributes);
  }
  
  async searchSites(connectionId: number, filter = '(objectClass=site)', attributes?: string[]): Promise<any[]> {
    const defaultAttributes = ['cn', 'distinguishedName', 'description', 'location', 'managedBy'];
    // Sites are typically stored in the Configuration naming context
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');
    
    const connection = await storage.getLdapConnection(connectionId);
    if (!connection) throw new Error('LDAP connection not found');
    
    // Sites are located in the Configuration container
    const baseDN = 'CN=Sites,CN=Configuration,' + this.getDomainDN(connection);
    const searchAttributes = attributes?.length ? attributes : defaultAttributes;
    
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      
      client.search(baseDN, {
        filter,
        scope: 'sub',
        attributes: searchAttributes
      }, (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        
        res.on('searchEntry', (entry) => {
          results.push(entry.object);
        });
        
        res.on('error', (err) => {
          reject(err);
        });
        
        res.on('end', (result) => {
          resolve(results);
        });
      });
    });
  }
  
  async searchSubnets(connectionId: number, filter = '(objectClass=subnet)', attributes?: string[]): Promise<any[]> {
    const defaultAttributes = ['cn', 'distinguishedName', 'description', 'location', 'siteObject', 'managedBy'];
    // Subnets are typically stored in the Configuration naming context
    const client = this.getClient(connectionId);
    if (!client) throw new Error('LDAP connection not established');
    
    const connection = await storage.getLdapConnection(connectionId);
    if (!connection) throw new Error('LDAP connection not found');
    
    // Subnets are located in the Configuration container
    const baseDN = 'CN=Subnets,CN=Sites,CN=Configuration,' + this.getDomainDN(connection);
    const searchAttributes = attributes?.length ? attributes : defaultAttributes;
    
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      
      client.search(baseDN, {
        filter,
        scope: 'sub',
        attributes: searchAttributes
      }, (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        
        res.on('searchEntry', (entry) => {
          results.push(entry.object);
        });
        
        res.on('error', (err) => {
          reject(err);
        });
        
        res.on('end', (result) => {
          resolve(results);
        });
      });
    });
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
}

export const ldapClient = new LdapClient();
