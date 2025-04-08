import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Active Directory Management API",
      version: "1.0.0",
      description: "REST API for managing Active Directory resources",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
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
            distinguishedName: { type: "string" },
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
            distinguishedName: { type: "string" },
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
            distinguishedName: { type: "string" },
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
            distinguishedName: { type: "string" },
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
            distinguishedName: { type: "string" },
            name: { type: "string" },
            netBIOSName: { type: "string" },
            forestName: { type: "string" },
            domainFunctionality: { type: "string" },
            adProperties: { type: "object" },
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
  // Mount at both paths for backward compatibility
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Provide the JSON spec at multiple paths
  app.get("/api/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  
  app.get("/api-docs/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}
