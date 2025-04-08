import { Router } from 'express';
import { storage } from './storage';
import { ldapClient } from './ldap';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { insertUserSchema, insertApiTokenSchema, insertLdapConnectionSchema } from '@shared/schema';

export function registerAPIRoutes(router: Router, verifyApiToken: any) {
  /**
   * @swagger
   * /users:
   *   get:
   *     summary: Get all users
   *     description: Retrieve a list of all users
   *     tags: [Users]
   *     parameters:
   *       - in: query
   *         name: properties
   *         schema:
   *           type: string
   *         description: Comma-separated list of properties to return
   *     responses:
   *       200:
   *         description: A list of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   */
  router.get('/users', verifyApiToken, async (req, res) => {
    try {
      // Extract properties filter
      const propertiesParam = req.query.properties as string;
      const properties = propertiesParam ? propertiesParam.split(',') : null;
      
      const users = await storage.listUsers();
      
      // Filter out password field
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      // Apply property selection if specified
      if (properties) {
        const filteredUsers = safeUsers.map(user => {
          const filteredUser: Record<string, any> = {};
          properties.forEach(prop => {
            if (user.hasOwnProperty(prop)) {
              filteredUser[prop] = user[prop as keyof typeof user];
            }
          });
          return filteredUser;
        });
        
        return res.json(filteredUsers);
      }
      
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     summary: Get a user by ID
   *     description: Retrieve a single user by ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: User ID
   *       - in: query
   *         name: properties
   *         schema:
   *           type: string
   *         description: Comma-separated list of properties to return
   *     responses:
   *       200:
   *         description: User found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       404:
   *         description: User not found
   */
  router.get('/users/:id', verifyApiToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Extract properties filter
      const propertiesParam = req.query.properties as string;
      const properties = propertiesParam ? propertiesParam.split(',') : null;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Filter out password
      const { password, ...userWithoutPassword } = user;
      
      // Apply property selection if specified
      if (properties) {
        const filteredUser: Record<string, any> = {};
        properties.forEach(prop => {
          if (userWithoutPassword.hasOwnProperty(prop)) {
            filteredUser[prop] = userWithoutPassword[prop as keyof typeof userWithoutPassword];
          }
        });
        
        return res.json(filteredUser);
      }
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  // API Tokens Routes
  /**
   * @swagger
   * /api-tokens:
   *   get:
   *     summary: Get all API tokens
   *     description: Retrieve a list of all API tokens for the authenticated user
   *     tags: [API Tokens]
   *     responses:
   *       200:
   *         description: A list of API tokens
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ApiToken'
   */
  router.get('/api-tokens', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const userId = (req.user as any).id;
      const tokens = await storage.listApiTokens(userId);
      
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /api-tokens:
   *   post:
   *     summary: Create a new API token
   *     description: Generate a new API token for the authenticated user
   *     tags: [API Tokens]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               expiresAt:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       201:
   *         description: Token created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiToken'
   */
  router.post('/api-tokens', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const schema = insertApiTokenSchema.extend({
        name: z.string().min(1, 'Name is required'),
        expiresAt: z.string().optional().transform(val => val ? new Date(val) : undefined)
      });
      
      const validateResult = schema.safeParse(req.body);
      
      if (!validateResult.success) {
        return res.status(400).json({ message: 'Invalid data', errors: validateResult.error.errors });
      }
      
      const { name, expiresAt } = validateResult.data;
      const userId = (req.user as any).id;
      
      // Generate a secure token
      const token = randomBytes(32).toString('hex');
      
      const apiToken = await storage.createApiToken({
        name,
        token,
        userId,
        expiresAt
      });
      
      // Log this activity
      await storage.createActivityLog({
        action: 'Create',
        resource: name,
        resourceType: 'API Token',
        userId,
        username: (req.user as any).username,
        status: 'Success',
        details: { id: apiToken.id }
      });
      
      res.status(201).json(apiToken);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /api-tokens/{id}:
   *   delete:
   *     summary: Delete an API token
   *     description: Revoke and delete an API token
   *     tags: [API Tokens]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Token ID
   *     responses:
   *       204:
   *         description: Token deleted successfully
   *       404:
   *         description: Token not found
   */
  router.delete('/api-tokens/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const tokenId = parseInt(req.params.id);
      if (isNaN(tokenId)) {
        return res.status(400).json({ message: 'Invalid token ID' });
      }
      
      const token = await storage.getApiToken(tokenId);
      if (!token) {
        return res.status(404).json({ message: 'Token not found' });
      }
      
      // Only allow users to delete their own tokens
      if (token.userId !== (req.user as any).id) {
        return res.status(403).json({ message: 'Not authorized to delete this token' });
      }
      
      await storage.deleteApiToken(tokenId);
      
      // Log this activity
      await storage.createActivityLog({
        action: 'Delete',
        resource: token.name,
        resourceType: 'API Token',
        userId: (req.user as any).id,
        username: (req.user as any).username,
        status: 'Success',
        details: { id: tokenId }
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  // LDAP Connections Routes
  /**
   * @swagger
   * /ldap-connections:
   *   get:
   *     summary: Get all LDAP connections
   *     description: Retrieve a list of all LDAP connections
   *     tags: [LDAP Connections]
   *     responses:
   *       200:
   *         description: A list of LDAP connections
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapConnection'
   */
  router.get('/ldap-connections', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const connections = await storage.listLdapConnections();
      
      // Don't send passwords back
      const safeConnections = connections.map(connection => {
        const { password, ...connectionWithoutPassword } = connection;
        return connectionWithoutPassword;
      });
      
      res.json(safeConnections);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /ldap-connections:
   *   post:
   *     summary: Create a new LDAP connection
   *     description: Add a new LDAP connection
   *     tags: [LDAP Connections]
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
   *               port:
   *                 type: integer
   *               authType:
   *                 type: string
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *               baseDN:
   *                 type: string
   *               useTLS:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Connection created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapConnection'
   */
  router.post('/ldap-connections', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const schema = insertLdapConnectionSchema.extend({
        name: z.string().min(1, 'Name is required'),
        server: z.string().min(1, 'Server is required'),
        port: z.number().int().positive('Port must be a positive integer'),
        authType: z.string().min(1, 'Authentication type is required'),
        username: z.string().min(1, 'Username is required'),
        password: z.string().min(1, 'Password is required'),
      });
      
      const validateResult = schema.safeParse(req.body);
      
      if (!validateResult.success) {
        return res.status(400).json({ message: 'Invalid data', errors: validateResult.error.errors });
      }
      
      const connection = await storage.createLdapConnection(validateResult.data);
      
      // Log this activity
      await storage.createActivityLog({
        action: 'Create',
        resource: connection.name,
        resourceType: 'LDAP Connection',
        userId: (req.user as any).id,
        username: (req.user as any).username,
        status: 'Success',
        details: { id: connection.id }
      });
      
      // Don't send password back
      const { password, ...connectionWithoutPassword } = connection;
      
      res.status(201).json(connectionWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /ldap-connections/{id}:
   *   put:
   *     summary: Update an LDAP connection
   *     description: Update an existing LDAP connection
   *     tags: [LDAP Connections]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Connection ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LdapConnection'
   *     responses:
   *       200:
   *         description: Connection updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapConnection'
   *       404:
   *         description: Connection not found
   */
  router.put('/ldap-connections/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const connectionId = parseInt(req.params.id);
      if (isNaN(connectionId)) {
        return res.status(400).json({ message: 'Invalid connection ID' });
      }
      
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }
      
      const schema = insertLdapConnectionSchema.partial();
      const validateResult = schema.safeParse(req.body);
      
      if (!validateResult.success) {
        return res.status(400).json({ message: 'Invalid data', errors: validateResult.error.errors });
      }
      
      const updatedConnection = await storage.updateLdapConnection(connectionId, validateResult.data);
      
      // Log this activity
      await storage.createActivityLog({
        action: 'Update',
        resource: connection.name,
        resourceType: 'LDAP Connection',
        userId: (req.user as any).id,
        username: (req.user as any).username,
        status: 'Success',
        details: { id: connectionId }
      });
      
      // Don't send password back
      const { password, ...connectionWithoutPassword } = updatedConnection!;
      
      res.json(connectionWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /ldap-connections/{id}:
   *   delete:
   *     summary: Delete an LDAP connection
   *     description: Delete an existing LDAP connection
   *     tags: [LDAP Connections]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Connection ID
   *     responses:
   *       204:
   *         description: Connection deleted successfully
   *       404:
   *         description: Connection not found
   */
  router.delete('/ldap-connections/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const connectionId = parseInt(req.params.id);
      if (isNaN(connectionId)) {
        return res.status(400).json({ message: 'Invalid connection ID' });
      }
      
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }
      
      // Disconnect from LDAP if connected
      try {
        await ldapClient.disconnect(connectionId);
      } catch (err) {
        // Ignore disconnect errors
      }
      
      await storage.deleteLdapConnection(connectionId);
      
      // Log this activity
      await storage.createActivityLog({
        action: 'Delete',
        resource: connection.name,
        resourceType: 'LDAP Connection',
        userId: (req.user as any).id,
        username: (req.user as any).username,
        status: 'Success',
        details: { id: connectionId }
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /ldap-connections/{id}/test:
   *   post:
   *     summary: Test an LDAP connection
   *     description: Test the connection to an LDAP server
   *     tags: [LDAP Connections]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Connection ID
   *     responses:
   *       200:
   *         description: Connection test successful
   *       400:
   *         description: Connection test failed
   *       404:
   *         description: Connection not found
   */
  router.post('/ldap-connections/:id/test', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const connectionId = parseInt(req.params.id);
      if (isNaN(connectionId)) {
        return res.status(400).json({ message: 'Invalid connection ID' });
      }
      
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }
      
      try {
        // Disconnect first if already connected
        await ldapClient.disconnect(connectionId);
        
        // Try to connect
        const success = await ldapClient.connect(connection);
        
        if (success) {
          res.json({ message: 'Connection successful', status: 'connected' });
        } else {
          res.status(400).json({ message: 'Connection failed', status: 'disconnected' });
        }
      } catch (error) {
        res.status(400).json({ 
          message: 'Connection failed', 
          error: error instanceof Error ? error.message : String(error),
          status: 'disconnected'
        });
      }
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /ad/users:
   *   get:
   *     summary: Get Active Directory users
   *     description: Retrieve users from Active Directory
   *     tags: [Active Directory]
   *     parameters:
   *       - in: query
   *         name: connectionId
   *         schema:
   *           type: integer
   *         required: true
   *         description: LDAP Connection ID
   *       - in: query
   *         name: filter
   *         schema:
   *           type: string
   *         description: LDAP filter expression
   *       - in: query
   *         name: properties
   *         schema:
   *           type: string
   *         description: Comma-separated list of properties to return
   *     responses:
   *       200:
   *         description: A list of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapUser'
   */
  router.get('/ad/users', verifyApiToken, async (req, res) => {
    try {
      const connectionId = parseInt(req.query.connectionId as string);
      if (isNaN(connectionId)) {
        return res.status(400).json({ message: 'Invalid connection ID' });
      }
      
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }
      
      // Connect if not already connected
      if (!ldapClient.isConnectionActive(connectionId)) {
        try {
          await ldapClient.connect(connection);
        } catch (error) {
          return res.status(500).json({ 
            message: 'Failed to connect to LDAP server', 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      const filter = req.query.filter as string || '(objectClass=user)';
      const propertiesParam = req.query.properties as string;
      const properties = propertiesParam ? propertiesParam.split(',') : undefined;
      
      const users = await ldapClient.searchUsers(connectionId, filter, properties);
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /ad/groups:
   *   get:
   *     summary: Get Active Directory groups
   *     description: Retrieve groups from Active Directory
   *     tags: [Active Directory]
   *     parameters:
   *       - in: query
   *         name: connectionId
   *         schema:
   *           type: integer
   *         required: true
   *         description: LDAP Connection ID
   *       - in: query
   *         name: filter
   *         schema:
   *           type: string
   *         description: LDAP filter expression
   *       - in: query
   *         name: properties
   *         schema:
   *           type: string
   *         description: Comma-separated list of properties to return
   *     responses:
   *       200:
   *         description: A list of groups
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapGroup'
   */
  router.get('/ad/groups', verifyApiToken, async (req, res) => {
    try {
      const connectionId = parseInt(req.query.connectionId as string);
      if (isNaN(connectionId)) {
        return res.status(400).json({ message: 'Invalid connection ID' });
      }
      
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }
      
      // Connect if not already connected
      if (!ldapClient.isConnectionActive(connectionId)) {
        try {
          await ldapClient.connect(connection);
        } catch (error) {
          return res.status(500).json({ 
            message: 'Failed to connect to LDAP server', 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      const filter = req.query.filter as string || '(objectClass=group)';
      const propertiesParam = req.query.properties as string;
      const properties = propertiesParam ? propertiesParam.split(',') : undefined;
      
      const groups = await ldapClient.searchGroups(connectionId, filter, properties);
      
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /ad/organizational-units:
   *   get:
   *     summary: Get Active Directory organizational units
   *     description: Retrieve organizational units from Active Directory
   *     tags: [Active Directory]
   *     parameters:
   *       - in: query
   *         name: connectionId
   *         schema:
   *           type: integer
   *         required: true
   *         description: LDAP Connection ID
   *       - in: query
   *         name: filter
   *         schema:
   *           type: string
   *         description: LDAP filter expression
   *       - in: query
   *         name: properties
   *         schema:
   *           type: string
   *         description: Comma-separated list of properties to return
   *     responses:
   *       200:
   *         description: A list of organizational units
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapOU'
   */
  router.get('/ad/organizational-units', verifyApiToken, async (req, res) => {
    try {
      const connectionId = parseInt(req.query.connectionId as string);
      if (isNaN(connectionId)) {
        return res.status(400).json({ message: 'Invalid connection ID' });
      }
      
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }
      
      // Connect if not already connected
      if (!ldapClient.isConnectionActive(connectionId)) {
        try {
          await ldapClient.connect(connection);
        } catch (error) {
          return res.status(500).json({ 
            message: 'Failed to connect to LDAP server', 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      const filter = req.query.filter as string || '(objectClass=organizationalUnit)';
      const propertiesParam = req.query.properties as string;
      const properties = propertiesParam ? propertiesParam.split(',') : undefined;
      
      const ous = await ldapClient.searchOUs(connectionId, filter, properties);
      
      res.json(ous);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /ad/computers:
   *   get:
   *     summary: Get Active Directory computers
   *     description: Retrieve computers from Active Directory
   *     tags: [Active Directory]
   *     parameters:
   *       - in: query
   *         name: connectionId
   *         schema:
   *           type: integer
   *         required: true
   *         description: LDAP Connection ID
   *       - in: query
   *         name: filter
   *         schema:
   *           type: string
   *         description: LDAP filter expression
   *       - in: query
   *         name: properties
   *         schema:
   *           type: string
   *         description: Comma-separated list of properties to return
   *     responses:
   *       200:
   *         description: A list of computers
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapComputer'
   */
  router.get('/ad/computers', verifyApiToken, async (req, res) => {
    try {
      const connectionId = parseInt(req.query.connectionId as string);
      if (isNaN(connectionId)) {
        return res.status(400).json({ message: 'Invalid connection ID' });
      }
      
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }
      
      // Connect if not already connected
      if (!ldapClient.isConnectionActive(connectionId)) {
        try {
          await ldapClient.connect(connection);
        } catch (error) {
          return res.status(500).json({ 
            message: 'Failed to connect to LDAP server', 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      const filter = req.query.filter as string || '(objectClass=computer)';
      const propertiesParam = req.query.properties as string;
      const properties = propertiesParam ? propertiesParam.split(',') : undefined;
      
      const computers = await ldapClient.searchComputers(connectionId, filter, properties);
      
      res.json(computers);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  /**
   * @swagger
   * /activity-logs:
   *   get:
   *     summary: Get activity logs
   *     description: Retrieve a list of recent activity logs
   *     tags: [Activity Logs]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Maximum number of logs to return
   *     responses:
   *       200:
   *         description: A list of activity logs
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ActivityLog'
   */
  router.get('/activity-logs', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const logs = await storage.listActivityLogs(limit);
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'An error occurred' });
    }
  });
}
