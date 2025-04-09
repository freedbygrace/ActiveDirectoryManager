import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { getQueryParametersDocumentation } from "./query-parser";
import debugLib from "debug";

const debug = debugLib('api:swagger');

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Active Directory Management API",
      version: "1.0.0",
      description: "REST API for managing Active Directory resources. This API provides comprehensive capabilities for managing Active Directory users, groups, organizational units, and more through a RESTful interface.",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      }
    },
    externalDocs: {
      description: "Find out more about this API",
      url: "/api/docs/more-info"
    },
    servers: [
      {
        url: "/api",
        description: "API base URL",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            username: { type: "string" },
            email: { type: "string" },
            fullName: { type: "string" },
            role: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ApiToken: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            token: { type: "string" },
            userId: { type: "integer" },
            customPermissions: { type: "array", items: { type: "string" } },
            expiresAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        LdapConnection: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            server: { type: "string" },
            domain: { type: "string" },
            port: { type: "integer" },
            useSSL: { type: "boolean" },
            username: { type: "string" },
            status: { type: "string", enum: ["connected", "disconnected"] },
            lastConnected: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AdUser: {
          type: "object",
          properties: {
            id: { type: "integer" },
            connectionId: { type: "integer" },
            objectGUID: { type: "string" },
            distinguishedName: { type: "string" },
            canonicalName: { type: "string" },
            cn: { type: "string" },
            sAMAccountName: { type: "string" },
            userPrincipalName: { type: "string" },
            givenName: { type: "string" },
            surname: { type: "string" },
            displayName: { type: "string" },
            email: { type: "string" },
            enabled: { type: "boolean" },
            lastLogon: { type: "string", format: "date-time" },
            memberOf: { type: "array", items: { type: "string" } },
            adProperties: { type: "object" },
          },
        },
        AdGroup: {
          type: "object",
          properties: {
            id: { type: "integer" },
            connectionId: { type: "integer" },
            objectGUID: { type: "string" },
            distinguishedName: { type: "string" },
            canonicalName: { type: "string" },
            cn: { type: "string" },
            sAMAccountName: { type: "string" },
            groupType: { type: "string" },
            description: { type: "string" },
            members: { type: "array", items: { type: "string" } },
            adProperties: { type: "object" },
          },
        },
        AdOrgUnit: {
          type: "object",
          properties: {
            id: { type: "integer" },
            connectionId: { type: "integer" },
            objectGUID: { type: "string" },
            distinguishedName: { type: "string" },
            canonicalName: { type: "string" },
            cn: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            adProperties: { type: "object" },
          },
        },
        AdComputer: {
          type: "object",
          properties: {
            id: { type: "integer" },
            connectionId: { type: "integer" },
            objectGUID: { type: "string" },
            distinguishedName: { type: "string" },
            canonicalName: { type: "string" },
            cn: { type: "string" },
            name: { type: "string" },
            dnsHostName: { type: "string" },
            operatingSystem: { type: "string" },
            operatingSystemVersion: { type: "string" },
            lastLogon: { type: "string", format: "date-time" },
            enabled: { type: "boolean" },
            adProperties: { type: "object" },
          },
        },
        AdDomain: {
          type: "object",
          properties: {
            id: { type: "integer" },
            connectionId: { type: "integer" },
            objectGUID: { type: "string" },
            distinguishedName: { type: "string" },
            canonicalName: { type: "string" },
            cn: { type: "string" },
            name: { type: "string" },
            netBIOSName: { type: "string" },
            forestName: { type: "string" },
            domainFunctionality: { type: "string" },
            adProperties: { type: "object" },
          },
        },
        LdapAttribute: {
          type: "object",
          properties: {
            id: { type: "integer" },
            connectionId: { type: "integer" },
            name: { type: "string" },
            displayName: { type: "string" },
            description: { type: "string" },
            type: { type: "string" },
            multiValued: { type: "boolean" },
            objectClass: { type: "string", enum: ["user", "group", "organizationalUnit", "computer", "domain"] },
            isIndexed: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        LdapFilter: {
          type: "object",
          properties: {
            id: { type: "integer" },
            connectionId: { type: "integer" },
            name: { type: "string" },
            description: { type: "string" },
            objectClass: { type: "string", enum: ["user", "group", "organizationalUnit", "computer", "domain"] },
            filter: { type: "object" },
            ldapFilter: { type: "string" },
            createdBy: { type: "integer" },
            modifiedBy: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        LdapFilterRevision: {
          type: "object",
          properties: {
            id: { type: "integer" },
            filterId: { type: "integer" },
            version: { type: "integer" },
            filter: { type: "object" },
            ldapFilter: { type: "string" },
            createdBy: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            comment: { type: "string" },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: { type: "array", items: { type: "string" } },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
      parameters: {
        filterParam: {
          name: "filter",
          in: "query",
          description: "Filter expression (e.g. name eq 'John')",
          schema: { type: "string" },
        },
        selectParam: {
          name: "select",
          in: "query",
          description: "Properties to select (comma-separated)",
          schema: { type: "string" },
        },
        expandParam: {
          name: "expand",
          in: "query",
          description: "Related entities to expand (comma-separated)",
          schema: { type: "string" },
        },
        orderByParam: {
          name: "orderBy",
          in: "query",
          description: "Property to order by (e.g. name asc)",
          schema: { type: "string" },
        },
        topParam: {
          name: "top",
          in: "query",
          description: "Number of records to return",
          schema: { type: "integer" },
        },
        skipParam: {
          name: "skip",
          in: "query",
          description: "Number of records to skip",
          schema: { type: "integer" },
        },
        AuditLog: {
          type: "object",
          properties: {
            id: { type: "integer" },
            action: { type: "string" },
            targetId: { type: "string" },
            details: { 
              type: "object",
              additionalProperties: true
            },
            userId: { type: "integer" },
            timestamp: { type: "string", format: "date-time" },
            connectionId: { type: "integer" }
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Authentication required",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        BadRequestError: {
          description: "Invalid request",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ["./server/routes.ts"], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export function setupSwagger(app: Express) {
  // Configure Swagger UI with additional options
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      filter: true,
    },
  };

  // Mount at both paths for backward compatibility
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  // Provide the JSON spec at multiple paths
  app.get("/api/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  
  app.get("/api-docs/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Add download endpoint for the OpenAPI specification
  app.get("/api/docs/download", (req, res) => {
    const format = req.query.format?.toString().toLowerCase() || 'json';
    
    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename=openapi-spec.json');
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(swaggerSpec, null, 2));
    } else if (format === 'yaml' || format === 'yml') {
      try {
        // We'll need to import yaml dynamically or handle YAML conversion manually
        // For simplicity, just sending JSON if yaml not supported
        res.setHeader('Content-Disposition', 'attachment; filename=openapi-spec.json');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(swaggerSpec, null, 2));
        debug('YAML download requested but not implemented, sending JSON');
      } catch (err) {
        debug('Error generating YAML:', err);
        res.setHeader('Content-Disposition', 'attachment; filename=openapi-spec.json');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(swaggerSpec, null, 2));
      }
    } else {
      res.status(400).send({ error: 'Invalid format. Supported formats: json, yaml' });
    }
  });

  // Add documentation for query parameters and filtering
  app.get("/api/docs/more-info", (req, res) => {
    const queryParamsInfo = getQueryParametersDocumentation();
    res.send(`
      <html>
        <head>
          <title>Active Directory Management API - Advanced Usage</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
            h1, h2, h3 { color: #0066cc; }
            pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
            code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .btn { display: inline-block; padding: 10px 15px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .btn:hover { background-color: #004c99; }
          </style>
        </head>
        <body>
          <h1>Active Directory Management API - Advanced Usage Guide</h1>
          
          <h2>API Documentation</h2>
          <p>The complete API documentation is available at <a href="/api/docs">/api/docs</a>.</p>
          <p>You can also download the OpenAPI specification:</p>
          <p>
            <a href="/api/docs/download?format=json" class="btn">Download OpenAPI Spec (JSON)</a>
            <a href="/api/docs/download?format=yaml" class="btn">Download OpenAPI Spec (YAML)</a>
          </p>
          
          <h2>Query Parameters and Filtering</h2>
          <pre>${queryParamsInfo}</pre>
          
          <h2>Authentication</h2>
          <p>This API supports two authentication methods:</p>
          <ul>
            <li><strong>Session-based authentication</strong>: Used when accessing the API from the web interface.</li>
            <li><strong>API Token authentication</strong>: Used when accessing the API programmatically.</li>
          </ul>
          
          <h3>API Token Authentication</h3>
          <p>To authenticate using an API token, include the token in the Authorization header:</p>
          <pre>Authorization: Bearer YOUR_API_TOKEN</pre>
          
          <h2>Rate Limiting</h2>
          <p>The API has rate limiting in place to prevent abuse. The current limits are:</p>
          <ul>
            <li>100 requests per minute for authenticated users</li>
            <li>20 requests per minute for unauthenticated users</li>
          </ul>
          
          <h2>Error Handling</h2>
          <p>The API returns consistent error responses with the following structure:</p>
          <pre>{
  "message": "Error message",
  "errors": [
    {
      "path": ["field", "subfield"],
      "message": "Specific error message"
    }
  ]
}</pre>
          
          <h2>Example Usage</h2>
          <h3>Filter Users by Name</h3>
          <pre>GET /api/connections/1/ad-users?filter=displayName contains 'John'</pre>
          
          <h3>Select Specific Fields</h3>
          <pre>GET /api/connections/1/ad-users?select=id,displayName,email</pre>
          
          <h3>Pagination</h3>
          <pre>GET /api/connections/1/ad-users?top=10&skip=20</pre>
          
          <h3>Combining Parameters</h3>
          <pre>GET /api/connections/1/ad-users?filter=enabled eq true&select=id,displayName,email&orderBy=displayName asc&top=10</pre>
          
          <p>Return to <a href="/api/docs">API Documentation</a></p>
        </body>
      </html>
    `);
  });
}
