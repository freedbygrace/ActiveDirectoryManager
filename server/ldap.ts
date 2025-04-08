import { LdapConnection } from "@shared/schema";
import debugLib from "debug";
import * as ldapjs from "ldapjs";
import { promisify } from "util";

const debug = debugLib("app:ldap");

/**
 * Connect to LDAP server and return a client
 */
export async function connectToLdap(connection: LdapConnection): Promise<ldapjs.Client> {
  const url = `${connection.useSSL ? "ldaps" : "ldap"}://${connection.server}:${connection.port}`;
  
  debug(`Connecting to LDAP server at ${url}`);
  
  const client = ldapjs.createClient({
    url,
    timeout: 5000,
    connectTimeout: 10000,
    idleTimeout: 30000,
    reconnect: {
      initialDelay: 100,
      maxDelay: 1000,
      failAfter: 10
    }
  });
  
  // Convert bind to promise
  const bindAsync = promisify(client.bind).bind(client);
  
  try {
    // Bind with credentials
    await bindAsync(connection.username, connection.password);
    debug("Successfully authenticated to LDAP server");
    return client;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug("Failed to connect to LDAP server:", error);
    throw new Error(`Failed to connect to LDAP server: ${errorMessage}`);
  }
}

export interface LdapSearchOptions {
  base?: string;
  filter: string;
  scope?: "base" | "one" | "sub";
  attributes?: string[];
  limit?: number;
}

/**
 * Search LDAP directory with the provided options
 */
export async function searchLdap(client: ldapjs.Client, options: LdapSearchOptions): Promise<Record<string, any>[]> {
  const {
    base = "",
    filter,
    scope = "sub",
    attributes,
    limit = 1000
  } = options;
  
  debug(`Searching LDAP with filter: ${filter}`);
  
  return new Promise((resolve, reject) => {
    const results: Record<string, any>[] = [];
    
    client.search(base, {
      filter,
      scope, // ldapjs accepts 'base', 'one', 'sub' as strings
      attributes,
      sizeLimit: limit
    }, (err: ldapjs.Error | null, res: ldapjs.SearchCallbackResponse) => {
      if (err) {
        debug("LDAP search error:", err);
        return reject(err);
      }
      
      // The types for ldapjs don't fully match the actual API
      // We need to use any here because the type definitions are incomplete
      res.on("searchEntry", (entry: any) => {
        results.push(entry.object);
      });
      
      res.on("error", (err: ldapjs.Error) => {
        debug("LDAP search result error:", err);
        reject(err);
      });
      
      res.on("end", (result: any) => {
        debug(`LDAP search completed with ${results.length} results`);
        if (result && result.status !== 0) {
          debug(`LDAP search ended with status: ${result.status}`);
        }
        resolve(results);
      });
    });
  });
}

/**
 * Test a connection to an LDAP server
 */
export async function testLdapConnection(connection: LdapConnection): Promise<boolean> {
  try {
    const client = await connectToLdap(connection);
    client.destroy();
    return true;
  } catch (error: unknown) {
    debug("LDAP connection test failed:", error);
    return false;
  }
}

/**
 * Get basic info about an LDAP domain
 */
export async function getLdapDomainInfo(client: ldapjs.Client): Promise<Record<string, any> | null> {
  try {
    const results = await searchLdap(client, {
      filter: "(objectClass=domain)",
      scope: "base"
    });
    
    return results.length > 0 ? results[0] : null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug("Failed to get LDAP domain info:", error);
    throw new Error(`Failed to get LDAP domain info: ${errorMessage}`);
  }
}