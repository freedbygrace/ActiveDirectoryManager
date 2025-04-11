import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { roles, rolePermissions, users, apiTokens } from "@shared/schema";
import { eq, or, and, inArray } from "drizzle-orm";

// Types for role-based access control
export type RequireAuthOptions = {
  allowApiToken?: boolean;
};

export type RequirePermissionOptions = RequireAuthOptions & {
  anyOf?: string[];
  allOf?: string[];
};

// Default middleware that verifies a user is authenticated
export function requireAuth(options: RequireAuthOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check for session authentication
    if (req.isAuthenticated()) {
      return next();
    }

    // Check for API token authentication if allowed
    if (options.allowApiToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        
        try {
          // Lookup the token
          const [apiToken] = await db.select()
            .from(apiTokens)
            .where(eq(apiTokens.token, token))
            .limit(1);

          if (!apiToken) {
            return res.status(401).json({ message: "Invalid API token" });
          }

          // Check if token has expired
          if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) {
            return res.status(401).json({ message: "API token has expired" });
          }

          // Set token info on the request
          req.user = {
            id: apiToken.userId,
            username: '',
            password: '',
            fullName: null, 
            email: null,
            createdAt: null,
            // Add tokenId for identifying which token was used
            tokenId: apiToken.id,
            // Add roleId for permission checking
            roleId: apiToken.roleId,
            // Store custom permissions if available
            customPermissions: (Array.isArray(apiToken.customPermissions) ? 
              apiToken.customPermissions : 
              (apiToken.customPermissions ? JSON.parse(String(apiToken.customPermissions)) : [])) as string[]
          };

          return next();
        } catch (error) {
          console.error("API token authentication error:", error);
          return res.status(500).json({ message: "Internal server error" });
        }
      }
    }

    // Not authenticated through any method
    return res.status(401).json({ message: "Not authenticated" });
  };
}

// Middleware for checking specific permissions
export function requirePermission(permission: string, options: RequirePermissionOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First ensure the user is authenticated
    const authMiddleware = requireAuth(options);
    
    authMiddleware(req, res, async () => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "Not authenticated" });
        }

        // Get the permissions for the user's role
        let hasPermission = false;
        
        // Check for API token custom permissions first if present
        if (req.user?.tokenId && Array.isArray(req.user?.customPermissions)) {
          // For API tokens with custom permissions
          const customPermissions = req.user.customPermissions;
          if (customPermissions.includes(permission) ||
              options.anyOf?.some(p => customPermissions.includes(p))) {
            hasPermission = true;
          }
        } 
        
        // If no permission yet, check role-based permissions
        if (!hasPermission && req.user.roleId) {
          // Get permissions assigned to the role
          const rolePerms = await db.select()
            .from(rolePermissions)
            .where(eq(rolePermissions.roleId, req.user.roleId));
          
          const userPermissions = rolePerms.map(rp => rp.permission);

          // Check for the specific permission or any of the optional permissions
          if (userPermissions.includes(permission) || 
              options.anyOf?.some(p => userPermissions.includes(p))) {
            hasPermission = true;
          }
          
          // If allOf is specified, ensure all required permissions are present
          if (options.allOf && options.allOf.length > 0) {
            hasPermission = options.allOf.every(p => userPermissions.includes(p));
          }
        }
        
        // Check if user has the admin:system permission which grants all access
        if (!hasPermission && req.user.roleId) {
          const adminPerm = await db.select()
            .from(rolePermissions)
            .where(and(
              eq(rolePermissions.roleId, req.user.roleId),
              eq(rolePermissions.permission, "admin:system")
            ))
            .limit(1);
            
          if (adminPerm.length > 0) {
            hasPermission = true;
          }
        }

        if (hasPermission) {
          return next();
        }

        return res.status(403).json({ message: "Insufficient permissions" });
      } catch (error) {
        console.error("Permission check error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    });
  };
}

// Convenience middleware for requiring administrative access
export function requireAdmin() {
  return requirePermission("admin:system");
}

// Get permissions for a user
export async function getUserPermissions(userId: number): Promise<string[]> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
  if (!user || !user.roleId) {
    return [];
  }

  const rolePerms = await db.select()
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, user.roleId));
    
  return rolePerms.map(rp => rp.permission);
}

// Check if a request has a specific permission
export async function checkPermission(req: Request, permission: string): Promise<boolean> {
  if (!req.user) {
    return false;
  }
  
  let hasPermission = false;
  
  // Check for API token custom permissions first if present
  if (req.user?.tokenId && Array.isArray(req.user?.customPermissions)) {
    // For API tokens with custom permissions
    const customPermissions = req.user.customPermissions;
    if (customPermissions.includes(permission)) {
      hasPermission = true;
    }
  } 
  
  // If no permission yet, check role-based permissions
  if (!hasPermission && req.user.roleId) {
    // Get permissions assigned to the role
    const rolePerms = await db.select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, req.user.roleId));
    
    const userPermissions = rolePerms.map(rp => rp.permission);

    // Check for the specific permission
    if (userPermissions.includes(permission)) {
      hasPermission = true;
    }
  }
  
  // Check if user has the admin:system permission which grants all access
  if (!hasPermission && req.user.roleId) {
    const adminPerm = await db.select()
      .from(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, req.user.roleId),
        eq(rolePermissions.permission, "admin:system")
      ))
      .limit(1);
      
    if (adminPerm.length > 0) {
      hasPermission = true;
    }
  }
  
  return hasPermission;
}

// Initialize on server startup to ensure default roles
export async function initializeRBAC() {
  try {
    // Check for existing data before doing anything
    const [adminRole] = await db.select()
      .from(roles)
      .where(eq(roles.name, "admin"))
      .limit(1);
      
    if (adminRole) {
      console.log("RBAC already initialized");
      return true;
    }
    
    console.log("RBAC initialization skipped - should be handled by updateSchema.ts");
    return true;
  } catch (error) {
    console.error("Failed to initialize RBAC:", error);
    return false;
  }
}