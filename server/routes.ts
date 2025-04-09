import type { Express, Request as ExpressRequest, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupSwagger } from "./swagger";
import { storage } from "./storage";
import { db } from "./db";
import { 
  apiQuerySchema, 
  PERMISSIONS, 
  moveComputerSchema, 
  moveUserSchema, 
  addToGroupSchema, 
  removeFromGroupSchema,
  updateManagedBySchema,
  adUsers,
  adGroups,
  adOrgUnits,
  adComputers,
  adDomains
} from "@shared/schema";
import { ZodError } from "zod";
import rateLimit from "express-rate-limit";
import { 
  requireAuth, 
  requirePermission, 
  requireAdmin, 
  initializeRBAC
} from "./authorization";
import { ldapClient } from "./ldap";
import { 
  applyFilterConditions, 
  generatePaginationMetadata, 
  parseFilter, 
  parsePagination 
} from "./query-parser";
import { eq, sql } from "drizzle-orm";

// Extend Express Request to include user property
interface Request extends ExpressRequest {
  user: {
    id: number;
    username: string;
    roleId?: number;
    [key: string]: any;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  const { authenticateApiToken } = setupAuth(app);

  // Setup Swagger documentation
  setupSwagger(app);

  // Initialize Role Based Access Control system
  await initializeRBAC();
  
  // Apply rate limiting middleware for API routes
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { message: 'Too many requests, please try again later.' },
    skip: (req: any) => {
      // Skip rate limiting for authenticated users with admin role
      if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
        return req.user?.role === 'admin';
      }
      return false;
    }
  });

  // Apply the rate limiter to API routes
  app.use('/api/', apiLimiter);

  // Error handler for Zod validation errors
  const handleZodError = (err: ZodError, res: Response) => {
    return res.status(400).json({
      message: "Validation error",
      errors: err.errors,
    });
  };

  // Parse query parameters
  const parseQueryParams = (req: Request) => {
    try {
      return apiQuerySchema.parse(req.query);
    } catch (err) {
      if (err instanceof ZodError) {
        console.error("Query parameter validation error:", err.errors);
        return undefined;
      }
      throw err;
    }
  };

  /**
   * @swagger
   * /api/ldap-connections:
   *   get:
   *     summary: List all LDAP connections
   *     tags: [LDAP Connections]
   *     security:
   *       - cookieAuth: []
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: A list of LDAP connections
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapConnection'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  app.get("/api/ldap-connections", requirePermission(PERMISSIONS.VIEW_LDAP_CONNECTIONS, { allowApiToken: true }), async (req, res, next) => {
    try {
      const connections = await storage.listLdapConnections();
      
      // Hide sensitive fields like password
      const safeConnections = connections.map(conn => {
        const { password, ...safeConn } = conn;
        return safeConn;
      });
      
      res.json(safeConnections);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/ldap-connections:
   *   post:
   *     summary: Create a new LDAP connection
   *     tags: [LDAP Connections]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - server
   *               - domain
   *               - username
   *               - password
   *             properties:
   *               name:
   *                 type: string
   *               server:
   *                 type: string
   *               domain:
   *                 type: string
   *               port:
   *                 type: integer
   *                 default: 389
   *               useSSL:
   *                 type: boolean
   *                 default: true
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       201:
   *         description: Connection created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapConnection'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  app.post("/api/ldap-connections", requireAdmin, async (req, res, next) => {
    try {
      const connection = await storage.createLdapConnection(req.body);
      
      // Hide password in response
      const { password, ...safeConn } = connection;
      
      res.status(201).json(safeConn);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/ldap-connections/{id}:
   *   get:
   *     summary: Get a specific LDAP connection
   *     tags: [LDAP Connections]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: LDAP connection details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapConnection'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/ldap-connections/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const connection = await storage.getLdapConnection(parseInt(req.params.id));
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      // Hide password in response
      const { password, ...safeConn } = connection;
      
      res.json(safeConn);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/ldap-connections/{id}:
   *   put:
   *     summary: Update a LDAP connection
   *     tags: [LDAP Connections]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               server:
   *                 type: string
   *               domain:
   *                 type: string
   *               port:
   *                 type: integer
   *               useSSL:
   *                 type: boolean
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Connection updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapConnection'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.put("/api/ldap-connections/:id", requireAdmin, async (req, res, next) => {
    try {
      const updatedConnection = await storage.updateLdapConnection(parseInt(req.params.id), req.body);
      
      if (!updatedConnection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      // Hide password in response
      const { password, ...safeConn } = updatedConnection;
      
      res.json(safeConn);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/ldap-connections/{id}:
   *   delete:
   *     summary: Delete a LDAP connection
   *     tags: [LDAP Connections]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Connection deleted successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.delete("/api/ldap-connections/:id", requireAdmin, async (req, res, next) => {
    try {
      const deleted = await storage.deleteLdapConnection(parseInt(req.params.id));
      
      if (!deleted) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/tokens:
   *   get:
   *     summary: List all API tokens for current user
   *     tags: [API Tokens]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: A list of API tokens
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ApiToken'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  app.get("/api/tokens", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const tokens = await storage.listApiTokensByUserId(req.user.id);
      res.json(tokens);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/tokens/{id}:
   *   delete:
   *     summary: Delete an API token
   *     tags: [API Tokens]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Token deleted successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.delete("/api/tokens/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const token = await storage.getApiToken(parseInt(req.params.id));
      
      if (!token) {
        return res.status(404).json({ message: "Token not found" });
      }
      
      // Only allow users to delete their own tokens unless they're admin
      if (token.userId !== req.user.id) {
        // Get the user's role
        const userRole = await storage.getRole(req.user.roleId!);
        
        if (userRole?.name !== "admin") {
          return res.status(403).json({ message: "Forbidden: You cannot delete tokens that don't belong to you" });
        }
      }
      
      const deleted = await storage.deleteApiToken(parseInt(req.params.id));
      
      if (!deleted) {
        return res.status(404).json({ message: "Token not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: List all users (admin only)
   *     tags: [Users]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: A list of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         description: Forbidden - admin access required
   */
  app.get("/api/users", requireAdmin, async (req, res, next) => {
    try {
      const users = await storage.listUsers();
      
      // Remove passwords from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-users:
   *   get:
   *     summary: List AD users from the specified LDAP connection
   *     tags: [AD Users]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - $ref: '#/components/parameters/filterParam'
   *       - $ref: '#/components/parameters/selectParam'
   *       - $ref: '#/components/parameters/expandParam'
   *       - $ref: '#/components/parameters/orderByParam'
   *       - $ref: '#/components/parameters/topParam'
   *       - $ref: '#/components/parameters/skipParam'
   *     responses:
   *       200:
   *         description: A list of AD users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/AdUser'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  app.get("/api/connections/:connectionId/ad-users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() && !req.headers.authorization) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const query = parseQueryParams(req);
      const users = await storage.listAdUsers(connectionId, query);
      
      // Count total records for pagination metadata
      const countQuery = db.select({ count: sql`count(*)` }).from(adUsers)
        .where(eq(adUsers.connectionId, connectionId));
      
      // Apply filters if present
      if (query && query.filter) {
        const conditions = parseFilter(query.filter);
        const whereClause = applyFilterConditions(adUsers, conditions);
        if (whereClause) {
          countQuery.where(whereClause);
        }
      }
      
      const [countResult] = await countQuery;
      const totalRecords = Number(countResult?.count || 0);
      
      // Add objectType to each result
      const usersWithObjectType = users.map(user => ({
        ...user,
        objectType: 'user'
      }));
      
      // Generate pagination metadata
      const { limit, offset } = parsePagination(query?.top, query?.skip);
      const paginationMetadata = generatePaginationMetadata(
        totalRecords,
        limit,
        offset,
        `${req.protocol}://${req.get('host')}${req.originalUrl}`
      );
      
      // Return data with pagination metadata
      res.json({
        data: usersWithObjectType,
        ...paginationMetadata
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-users:
   *   post:
   *     summary: Create a new AD user
   *     tags: [AD Users]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - distinguishedName
   *               - sAMAccountName
   *             properties:
   *               distinguishedName:
   *                 type: string
   *               sAMAccountName:
   *                 type: string
   *               userPrincipalName:
   *                 type: string
   *               givenName:
   *                 type: string
   *               surname:
   *                 type: string
   *               displayName:
   *                 type: string
   *               email:
   *                 type: string
   *               enabled:
   *                 type: boolean
   *               adProperties:
   *                 type: object
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AdUser'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  app.post("/api/connections/:connectionId/ad-users", authenticateApiToken, async (req, res, next) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const userData = { ...req.body, connectionId };
      const user = await storage.createAdUser(userData);
      
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-users/{id}:
   *   get:
   *     summary: Get a specific AD user
   *     tags: [AD Users]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - $ref: '#/components/parameters/selectParam'
   *     responses:
   *       200:
   *         description: AD user details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AdUser'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/connections/:connectionId/ad-users/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() && !req.headers.authorization) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const user = await storage.getAdUser(parseInt(req.params.id));
      
      if (!user || user.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD user not found" });
      }
      
      // Apply property selection if specified
      let result = user;
      if (req.query.select) {
        const properties = (req.query.select as string).split(',');
        const selectedUser: any = { id: user.id };
        properties.forEach(prop => {
          if ((user as any)[prop] !== undefined) {
            selectedUser[prop] = (user as any)[prop];
          }
        });
        result = selectedUser as typeof user;
      }
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-users/{id}:
   *   put:
   *     summary: Update an AD user
   *     tags: [AD Users]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               distinguishedName:
   *                 type: string
   *               sAMAccountName:
   *                 type: string
   *               userPrincipalName:
   *                 type: string
   *               givenName:
   *                 type: string
   *               surname:
   *                 type: string
   *               displayName:
   *                 type: string
   *               email:
   *                 type: string
   *               enabled:
   *                 type: boolean
   *               adProperties:
   *                 type: object
   *     responses:
   *       200:
   *         description: User updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AdUser'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  /**
   * @swagger
   * /api/connections/{connectionId}/ad-users/{id}:
   *   put:
   *     summary: Update an AD user
   *     tags: [AD Users]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               givenName: 
   *                 type: string
   *               surname:
   *                 type: string
   *               displayName:
   *                 type: string
   *               email:
   *                 type: string
   *               enabled:
   *                 type: boolean
   *               userPrincipalName:
   *                 type: string
   *               adProperties:
   *                 type: object
   *     responses:
   *       200:
   *         description: Updated AD user
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AdUser'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.put("/api/connections/:connectionId/ad-users/:id", authenticateApiToken, async (req, res, next) => {
    try {
      const user = await storage.getAdUser(parseInt(req.params.id));
      
      if (!user || user.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD user not found" });
      }
      
      const updatedUser = await storage.updateAdUser(parseInt(req.params.id), req.body);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-users/{id}:
   *   delete:
   *     summary: Delete an AD user
   *     tags: [AD Users]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: User deleted successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.delete("/api/connections/:connectionId/ad-users/:id", authenticateApiToken, async (req, res, next) => {
    try {
      const user = await storage.getAdUser(parseInt(req.params.id));
      
      if (!user || user.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD user not found" });
      }
      
      const deleted = await storage.deleteAdUser(parseInt(req.params.id));
      
      if (!deleted) {
        return res.status(404).json({ message: "AD user not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-groups/{id}:
   *   put:
   *     summary: Update an AD group
   *     tags: [AD Groups]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               distinguishedName:
   *                 type: string
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               groupScope:
   *                 type: string
   *                 enum: [DomainLocal, Global, Universal]
   *               groupType:
   *                 type: string
   *                 enum: [Security, Distribution]
   *               members:
   *                 type: array
   *                 items:
   *                   type: string
   *               adProperties:
   *                 type: object
   *     responses:
   *       200:
   *         description: Group updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AdGroup'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   */
  app.put("/api/connections/:connectionId/ad-groups/:id", authenticateApiToken, async (req, res, next) => {
    try {
      const group = await storage.getAdGroup(parseInt(req.params.id));
      
      if (!group || group.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD group not found" });
      }
      
      const updatedGroup = await storage.updateAdGroup(parseInt(req.params.id), req.body);
      res.json(updatedGroup);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-groups/{id}:
   *   delete:
   *     summary: Delete an AD group
   *     tags: [AD Groups]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Group deleted successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.delete("/api/connections/:connectionId/ad-groups/:id", authenticateApiToken, async (req, res, next) => {
    try {
      const group = await storage.getAdGroup(parseInt(req.params.id));
      
      if (!group || group.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD group not found" });
      }
      
      const deleted = await storage.deleteAdGroup(parseInt(req.params.id));
      
      if (!deleted) {
        return res.status(404).json({ message: "AD group not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });
  
  // Similar endpoints for AD Groups
  /**
   * @swagger
   * /api/connections/{connectionId}/ad-groups:
   *   get:
   *     summary: List AD groups from the specified LDAP connection
   *     tags: [AD Groups]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - $ref: '#/components/parameters/filterParam'
   *       - $ref: '#/components/parameters/selectParam'
   *       - $ref: '#/components/parameters/expandParam'
   *       - $ref: '#/components/parameters/orderByParam'
   *       - $ref: '#/components/parameters/topParam'
   *       - $ref: '#/components/parameters/skipParam'
   *     responses:
   *       200:
   *         description: A list of AD groups
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/AdGroup'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/connections/:connectionId/ad-groups", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() && !req.headers.authorization) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const query = parseQueryParams(req);
      const groups = await storage.listAdGroups(connectionId, query);
      
      // Count total records for pagination metadata
      const countQuery = db.select({ count: sql`count(*)` }).from(adGroups)
        .where(eq(adGroups.connectionId, connectionId));
      
      // Apply filters if present
      if (query && query.filter) {
        const conditions = parseFilter(query.filter);
        const whereClause = applyFilterConditions(adGroups, conditions);
        if (whereClause) {
          countQuery.where(whereClause);
        }
      }
      
      const [countResult] = await countQuery;
      const totalRecords = Number(countResult?.count || 0);
      
      // Add objectType to each result
      const groupsWithObjectType = groups.map(group => ({
        ...group,
        objectType: 'group'
      }));
      
      // Generate pagination metadata
      const { limit, offset } = parsePagination(query?.top, query?.skip);
      const paginationMetadata = generatePaginationMetadata(
        totalRecords,
        limit,
        offset,
        `${req.protocol}://${req.get('host')}${req.originalUrl}`
      );
      
      // Return data with pagination metadata
      res.json({
        data: groupsWithObjectType,
        ...paginationMetadata
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/connections/{connectionId}/ad-groups:
   *   post:
   *     summary: Create a new Active Directory group
   *     tags: [AD Groups]
   *     security:
   *       - cookieAuth: []
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: connectionId
   *         required: true
   *         schema:
   *           type: integer
   *         description: LDAP connection ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - parentDN
   *             properties:
   *               name:
   *                 type: string
   *                 description: The name of the group (will be used for cn and sAMAccountName)
   *               parentDN:
   *                 type: string
   *                 description: The distinguished name of the parent container (OU or domain)
   *               description:
   *                 type: string
   *                 description: Group description
   *               groupType:
   *                 type: string
   *                 enum: ['Global', 'DomainLocal', 'Universal']
   *                 default: 'Global'
   *                 description: Group scope type
   *               groupCategory:
   *                 type: string
   *                 enum: ['Security', 'Distribution']
   *                 default: 'Security'
   *                 description: Group category type
   *     responses:
   *       201:
   *         description: Group created successfully
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       500:
   *         description: Server error
   */
  app.post("/api/connections/:connectionId/ad-groups", authenticateApiToken, requirePermission(PERMISSIONS.CREATE_AD_GROUPS), async (req: Request, res, next) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const { name, parentDN, description, groupType = 'Global', groupCategory = 'Security' } = req.body;
      
      // Basic validation
      if (!name || !parentDN) {
        return res.status(400).json({ message: "Group name and parent DN are required" });
      }

      // Get connection
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      // Create the DN for the new group
      const groupDN = `CN=${name},${parentDN}`;
      
      // Set the group type value based on type and category
      const groupTypeValue = 
        (groupCategory === 'Security' ? 0x80000000 : 0) | 
        (groupType === 'Global' ? 0x2 : groupType === 'Universal' ? 0x8 : 0x4);
      
      // Attributes for the new group
      const groupAttributes = {
        objectClass: ['top', 'group'],
        cn: name,
        sAMAccountName: name,
        description: description || '',
        groupType: groupTypeValue.toString()
      };
      
      // Create the group in AD
      await ldapClient.createEntry(connectionId, groupDN, groupAttributes);
      
      // Search for the newly created group to get its attributes
      const searchResults = await ldapClient.searchGroups(connectionId, `(&(objectClass=group)(cn=${name}))`, [
        'objectGUID', 'distinguishedName', 'canonicalName', 'cn', 'sAMAccountName', 'description', 'groupType'
      ]);
      
      if (!searchResults || searchResults.length === 0) {
        return res.status(500).json({ message: "Group created but could not retrieve details" });
      }
      
      const adGroup = searchResults[0];
      
      // Store in database
      const storedGroup = await storage.createAdGroup({
        connectionId,
        objectGUID: adGroup.objectGUID,
        distinguishedName: adGroup.distinguishedName,
        canonicalName: adGroup.canonicalName,
        cn: adGroup.cn,
        sAMAccountName: adGroup.sAMAccountName,
        groupType: groupCategory + ' ' + groupType,
        description: adGroup.description,
        members: [], // No members initially
        adProperties: adGroup // Store all attributes
      });
      
      // Add audit log
      await storage.createAuditLogEntry({
        userId: req.user.id,
        connectionId,
        action: 'create',
        targetId: storedGroup.id.toString(),
        details: {
          objectType: 'group',
          objectName: name,
          distinguishedName: groupDN,
          groupType: groupCategory + ' ' + groupType
        }
      });
      
      res.status(201).json(storedGroup);
    } catch (err) {
      console.error("Error creating AD group:", err);
      if (err.message && err.message.includes('Entry Already Exists')) {
        return res.status(409).json({ message: "Group already exists" });
      }
      next(err);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-org-units/{id}:
   *   put:
   *     summary: Update an AD organizational unit
   *     tags: [AD Organizational Units]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               distinguishedName:
   *                 type: string
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               parentOu:
   *                 type: string
   *               adProperties:
   *                 type: object
   *     responses:
   *       200:
   *         description: Organizational unit updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AdOrgUnit'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   */
  app.put("/api/connections/:connectionId/ad-org-units/:id", authenticateApiToken, async (req, res, next) => {
    try {
      const orgUnit = await storage.getAdOrgUnit(parseInt(req.params.id));
      
      if (!orgUnit || orgUnit.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD organizational unit not found" });
      }
      
      const updatedOrgUnit = await storage.updateAdOrgUnit(parseInt(req.params.id), req.body);
      res.json(updatedOrgUnit);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-org-units/{id}:
   *   delete:
   *     summary: Delete an AD organizational unit
   *     tags: [AD Organizational Units]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Organizational unit deleted successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.delete("/api/connections/:connectionId/ad-org-units/:id", authenticateApiToken, async (req, res, next) => {
    try {
      const orgUnit = await storage.getAdOrgUnit(parseInt(req.params.id));
      
      if (!orgUnit || orgUnit.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD organizational unit not found" });
      }
      
      const deleted = await storage.deleteAdOrgUnit(parseInt(req.params.id));
      
      if (!deleted) {
        return res.status(404).json({ message: "AD organizational unit not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });
  
  // Organizational Units endpoints
  /**
   * @swagger
   * /api/connections/{connectionId}/ad-org-units:
   *   get:
   *     summary: List AD organizational units from the specified LDAP connection
   *     tags: [AD Organizational Units]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - $ref: '#/components/parameters/filterParam'
   *       - $ref: '#/components/parameters/selectParam'
   *       - $ref: '#/components/parameters/expandParam'
   *       - $ref: '#/components/parameters/orderByParam'
   *       - $ref: '#/components/parameters/topParam'
   *       - $ref: '#/components/parameters/skipParam'
   *     responses:
   *       200:
   *         description: A list of AD organizational units
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/AdOrgUnit'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/connections/:connectionId/ad-org-units", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() && !req.headers.authorization) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const query = parseQueryParams(req);
      const orgUnits = await storage.listAdOrgUnits(connectionId, query);
      
      // Count total records for pagination metadata
      const countQuery = db.select({ count: sql`count(*)` }).from(adOrgUnits)
        .where(eq(adOrgUnits.connectionId, connectionId));
      
      // Apply filters if present
      if (query && query.filter) {
        const conditions = parseFilter(query.filter);
        const whereClause = applyFilterConditions(adOrgUnits, conditions);
        if (whereClause) {
          countQuery.where(whereClause);
        }
      }
      
      const [countResult] = await countQuery;
      const totalRecords = Number(countResult?.count || 0);
      
      // Add objectType to each result
      const orgUnitsWithObjectType = orgUnits.map(ou => ({
        ...ou,
        objectType: 'organizationalUnit'
      }));
      
      // Generate pagination metadata
      const { limit, offset } = parsePagination(query?.top, query?.skip);
      const paginationMetadata = generatePaginationMetadata(
        totalRecords,
        limit,
        offset,
        `${req.protocol}://${req.get('host')}${req.originalUrl}`
      );
      
      // Return data with pagination metadata
      res.json({
        data: orgUnitsWithObjectType,
        ...paginationMetadata
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-computers/{id}:
   *   put:
   *     summary: Update an AD computer
   *     tags: [AD Computers]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               distinguishedName:
   *                 type: string
   *               name:
   *                 type: string
   *               dnsHostName:
   *                 type: string
   *               description:
   *                 type: string
   *               operatingSystem:
   *                 type: string
   *               operatingSystemVersion:
   *                 type: string
   *               enabled:
   *                 type: boolean
   *               adProperties:
   *                 type: object
   *     responses:
   *       200:
   *         description: Computer updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AdComputer'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   */
  app.put("/api/connections/:connectionId/ad-computers/:id", authenticateApiToken, async (req, res, next) => {
    try {
      const computer = await storage.getAdComputer(parseInt(req.params.id));
      
      if (!computer || computer.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD computer not found" });
      }
      
      const updatedComputer = await storage.updateAdComputer(parseInt(req.params.id), req.body);
      res.json(updatedComputer);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-computers/{id}:
   *   delete:
   *     summary: Delete an AD computer
   *     tags: [AD Computers]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Computer deleted successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.delete("/api/connections/:connectionId/ad-computers/:id", authenticateApiToken, async (req, res, next) => {
    try {
      const computer = await storage.getAdComputer(parseInt(req.params.id));
      
      if (!computer || computer.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD computer not found" });
      }
      
      const deleted = await storage.deleteAdComputer(parseInt(req.params.id));
      
      if (!deleted) {
        return res.status(404).json({ message: "AD computer not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });
  
  // Computers endpoints
  /**
   * @swagger
   * /api/connections/{connectionId}/ad-computers:
   *   get:
   *     summary: List AD computers from the specified LDAP connection
   *     tags: [AD Computers]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - $ref: '#/components/parameters/filterParam'
   *       - $ref: '#/components/parameters/selectParam'
   *       - $ref: '#/components/parameters/expandParam'
   *       - $ref: '#/components/parameters/orderByParam'
   *       - $ref: '#/components/parameters/topParam'
   *       - $ref: '#/components/parameters/skipParam'
   *     responses:
   *       200:
   *         description: A list of AD computers
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/AdComputer'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/connections/:connectionId/ad-computers", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() && !req.headers.authorization) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const query = parseQueryParams(req);
      const computers = await storage.listAdComputers(connectionId, query);
      
      // Count total records for pagination metadata
      const countQuery = db.select({ count: sql`count(*)` }).from(adComputers)
        .where(eq(adComputers.connectionId, connectionId));
      
      // Apply filters if present
      if (query && query.filter) {
        const conditions = parseFilter(query.filter);
        const whereClause = applyFilterConditions(adComputers, conditions);
        if (whereClause) {
          countQuery.where(whereClause);
        }
      }
      
      const [countResult] = await countQuery;
      const totalRecords = Number(countResult?.count || 0);
      
      // Add objectType to each result
      const computersWithObjectType = computers.map(computer => ({
        ...computer,
        objectType: 'computer'
      }));
      
      // Generate pagination metadata
      const { limit, offset } = parsePagination(query?.top, query?.skip);
      const paginationMetadata = generatePaginationMetadata(
        totalRecords,
        limit,
        offset,
        `${req.protocol}://${req.get('host')}${req.originalUrl}`
      );
      
      // Return data with pagination metadata
      res.json({
        data: computersWithObjectType,
        ...paginationMetadata
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/connections/{connectionId}/ad-computers:
   *   post:
   *     summary: Create a new Active Directory computer
   *     tags: [AD Computers]
   *     security:
   *       - cookieAuth: []
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: connectionId
   *         required: true
   *         schema:
   *           type: integer
   *         description: LDAP connection ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - parentDN
   *             properties:
   *               name:
   *                 type: string
   *                 description: The name of the computer (will be used for cn and sAMAccountName)
   *               parentDN:
   *                 type: string
   *                 description: The distinguished name of the parent container (OU or domain)
   *               description:
   *                 type: string
   *                 description: Computer description
   *               dnsHostName:
   *                 type: string
   *                 description: DNS host name of the computer
   *               operatingSystem:
   *                 type: string
   *                 description: Operating system of the computer
   *               operatingSystemVersion:
   *                 type: string
   *                 description: Operating system version
   *               enabled:
   *                 type: boolean
   *                 default: true
   *                 description: Whether the computer account is enabled
   *     responses:
   *       201:
   *         description: Computer created successfully
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       500:
   *         description: Server error
   */
  app.post("/api/connections/:connectionId/ad-computers", authenticateApiToken, requirePermission(PERMISSIONS.CREATE_AD_COMPUTERS), async (req: Request, res, next) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const { 
        name, 
        parentDN, 
        description, 
        dnsHostName, 
        operatingSystem, 
        operatingSystemVersion, 
        enabled = true 
      } = req.body;
      
      // Basic validation
      if (!name || !parentDN) {
        return res.status(400).json({ message: "Computer name and parent DN are required" });
      }

      // Get connection
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      // Create the DN for the new computer
      const computerDN = `CN=${name},${parentDN}`;
      
      // The sAMAccountName needs to end with $
      const sAMAccountName = name.endsWith('$') ? name : `${name}$`;
      
      // Create the userAccountControl value
      // 4096 = WORKSTATION_TRUST_ACCOUNT
      // 2 = ACCOUNTDISABLE (if not enabled)
      const userAccountControl = enabled ? 4096 : 4098;
      
      // Set the dnsHostName if not provided
      const actualDnsHostName = dnsHostName || `${name}.${connection.domain}`;
      
      // Attributes for the new computer
      const computerAttributes: {
        objectClass: string[];
        cn: string;
        sAMAccountName: string;
        userAccountControl: string;
        description: string;
        dNSHostName: string;
        operatingSystem?: string;
        operatingSystemVersion?: string;
      } = {
        objectClass: ['top', 'computer'],
        cn: name,
        sAMAccountName: sAMAccountName,
        userAccountControl: userAccountControl.toString(),
        description: description || '',
        dNSHostName: actualDnsHostName
      };
      
      // Add operating system information if provided
      if (operatingSystem) {
        computerAttributes.operatingSystem = operatingSystem;
      }
      
      if (operatingSystemVersion) {
        computerAttributes.operatingSystemVersion = operatingSystemVersion;
      }
      
      // Create the computer in AD
      await ldapClient.createEntry(connectionId, computerDN, computerAttributes);
      
      // Search for the newly created computer to get its attributes
      const searchResults = await ldapClient.searchComputers(connectionId, `(&(objectClass=computer)(cn=${name}))`, [
        'objectGUID', 'distinguishedName', 'canonicalName', 'cn', 'sAMAccountName', 'description',
        'dNSHostName', 'operatingSystem', 'operatingSystemVersion', 'userAccountControl'
      ]);
      
      if (!searchResults || searchResults.length === 0) {
        return res.status(500).json({ message: "Computer created but could not retrieve details" });
      }
      
      const adComputer = searchResults[0];
      
      // Store in database
      const storedComputer = await storage.createAdComputer({
        connectionId,
        objectGUID: adComputer.objectGUID,
        distinguishedName: adComputer.distinguishedName,
        canonicalName: adComputer.canonicalName,
        cn: adComputer.cn,
        name: adComputer.cn,
        sAMAccountName: adComputer.sAMAccountName,
        dnsHostName: adComputer.dNSHostName,
        operatingSystem: adComputer.operatingSystem,
        operatingSystemVersion: adComputer.operatingSystemVersion,
        enabled: (parseInt(adComputer.userAccountControl) & 2) === 0, // Check if ACCOUNTDISABLE flag is not set
        adProperties: adComputer // Store all attributes
      });
      
      // Add audit log
      await storage.createAuditLogEntry({
        userId: req.user.id,
        connectionId,
        action: 'create',
        targetId: storedComputer.id.toString(),
        details: {
          distinguishedName: computerDN,
          enabled: enabled,
          name: name
        }
      });
      
      res.status(201).json(storedComputer);
    } catch (err) {
      console.error("Error creating AD computer:", err);
      if (err.message && err.message.includes('Entry Already Exists')) {
        return res.status(409).json({ message: "Computer already exists" });
      }
      next(err);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-domains/{id}:
   *   put:
   *     summary: Update an AD domain
   *     tags: [AD Domains]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               distinguishedName:
   *                 type: string
   *               name:
   *                 type: string
   *               netBIOSName:
   *                 type: string
   *               forestName:
   *                 type: string
   *               domainFunctionality:
   *                 type: string
   *               adProperties:
   *                 type: object
   *     responses:
   *       200:
   *         description: Domain updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AdDomain'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   */
  app.put("/api/connections/:connectionId/ad-domains/:id", authenticateApiToken, async (req, res, next) => {
    try {
      const domain = await storage.getAdDomain(parseInt(req.params.id));
      
      if (!domain || domain.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD domain not found" });
      }
      
      const updatedDomain = await storage.updateAdDomain(parseInt(req.params.id), req.body);
      res.json(updatedDomain);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ad-domains/{id}:
   *   delete:
   *     summary: Delete an AD domain
   *     tags: [AD Domains]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Domain deleted successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.delete("/api/connections/:connectionId/ad-domains/:id", authenticateApiToken, async (req, res, next) => {
    try {
      const domain = await storage.getAdDomain(parseInt(req.params.id));
      
      if (!domain || domain.connectionId !== parseInt(req.params.connectionId)) {
        return res.status(404).json({ message: "AD domain not found" });
      }
      
      const deleted = await storage.deleteAdDomain(parseInt(req.params.id));
      
      if (!deleted) {
        return res.status(404).json({ message: "AD domain not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });
  
  // Domains endpoints
  /**
   * @swagger
   * /api/connections/{connectionId}/ad-domains:
   *   get:
   *     summary: List AD domains from the specified LDAP connection
   *     tags: [AD Domains]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - $ref: '#/components/parameters/filterParam'
   *       - $ref: '#/components/parameters/selectParam'
   *       - $ref: '#/components/parameters/expandParam'
   *       - $ref: '#/components/parameters/orderByParam'
   *       - $ref: '#/components/parameters/topParam'
   *       - $ref: '#/components/parameters/skipParam'
   *     responses:
   *       200:
   *         description: A list of AD domains
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/AdDomain'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/connections/:connectionId/ad-domains", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() && !req.headers.authorization) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const query = parseQueryParams(req);
      const domains = await storage.listAdDomains(connectionId, query);
      
      // Count total records for pagination metadata
      const countQuery = db.select({ count: sql`count(*)` }).from(adDomains)
        .where(eq(adDomains.connectionId, connectionId));
      
      // Apply filters if present
      if (query && query.filter) {
        const conditions = parseFilter(query.filter);
        const whereClause = applyFilterConditions(adDomains, conditions);
        if (whereClause) {
          countQuery.where(whereClause);
        }
      }
      
      const [countResult] = await countQuery;
      const totalRecords = Number(countResult?.count || 0);
      
      // Add objectType to each result
      const domainsWithObjectType = domains.map(domain => ({
        ...domain,
        objectType: 'domain'
      }));
      
      // Generate pagination metadata
      const { limit, offset } = parsePagination(query?.top, query?.skip);
      const paginationMetadata = generatePaginationMetadata(
        totalRecords,
        limit,
        offset,
        `${req.protocol}://${req.get('host')}${req.originalUrl}`
      );
      
      // Return data with pagination metadata
      res.json({
        data: domainsWithObjectType,
        ...paginationMetadata
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/ldap-attributes:
   *   get:
   *     summary: Get LDAP attributes for a specific object class
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: objectClass
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *           enum: [user, group, organizationalUnit, computer, domain]
   *     responses:
   *       200:
   *         description: List of LDAP attributes
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapAttribute'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/connections/:connectionId/ldap-attributes", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const objectClass = req.query.objectClass as string;
      
      if (!objectClass) {
        return res.status(400).json({ message: "objectClass parameter is required" });
      }
      
      // Verify the connection exists
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const attributes = await storage.getLdapAttributes(connectionId, objectClass);
      res.json(attributes);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/connections/{connectionId}/ldap-attributes:
   *   post:
   *     summary: Create a new LDAP attribute
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - objectClass
   *             properties:
   *               name:
   *                 type: string
   *               displayName:
   *                 type: string
   *               description:
   *                 type: string
   *               type:
   *                 type: string
   *               multiValued:
   *                 type: boolean
   *               objectClass:
   *                 type: string
   *                 enum: [user, group, organizationalUnit, computer, domain]
   *               isIndexed:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Attribute created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapAttribute'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  app.post("/api/connections/:connectionId/ldap-attributes", requireAdmin, async (req, res, next) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      
      // Verify the connection exists
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const attribute = await storage.createLdapAttribute({
        ...req.body,
        connectionId
      });
      
      res.status(201).json(attribute);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/ldap-attributes/{id}:
   *   put:
   *     summary: Update an LDAP attribute
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               displayName:
   *                 type: string
   *               description:
   *                 type: string
   *               type:
   *                 type: string
   *               multiValued:
   *                 type: boolean
   *               isIndexed:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Attribute updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapAttribute'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.put("/api/ldap-attributes/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const updatedAttribute = await storage.updateLdapAttribute(id, req.body);
      
      if (!updatedAttribute) {
        return res.status(404).json({ message: "LDAP attribute not found" });
      }
      
      res.json(updatedAttribute);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/ldap-attributes/{id}:
   *   delete:
   *     summary: Delete an LDAP attribute
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Attribute deleted successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.delete("/api/ldap-attributes/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLdapAttribute(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "LDAP attribute not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/connections/{connectionId}/ldap-filters:
   *   get:
   *     summary: List LDAP filters for a connection
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: List of LDAP filters
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapFilter'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  /**
   * @swagger
   * /api/connections/{connectionId}/test-filter:
   *   post:
   *     summary: Test an LDAP filter against a connection
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ldapFilter
   *               - objectClass
   *             properties:
   *               ldapFilter:
   *                 type: string
   *               objectClass:
   *                 type: string
   *                 enum: [user, group, organizationalUnit, computer, domain]
   *     responses:
   *       200:
   *         description: Filter test results
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.post("/api/connections/:connectionId/test-filter", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const { ldapFilter, objectClass } = req.body;
      
      if (!ldapFilter || !objectClass) {
        return res.status(400).json({ message: "ldapFilter and objectClass are required" });
      }
      
      // Verify the connection exists
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      // Test the filter
      const results = await storage.testLdapFilter(connectionId, ldapFilter, objectClass);
      res.json(results);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/connections/:connectionId/ldap-filters", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      
      // Verify the connection exists
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const filters = await storage.listLdapFilters(connectionId);
      res.json(filters);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/connections/{connectionId}/ldap-filters:
   *   post:
   *     summary: Create a new LDAP filter
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - objectClass
   *               - filter
   *               - ldapFilter
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               objectClass:
   *                 type: string
   *                 enum: [user, group, organizationalUnit, computer, domain]
   *               filter:
   *                 type: object
   *               ldapFilter:
   *                 type: string
   *     responses:
   *       201:
   *         description: Filter created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapFilter'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  app.post("/api/connections/:connectionId/ldap-filters", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      
      // Verify the connection exists
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const filter = await storage.createLdapFilter({
        ...req.body,
        connectionId,
        createdBy: req.user.id,
        modifiedBy: req.user.id
      });
      
      res.status(201).json(filter);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/ldap-filters/{id}:
   *   get:
   *     summary: Get a specific LDAP filter
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: LDAP filter details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapFilter'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/ldap-filters/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const filter = await storage.getLdapFilter(id);
      
      if (!filter) {
        return res.status(404).json({ message: "LDAP filter not found" });
      }
      
      res.json(filter);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/ldap-filters/{id}:
   *   put:
   *     summary: Update an LDAP filter
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               filter:
   *                 type: object
   *               ldapFilter:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Filter updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapFilter'
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.put("/api/ldap-filters/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the filter exists
      const existingFilter = await storage.getLdapFilter(id);
      if (!existingFilter) {
        return res.status(404).json({ message: "LDAP filter not found" });
      }
      
      // Update with the current user as modifier
      const updatedFilter = await storage.updateLdapFilter(id, {
        ...req.body,
        modifiedBy: req.user.id
      });
      
      res.json(updatedFilter);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/ldap-filters/{id}:
   *   delete:
   *     summary: Delete an LDAP filter
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Filter deleted successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.delete("/api/ldap-filters/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the filter exists and if the user is allowed to delete it
      const filter = await storage.getLdapFilter(id);
      if (!filter) {
        return res.status(404).json({ message: "LDAP filter not found" });
      }
      
      // Only allow the creator or admins to delete
      if (filter.createdBy !== req.user.id) {
        const userRole = await storage.getRole(req.user.roleId!);
        if (userRole?.name !== "admin") {
          return res.status(403).json({ message: "You are not authorized to delete this filter" });
        }
      }
      
      const deleted = await storage.deleteLdapFilter(id);
      res.json({ success: deleted });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/ldap-filters/{filterId}/revisions:
   *   get:
   *     summary: Get the revision history for an LDAP filter
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: filterId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: List of filter revisions
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapFilterRevision'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/ldap-filters/:filterId/revisions", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filterId = parseInt(req.params.filterId);
      
      // Check if the filter exists
      const filter = await storage.getLdapFilter(filterId);
      if (!filter) {
        return res.status(404).json({ message: "LDAP filter not found" });
      }
      
      const revisions = await storage.getLdapFilterRevisions(filterId);
      res.json(revisions);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/ldap-filters/{filterId}/revert/{revisionId}:
   *   post:
   *     summary: Revert a filter to a previous revision
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: filterId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: revisionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Filter reverted successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapFilter'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.post("/api/ldap-filters/:filterId/revert/:revisionId", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filterId = parseInt(req.params.filterId);
      const revisionId = parseInt(req.params.revisionId);
      
      // Check if the filter exists
      const filter = await storage.getLdapFilter(filterId);
      if (!filter) {
        return res.status(404).json({ message: "LDAP filter not found" });
      }
      
      // Check if the user has permission to modify this filter
      if (filter.createdBy !== req.user.id) {
        const userRole = await storage.getRole(req.user.roleId!);
        if (userRole?.name !== "admin") {
          return res.status(403).json({ message: "You are not authorized to modify this filter" });
        }
      }
      
      // First update the modifiedBy to the current user
      await storage.updateLdapFilter(filterId, { modifiedBy: req.user.id });
      
      // Then perform the revert
      const revertedFilter = await storage.revertLdapFilterToRevision(filterId, revisionId);
      
      if (!revertedFilter) {
        return res.status(404).json({ message: "Failed to revert filter or revision not found" });
      }
      
      res.json(revertedFilter);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/connections/{connectionId}/test-ldap-filter:
   *   post:
   *     summary: Test an LDAP filter against a connection
   *     tags: [LDAP Query Builder]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ldapFilter
   *               - objectClass
   *             properties:
   *               ldapFilter:
   *                 type: string
   *               objectClass:
   *                 type: string
   *                 enum: [user, group, organizationalUnit, computer, domain]
   *     responses:
   *       200:
   *         description: Test results
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  app.post("/api/connections/:connectionId/test-ldap-filter", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const { ldapFilter, objectClass } = req.body;
      
      if (!ldapFilter || !objectClass) {
        return res.status(400).json({ message: "ldapFilter and objectClass are required" });
      }
      
      // Verify the connection exists
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const results = await storage.testLdapFilter(connectionId, ldapFilter, objectClass);
      res.json(results);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/move-computer:
   *   post:
   *     summary: Move a computer to a different OU
   *     tags: [AD Computers]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - computerObjectGUID
   *               - targetOUDistinguishedName
   *             properties:
   *               computerObjectGUID:
   *                 type: string
   *               targetOUDistinguishedName:
   *                 type: string
   *     responses:
   *       200:
   *         description: Computer moved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.post("/api/connections/:connectionId/move-computer", authenticateApiToken, async (req, res, next) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      try {
        const data = moveComputerSchema.parse(req.body);
        
        // This would call a method in the LDAP client to move the computer
        // For now we'll return a mock success response
        // In a real implementation, this would interact with the Active Directory
        
        // Record the action in the audit log
        const auditEntry = {
          action: "MOVE_COMPUTER",
          targetId: data.computerObjectGUID,
          details: {
            targetOU: data.targetOUDistinguishedName
          },
          userId: req.user?.id || null,
          connectionId: connectionId
        };
        
        // Save the audit entry to storage
        await storage.createAuditLogEntry(auditEntry);
        
        res.json({
          success: true,
          message: `Computer with GUID ${data.computerObjectGUID} moved to ${data.targetOUDistinguishedName}`
        });
      } catch (error) {
        if (error instanceof ZodError) {
          return handleZodError(error, res);
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/move-user:
   *   post:
   *     summary: Move a user to a different OU
   *     tags: [AD Users]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userObjectGUID
   *               - targetOUDistinguishedName
   *             properties:
   *               userObjectGUID:
   *                 type: string
   *               targetOUDistinguishedName:
   *                 type: string
   *     responses:
   *       200:
   *         description: User moved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.post("/api/connections/:connectionId/move-user", authenticateApiToken, async (req, res, next) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      try {
        const data = moveUserSchema.parse(req.body);
        
        // This would call a method in the LDAP client to move the user
        // For now we'll return a mock success response
        // In a real implementation, this would interact with the Active Directory
        
        // Record the action in the audit log
        const auditEntry = {
          action: "MOVE_USER",
          targetId: data.userObjectGUID,
          details: {
            targetOU: data.targetOUDistinguishedName
          },
          userId: req.user?.id || null,
          connectionId: connectionId
        };
        
        // Save the audit entry to storage
        await storage.createAuditLogEntry(auditEntry);
        
        res.json({
          success: true,
          message: `User with GUID ${data.userObjectGUID} moved to ${data.targetOUDistinguishedName}`
        });
      } catch (error) {
        if (error instanceof ZodError) {
          return handleZodError(error, res);
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/add-to-group:
   *   post:
   *     summary: Add a user or computer to a group
   *     tags: [AD Groups]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - objectGUID
   *               - groupObjectGUID
   *               - objectType
   *             properties:
   *               objectGUID:
   *                 type: string
   *               groupObjectGUID:
   *                 type: string
   *               objectType:
   *                 type: string
   *                 enum: [user, computer]
   *     responses:
   *       200:
   *         description: Object added to group successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.post("/api/connections/:connectionId/add-to-group", authenticateApiToken, async (req, res, next) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      try {
        const data = addToGroupSchema.parse(req.body);
        
        // This would call a method in the LDAP client to add the object to the group
        // For now we'll return a mock success response
        // In a real implementation, this would interact with the Active Directory
        
        // Record the action in the audit log
        const auditEntry = {
          action: "ADD_TO_GROUP",
          targetId: data.objectGUID,
          details: {
            groupGUID: data.groupObjectGUID,
            objectType: data.objectType
          },
          userId: req.user?.id || null,
          connectionId: connectionId
        };
        
        // Save the audit entry to storage
        await storage.createAuditLogEntry(auditEntry);
        
        res.json({
          success: true,
          message: `${data.objectType} with GUID ${data.objectGUID} added to group with GUID ${data.groupObjectGUID}`
        });
      } catch (error) {
        if (error instanceof ZodError) {
          return handleZodError(error, res);
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/audit-logs:
   *   get:
   *     summary: Retrieve audit logs for a connection
   *     tags: [Audit]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: List of audit logs
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: integer
   *                   timestamp:
   *                     type: string
   *                     format: date-time
   *                   userId:
   *                     type: integer
   *                     nullable: true
   *                   action:
   *                     type: string
   *                   targetId:
   *                     type: string
   *                   details:
   *                     type: object
   *                   connectionId:
   *                     type: integer
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/connections/:connectionId/audit-logs", authenticateApiToken, async (req, res, next) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      const logs = await storage.getAuditLogs(connectionId);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/audit-logs:
   *   get:
   *     summary: Retrieve all audit logs
   *     tags: [Audit]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of all audit logs
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: integer
   *                   timestamp:
   *                     type: string
   *                     format: date-time
   *                   userId:
   *                     type: integer
   *                     nullable: true
   *                   action:
   *                     type: string
   *                   targetId:
   *                     type: string
   *                   details:
   *                     type: object
   *                   connectionId:
   *                     type: integer
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  app.get("/api/audit-logs", authenticateApiToken, async (req, res, next) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * @swagger
   * /api/connections/{connectionId}/remove-from-group:
   *   post:
   *     summary: Remove a user or computer from a group
   *     tags: [AD Groups]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - objectGUID
   *               - groupObjectGUID
   *               - objectType
   *             properties:
   *               objectGUID:
   *                 type: string
   *               groupObjectGUID:
   *                 type: string
   *               objectType:
   *                 type: string
   *                 enum: [user, computer]
   *     responses:
   *       200:
   *         description: Object removed from group successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         $ref: '#/components/responses/BadRequestError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.post("/api/connections/:connectionId/remove-from-group", authenticateApiToken, async (req, res, next) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }
      
      try {
        const data = removeFromGroupSchema.parse(req.body);
        
        // This would call a method in the LDAP client to remove the object from the group
        // For now we'll return a mock success response
        // In a real implementation, this would interact with the Active Directory
        
        // Record the action in the audit log
        const auditEntry = {
          action: "REMOVE_FROM_GROUP",
          targetId: data.objectGUID,
          details: {
            groupGUID: data.groupObjectGUID,
            objectType: data.objectType
          },
          userId: req.user?.id || null,
          connectionId: connectionId
        };
        
        // Save the audit entry to storage
        await storage.createAuditLogEntry(auditEntry);
        
        res.json({
          success: true,
          message: `${data.objectType} with GUID ${data.objectGUID} removed from group with GUID ${data.groupObjectGUID}`
        });
      } catch (error) {
        if (error instanceof ZodError) {
          return handleZodError(error, res);
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/managed-by:
   *   get:
   *     summary: Get the 'managedBy' attribute for an AD object
   *     tags: [AD Objects]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *       - name: objectGUID
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *       - name: objectType
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *           enum: [user, group, computer, organizationalUnit]
   *     responses:
   *       200:
   *         description: The managedBy attribute
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 managedBy:
   *                   type: string
   *                   nullable: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         description: Object not found
   */
  app.get("/api/connections/:connectionId/managed-by", authenticateApiToken, async (req, res, next) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }

      const objectGUID = req.query.objectGUID as string;
      const objectType = req.query.objectType as string;

      if (!objectGUID || !objectType) {
        return res.status(400).json({ message: "objectGUID and objectType are required query parameters" });
      }

      if (!['user', 'group', 'computer', 'organizationalUnit'].includes(objectType)) {
        return res.status(400).json({ message: "objectType must be one of: user, group, computer, organizationalUnit" });
      }

      // Get the object distinguished name
      let objectDN;
      switch (objectType) {
        case 'user':
          const adUser = await storage.getAdUserByObjectGUID(connectionId, objectGUID);
          if (!adUser) {
            return res.status(404).json({ message: "User not found" });
          }
          objectDN = adUser.distinguishedName;
          break;
        case 'group':
          const adGroup = await storage.getAdGroupByObjectGUID(connectionId, objectGUID);
          if (!adGroup) {
            return res.status(404).json({ message: "Group not found" });
          }
          objectDN = adGroup.distinguishedName;
          break;
        case 'computer':
          const adComputer = await storage.getAdComputerByObjectGUID(connectionId, objectGUID);
          if (!adComputer) {
            return res.status(404).json({ message: "Computer not found" });
          }
          objectDN = adComputer.distinguishedName;
          break;
        case 'organizationalUnit':
          const adOU = await storage.getAdOrgUnitByObjectGUID(connectionId, objectGUID);
          if (!adOU) {
            return res.status(404).json({ message: "Organizational Unit not found" });
          }
          objectDN = adOU.distinguishedName;
          break;
      }

      // Connect to LDAP
      try {
        await ldapClient.connect(connection);
      } catch (error) {
        console.error("LDAP connection error:", error);
        return res.status(500).json({ message: "Failed to connect to LDAP server", error: error.message });
      }

      try {
        // Get the managedBy attribute
        const managedBy = await ldapClient.getManagedBy(connectionId, objectDN);
        
        return res.status(200).json({ managedBy });
      } catch (error) {
        console.error("Error getting managedBy attribute:", error);
        return res.status(500).json({ message: "Failed to get managedBy attribute", error: error.message });
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/managed-by:
   *   post:
   *     summary: Set the 'managedBy' attribute for an AD object
   *     tags: [AD Objects]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - objectGUID
   *               - objectType
   *             properties:
   *               objectGUID:
   *                 type: string
   *               managerDistinguishedName:
   *                 type: string
   *                 nullable: true
   *               objectType:
   *                 type: string
   *                 enum: [user, group, computer, organizationalUnit]
   *     responses:
   *       200:
   *         description: ManagedBy attribute updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         description: Object not found
   */
  app.post("/api/connections/:connectionId/managed-by", authenticateApiToken, async (req, res, next) => {
    try {
      // Parse and validate request body
      try {
        updateManagedBySchema.parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          return handleZodError(err, res);
        }
        throw err;
      }

      const connectionId = parseInt(req.params.connectionId);
      const connection = await storage.getLdapConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "LDAP connection not found" });
      }

      const { objectGUID, managerDistinguishedName, objectType } = req.body;

      // Get the object distinguished name
      let objectDN;
      let objectName;
      switch (objectType) {
        case 'user':
          const adUser = await storage.getAdUserByObjectGUID(connectionId, objectGUID);
          if (!adUser) {
            return res.status(404).json({ message: "User not found" });
          }
          objectDN = adUser.distinguishedName;
          objectName = adUser.displayName || adUser.sAMAccountName;
          break;
        case 'group':
          const adGroup = await storage.getAdGroupByObjectGUID(connectionId, objectGUID);
          if (!adGroup) {
            return res.status(404).json({ message: "Group not found" });
          }
          objectDN = adGroup.distinguishedName;
          objectName = adGroup.sAMAccountName;
          break;
        case 'computer':
          const adComputer = await storage.getAdComputerByObjectGUID(connectionId, objectGUID);
          if (!adComputer) {
            return res.status(404).json({ message: "Computer not found" });
          }
          objectDN = adComputer.distinguishedName;
          objectName = adComputer.name;
          break;
        case 'organizationalUnit':
          const adOU = await storage.getAdOrgUnitByObjectGUID(connectionId, objectGUID);
          if (!adOU) {
            return res.status(404).json({ message: "Organizational Unit not found" });
          }
          objectDN = adOU.distinguishedName;
          objectName = adOU.name;
          break;
      }

      // Connect to LDAP
      try {
        await ldapClient.connect(connection);
      } catch (error) {
        console.error("LDAP connection error:", error);
        return res.status(500).json({ message: "Failed to connect to LDAP server", error: error.message });
      }

      try {
        // Set the managedBy attribute
        await ldapClient.setManagedBy(connectionId, objectDN, managerDistinguishedName);
        
        // Update the database record
        const updateData = { managedBy: managerDistinguishedName };
        switch (objectType) {
          case 'user':
            await storage.updateAdUserByObjectGUID(connectionId, objectGUID, updateData);
            break;
          case 'group':
            await storage.updateAdGroupByObjectGUID(connectionId, objectGUID, updateData);
            break;
          case 'computer':
            await storage.updateAdComputerByObjectGUID(connectionId, objectGUID, updateData);
            break;
          case 'organizationalUnit':
            await storage.updateAdOrgUnitByObjectGUID(connectionId, objectGUID, updateData);
            break;
        }

        // Log the action
        await storage.createAuditLogEntry({
          action: `update_managed_by:${objectType}`,
          targetId: objectGUID,
          details: {
            objectDN,
            managerDN: managerDistinguishedName
          },
          userId: req.user?.id,
          connectionId
        });

        return res.status(200).json({
          success: true,
          message: `ManagedBy attribute successfully updated for ${objectName}`
        });
      } catch (error) {
        console.error("Error updating managedBy attribute:", error);
        return res.status(500).json({ message: "Failed to update managedBy attribute", error: error.message });
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/audit-logs:
   *   get:
   *     summary: Get all audit logs
   *     tags: [Audit Logs]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of all audit logs
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/AuditLog'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  app.get("/api/audit-logs", requireAuth, async (req: Request<any>, res: Response, next: NextFunction) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  /**
   * @swagger
   * /api/connections/{connectionId}/audit-logs:
   *   get:
   *     summary: Get audit logs for a specific connection
   *     tags: [Audit Logs]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: connectionId
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: List of audit logs for the specified connection
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/AuditLog'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  app.get("/api/connections/:connectionId/audit-logs", requireAuth, async (req: Request<any>, res: Response, next: NextFunction) => {
    try {
      const connectionId = parseInt(req.params.connectionId, 10);
      
      // Verify the connection exists
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }
      
      const logs = await storage.getAuditLogs(connectionId);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
