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

/**
 * Get available attributes for a specific object type from LDAP schema
 * This function retrieves attributes that are commonly used for the specified object type
 */
export async function getLdapAvailableAttributes(
  client: ldapjs.Client,
  targetObject: "users" | "groups" | "computers" | "ous"
): Promise<string[]> {
  debug(`Getting available attributes for ${targetObject}`);
  
  // Define common attributes for each object type
  const commonAttributes = [
    "cn", "name", "displayName", "description", "objectClass", "objectCategory", 
    "distinguishedName", "whenCreated", "whenChanged", "objectGUID", "objectSid"
  ];
  
  // Object type specific attributes
  const specificAttributes: Record<string, string[]> = {
    users: [
      "sAMAccountName", "userPrincipalName", "givenName", "sn", "mail", 
      "telephoneNumber", "mobile", "title", "department", "company", 
      "manager", "employeeID", "employeeNumber", "memberOf", "userAccountControl",
      "pwdLastSet", "lastLogon", "lastLogonTimestamp", "accountExpires", "badPwdCount",
      "logonCount", "homeDirectory", "homeDrive", "scriptPath", "profilePath",
      "lockoutTime", "country", "st", "l", "streetAddress", "postalCode", "otherTelephone"
    ],
    groups: [
      "sAMAccountName", "groupType", "member", "memberOf", "managedBy", "msDS-PrincipalName",
      "mail", "info", "groupCategory", "adminCount", "proxyAddresses"
    ],
    computers: [
      "sAMAccountName", "operatingSystem", "operatingSystemVersion", "operatingSystemServicePack",
      "dNSHostName", "servicePrincipalName", "lastLogonTimestamp", "pwdLastSet", 
      "userAccountControl", "managedBy", "location", "serialNumber", "msDS-SupportedEncryptionTypes",
      "networkAddress", "primaryGroupID"
    ],
    ous: [
      "ou", "name", "description", "distinguishedName", "managedBy", "gPLink", "gPOptions",
      "msDS-Approx-Immed-Subordinates", "streetAddress", "l", "st", "postalCode", "c"
    ]
  };
  
  try {
    // Try to dynamically retrieve schema info for more attributes
    // This gets attributes from the schema for the specific object class
    let dynamicAttributes: string[] = [];
    let objectClass: string;
    
    switch (targetObject) {
      case "users":
        objectClass = "user";
        break;
      case "groups":
        objectClass = "group";
        break;
      case "computers":
        objectClass = "computer";
        break;
      case "ous":
        objectClass = "organizationalUnit";
        break;
    }
    
    try {
      // Attempt to query the schema - we need to try different base DNs since the schema location varies
      let schemaResults: Record<string, any>[] = [];
      
      // Try common locations for the schema (most AD servers will use one of these)
      const schemaLocations = [
        "CN=Schema,CN=Configuration,DC=domain,DC=com", // Generic example
        "CN=Schema,CN=Configuration,DC=ad,DC=example,DC=com",
        "CN=Schema,CN=Configuration,DC=example,DC=com",
        "CN=Schema,CN=Configuration",
        "CN=Schema",
      ];
      
      let schemaFound = false;
      for (const schemaLocation of schemaLocations) {
        try {
          schemaResults = await searchLdap(client, {
            base: schemaLocation,
            filter: `(&(objectClass=attributeSchema)(|(attributeSyntax=2.5.5.8)(attributeSyntax=2.5.5.9)(attributeSyntax=2.5.5.12)))`,
            scope: "sub",
            attributes: ["lDAPDisplayName", "attributeSyntax", "isSingleValued"],
            limit: 500
          });
          if (schemaResults.length > 0) {
            schemaFound = true;
            debug(`Found schema at ${schemaLocation} with ${schemaResults.length} attributes`);
            break;
          }
        } catch (locationError) {
          debug(`Schema not found at ${schemaLocation}: ${locationError instanceof Error ? locationError.message : String(locationError)}`);
          // Continue trying other locations
        }
      }
      
      if (!schemaFound) {
        debug("Could not find schema in any of the standard locations");
      }
      
      dynamicAttributes = schemaResults.map(attr => attr.lDAPDisplayName);
      debug(`Retrieved ${dynamicAttributes.length} attributes from schema`);
    } catch (schemaError) {
      debug("Failed to retrieve attributes from schema, using predefined list:", schemaError);
      // Continue with the predefined attributes
    }
    
    // Combine common and specific attributes, then add dynamic attributes
    let allAttributes = [...commonAttributes, ...specificAttributes[targetObject]];
    
    // Add any dynamic attributes that aren't already in our list
    dynamicAttributes.forEach(attr => {
      if (!allAttributes.includes(attr)) {
        allAttributes.push(attr);
      }
    });
    
    // Sort alphabetically
    return allAttributes.sort();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug("Failed to get LDAP available attributes:", error);
    // Return a default set of attributes instead of throwing
    return [...commonAttributes, ...specificAttributes[targetObject]].sort();
  }
}