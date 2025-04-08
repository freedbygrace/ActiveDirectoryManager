import { Router } from "express";
import {
  validateQueryBuilder,
  generateLdapFilter,
  getHumanReadableFilter,
  buildLdapFilter,
  LdapQueryBuilder
} from "./ldap-filter-builder";
import { connectToLdap, searchLdap, getLdapAvailableAttributes } from "./ldap";
import { IStorage } from "./storage";
import { InsertLdapQuery, LdapQuery, InsertLdapQueryVersion } from "@shared/schema";

// Use middleware to check permissions
function hasPermission(permission: string) {
  return (req: any, res: any, next: any) => {
    // Check if the user is authenticated via passport session or has a valid API token
    if (req.user || req.headers.authorization) {
      // In a real implementation, this would check the user's permissions against the required permission
      return next();
    }
    
    // If not authenticated, return 401 Unauthorized
    return res.status(401).json({ error: "Unauthorized" });
  };
}

export function registerLdapQueryBuilderRoutes(router: Router, storage: IStorage) {
  /**
   * @swagger
   * /ldap-queries:
   *   get:
   *     summary: Get all saved LDAP queries
   *     description: Retrieve a list of all saved LDAP query filters
   *     tags: [LDAP Query Builder]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: A list of LDAP queries
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapQuery'
   */
  router.get("/ldap-queries", hasPermission("read:ldap_queries"), async (req, res) => {
    try {
      const queries = await storage.getLdapQueries();
      res.json(queries);
    } catch (error) {
      console.error("Error getting LDAP queries:", error);
      res.status(500).json({ error: "Failed to retrieve LDAP queries" });
    }
  });

  /**
   * @swagger
   * /ldap-queries/{id}:
   *   get:
   *     summary: Get a saved LDAP query by ID
   *     description: Retrieve a specific LDAP query filter by its ID
   *     tags: [LDAP Query Builder]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Query ID
   *     responses:
   *       200:
   *         description: LDAP query found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapQuery'
   *       404:
   *         description: Query not found
   */
  router.get("/ldap-queries/:id", hasPermission("read:ldap_queries"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid query ID" });
      }

      const query = await storage.getLdapQuery(id);
      if (!query) {
        return res.status(404).json({ error: "LDAP query not found" });
      }

      res.json(query);
    } catch (error) {
      console.error("Error getting LDAP query:", error);
      res.status(500).json({ error: "Failed to retrieve LDAP query" });
    }
  });

  /**
   * @swagger
   * /ldap-queries/{id}/versions:
   *   get:
   *     summary: Get version history for an LDAP query
   *     description: Retrieve the revision history for a specific LDAP query
   *     tags: [LDAP Query Builder]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Query ID
   *     responses:
   *       200:
   *         description: List of query versions
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LdapQueryVersion'
   *       404:
   *         description: Query not found
   */
  router.get("/ldap-queries/:id/versions", hasPermission("read:ldap_queries"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid query ID" });
      }

      const query = await storage.getLdapQuery(id);
      if (!query) {
        return res.status(404).json({ error: "LDAP query not found" });
      }

      const versions = await storage.getLdapQueryVersions(id);
      res.json(versions);
    } catch (error) {
      console.error("Error getting LDAP query versions:", error);
      res.status(500).json({ error: "Failed to retrieve LDAP query versions" });
    }
  });

  /**
   * @swagger
   * /ldap-queries:
   *   post:
   *     summary: Create a new LDAP query
   *     description: Save a new LDAP query filter
   *     tags: [LDAP Query Builder]
   *     security:
   *       - bearerAuth: []
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
   *               targetObject:
   *                 type: string
   *                 enum: [users, groups, computers, ous]
   *               filter:
   *                 type: object
   *     responses:
   *       201:
   *         description: Query created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapQuery'
   *       400:
   *         description: Invalid query format
   */
  router.post("/ldap-queries", hasPermission("write:ldap_queries"), async (req, res) => {
    try {
      const { name, description, targetObject, filter } = req.body;

      if (!name || !targetObject || !filter) {
        return res.status(400).json({ error: "Missing required fields: name, targetObject, filter" });
      }

      try {
        // Validate the filter format
        const queryBuilder = validateQueryBuilder({ targetObject, filter });
        
        // Generate the LDAP filter and readable representation
        const ldapFilter = generateLdapFilter(queryBuilder);
        const readableFilter = getHumanReadableFilter(queryBuilder.filter);
        
        const insertQuery: InsertLdapQuery = {
          name,
          description: description || "",
          targetObject,
          filterJson: filter as any, // Type safety is handled by schema validation
          ldapFilter,
          readableFilter,
          createdBy: req.user?.id || 1, // Default to 1 if no user
        };

        const query = await storage.createLdapQuery(insertQuery);
        
        res.status(201).json(query);
      } catch (error: any) {
        console.error("Error validating query:", error);
        return res.status(400).json({ error: "Invalid query format", details: error.message });
      }
    } catch (error) {
      console.error("Error creating LDAP query:", error);
      res.status(500).json({ error: "Failed to create LDAP query" });
    }
  });

  /**
   * @swagger
   * /ldap-queries/{id}:
   *   put:
   *     summary: Update an LDAP query
   *     description: Update an existing LDAP query and create a new version
   *     tags: [LDAP Query Builder]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Query ID
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
   *               targetObject:
   *                 type: string
   *                 enum: [users, groups, computers, ous]
   *               filter:
   *                 type: object
   *     responses:
   *       200:
   *         description: Query updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapQuery'
   *       400:
   *         description: Invalid query format
   *       404:
   *         description: Query not found
   */
  router.put("/ldap-queries/:id", hasPermission("write:ldap_queries"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid query ID" });
      }

      const { name, description, targetObject, filter } = req.body;

      if (!name || !targetObject || !filter) {
        return res.status(400).json({ error: "Missing required fields: name, targetObject, filter" });
      }

      // Check if query exists
      const existingQuery = await storage.getLdapQuery(id);
      if (!existingQuery) {
        return res.status(404).json({ error: "LDAP query not found" });
      }

      try {
        // Validate the filter format
        const queryBuilder = validateQueryBuilder({ targetObject, filter });
        
        // Generate the LDAP filter and readable representation
        const ldapFilter = generateLdapFilter(queryBuilder);
        const readableFilter = getHumanReadableFilter(queryBuilder.filter);
        
        // Create a version entry for the previous state
        const versionEntry: InsertLdapQueryVersion = {
          queryId: id,
          version: existingQuery.version,
          filterJson: existingQuery.filterJson as any, // Type safety is handled by schema validation
          ldapFilter: existingQuery.ldapFilter,
          readableFilter: existingQuery.readableFilter,
          targetObject: existingQuery.targetObject,
          createdBy: existingQuery.createdBy,
          modifiedBy: req.user?.id || 1 // Default to 1 if no user
        };
        
        await storage.createLdapQueryVersion(versionEntry);
        
        // Update the query with new values
        const updatedQuery = await storage.updateLdapQuery(id, {
          name,
          description: description || "",
          targetObject,
          filterJson: filter as any,
          ldapFilter,
          readableFilter,
          modifiedBy: req.user?.id || 1, // Default to 1 if no user
          version: existingQuery.version + 1
        });
        
        res.status(200).json(updatedQuery);
      } catch (error: any) {
        console.error("Error validating query:", error);
        return res.status(400).json({ error: "Invalid query format", details: error.message });
      }
    } catch (error) {
      console.error("Error updating LDAP query:", error);
      res.status(500).json({ error: "Failed to update LDAP query" });
    }
  });

  /**
   * @swagger
   * /ldap-queries/{id}:
   *   delete:
   *     summary: Delete an LDAP query
   *     description: Delete an LDAP query and all its versions
   *     tags: [LDAP Query Builder]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Query ID
   *     responses:
   *       204:
   *         description: Query deleted successfully
   *       404:
   *         description: Query not found
   */
  router.delete("/ldap-queries/:id", hasPermission("delete:ldap_queries"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid query ID" });
      }

      // Check if query exists
      const existingQuery = await storage.getLdapQuery(id);
      if (!existingQuery) {
        return res.status(404).json({ error: "LDAP query not found" });
      }

      // Delete the query - versions will be deleted via cascading foreign key constraints
      await storage.deleteLdapQuery(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting LDAP query:", error);
      res.status(500).json({ error: "Failed to delete LDAP query" });
    }
  });

  /**
   * @swagger
   * /ldap-queries/{id}/revert/{version}:
   *   post:
   *     summary: Revert to a previous version
   *     description: Revert an LDAP query to a specific previous version
   *     tags: [LDAP Query Builder]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Query ID
   *       - in: path
   *         name: version
   *         required: true
   *         schema:
   *           type: integer
   *         description: Version to revert to
   *     responses:
   *       200:
   *         description: Query reverted successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LdapQuery'
   *       404:
   *         description: Query or version not found
   */
  router.post("/ldap-queries/:id/revert/:version", hasPermission("write:ldap_queries"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const versionNumber = parseInt(req.params.version);
      
      if (isNaN(id) || isNaN(versionNumber)) {
        return res.status(400).json({ error: "Invalid query ID or version" });
      }

      // Check if query exists
      const existingQuery = await storage.getLdapQuery(id);
      if (!existingQuery) {
        return res.status(404).json({ error: "LDAP query not found" });
      }

      // Find the version to revert to - we need to get all versions and find the matching one
      const allVersions = await storage.getLdapQueryVersions(id);
      const versionToRevert = allVersions.find(v => v.version === versionNumber);
      
      if (!versionToRevert) {
        return res.status(404).json({ error: "Version not found" });
      }

      // Create a version entry for the current state
      const versionEntry: InsertLdapQueryVersion = {
        queryId: id,
        version: existingQuery.version,
        filterJson: existingQuery.filterJson as any, // Type safety is handled by schema validation
        ldapFilter: existingQuery.ldapFilter,
        readableFilter: existingQuery.readableFilter,
        targetObject: existingQuery.targetObject,
        createdBy: existingQuery.createdBy,
        modifiedBy: req.user?.id || 1 // Default to 1 if no user
      };
      
      await storage.createLdapQueryVersion(versionEntry);
      
      // Update the query with the version's values
      const updatedQuery = await storage.updateLdapQuery(id, {
        targetObject: versionToRevert.targetObject,
        filterJson: versionToRevert.filterJson as any,
        ldapFilter: versionToRevert.ldapFilter,
        readableFilter: versionToRevert.readableFilter,
        modifiedBy: req.user?.id || 1, // Default to 1 if no user
        version: existingQuery.version + 1
      });
      
      res.status(200).json(updatedQuery);
    } catch (error) {
      console.error("Error reverting LDAP query:", error);
      res.status(500).json({ error: "Failed to revert LDAP query" });
    }
  });

  /**
   * @swagger
   * /ldap-queries/test:
   *   post:
   *     summary: Test an LDAP query filter
   *     description: Test a filter against an LDAP connection to see what objects would be returned
   *     tags: [LDAP Query Builder]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               connectionId:
   *                 type: integer
   *               targetObject:
   *                 type: string
   *                 enum: [users, groups, computers, ous]
   *               filter:
   *                 type: object
   *               limit:
   *                 type: integer
   *                 default: 100
   *               properties:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Query results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 count:
   *                   type: integer
   *                 results:
   *                   type: array
   *                   items:
   *                     type: object
   *                 filter:
   *                   type: string
   *       400:
   *         description: Invalid query or connection
   *       404:
   *         description: Connection not found
   */
  /**
   * @swagger
   * /ldap-queries/attributes:
   *   get:
   *     summary: Get available LDAP attributes
   *     description: Retrieve a list of available attributes for the specified object type from an LDAP connection
   *     tags: [LDAP Query Builder]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: connectionId
   *         required: true
   *         schema:
   *           type: integer
   *         description: LDAP Connection ID
   *       - in: query
   *         name: targetObject
   *         required: true
   *         schema:
   *           type: string
   *           enum: [users, groups, computers, ous]
   *         description: The type of object to get attributes for
   *     responses:
   *       200:
   *         description: A list of available attributes
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   name:
   *                     type: string
   *                     description: The attribute name
   *                   type:
   *                     type: string
   *                     description: The attribute data type (string, number, boolean, datetime)
   *                   description:
   *                     type: string
   *                     description: Human-readable description of the attribute
   *                   isMultiValued:
   *                     type: boolean
   *                     description: Whether the attribute can have multiple values
   *       400:
   *         description: Invalid request parameters
   *       404:
   *         description: Connection not found
   */
  router.get("/ldap-queries/attributes", hasPermission("read:ldap_objects"), async (req, res) => {
    try {
      const connectionId = parseInt(req.query.connectionId as string);
      const targetObject = req.query.targetObject as "users" | "groups" | "computers" | "ous";
      
      if (isNaN(connectionId)) {
        return res.status(400).json({ error: "Invalid connection ID" });
      }
      
      if (!targetObject || !["users", "groups", "computers", "ous"].includes(targetObject)) {
        return res.status(400).json({ error: "Invalid target object type" });
      }
      
      // Get the connection
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ error: "LDAP connection not found" });
      }
      
      // Connect to LDAP
      try {
        const client = await connectToLdap(connection);
        
        // Get available attributes
        const attributes = await getLdapAvailableAttributes(client, targetObject);
        
        // Close the connection
        client.destroy();
        
        // Return the attributes
        res.json(attributes);
      } catch (error) {
        console.error("Error connecting to LDAP:", error);
        return res.status(500).json({ 
          error: "Failed to connect to LDAP server", 
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error getting LDAP attributes:", error);
      res.status(500).json({ error: "Failed to retrieve LDAP attributes" });
    }
  });

  router.post("/ldap-queries/test", hasPermission("read:ldap_objects"), async (req, res) => {
    try {
      const { connectionId, targetObject, filter, limit = 100, properties = [] } = req.body;

      if (!connectionId || !targetObject || !filter) {
        return res.status(400).json({ error: "Missing required fields: connectionId, targetObject, filter" });
      }

      // Get the connection
      const connection = await storage.getLdapConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ error: "LDAP connection not found" });
      }

      // Validate and generate the filter
      let ldapFilter: string;
      try {
        const queryBuilder = validateQueryBuilder({ targetObject, filter });
        ldapFilter = generateLdapFilter(queryBuilder);
      } catch (error: any) {
        return res.status(400).json({ error: "Invalid filter format", details: error.message });
      }

      // Connect to LDAP
      const client = await connectToLdap(connection);

      try {
        // Execute the search
        const results = await searchLdap(client, {
          filter: ldapFilter,
          attributes: properties.length > 0 ? properties : undefined,
          limit
        });

        // Return the results
        res.json({
          count: results.length,
          results,
          filter: ldapFilter
        });
      } finally {
        // Always destroy the client
        client.destroy();
      }
    } catch (error: any) {
      console.error("Error testing LDAP query:", error);
      res.status(500).json({ error: "Failed to test LDAP query", details: error.message });
    }
  });
}