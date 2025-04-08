import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupSwagger } from "./swagger";
import { storage } from "./storage";
import { apiQuerySchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  const { authenticateApiToken } = setupAuth(app);

  // Setup Swagger documentation
  setupSwagger(app);

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
        return null;
      }
      throw err;
    }
  };

  // Middleware to check admin role
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admin role required" });
    }
    next();
  };

  /**
   * @swagger
   * /api/ldap-connections:
   *   get:
   *     summary: List all LDAP connections
   *     tags: [LDAP Connections]
   *     security:
   *       - cookieAuth: []
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
   */
  app.get("/api/ldap-connections", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
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
      if (token.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You cannot delete tokens that don't belong to you" });
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
      
      res.json(users);
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

  // Similar endpoints for AD Groups
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
      
      res.json(groups);
    } catch (error) {
      next(error);
    }
  });

  // Organizational Units endpoints
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
      
      res.json(orgUnits);
    } catch (error) {
      next(error);
    }
  });

  // Computers endpoints
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
      
      res.json(computers);
    } catch (error) {
      next(error);
    }
  });

  // Domains endpoints
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
      
      res.json(domains);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
