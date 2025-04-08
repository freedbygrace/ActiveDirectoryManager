import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export const setupSwagger = (app: Express) => {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Active Directory Management API',
        version: '1.0.0',
        description: 'RESTful API for managing Active Directory resources',
        contact: {
          name: 'API Support',
          email: 'support@example.com'
        }
      },
      servers: [
        {
          url: '/api',
          description: 'API Server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                description: 'User ID'
              },
              username: {
                type: 'string',
                description: 'Username'
              },
              email: {
                type: 'string',
                description: 'Email address'
              },
              isAdmin: {
                type: 'boolean',
                description: 'Admin status'
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Creation date'
              }
            }
          },
          ApiToken: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                description: 'Token ID'
              },
              name: {
                type: 'string',
                description: 'Token name'
              },
              token: {
                type: 'string',
                description: 'The actual token'
              },
              userId: {
                type: 'integer',
                description: 'User ID that owns the token'
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Creation date'
              },
              lastUsedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Last used date'
              },
              expiresAt: {
                type: 'string',
                format: 'date-time',
                description: 'Expiration date'
              }
            }
          },
          LdapConnection: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                description: 'Connection ID'
              },
              name: {
                type: 'string',
                description: 'Connection name'
              },
              server: {
                type: 'string',
                description: 'Server hostname/IP'
              },
              port: {
                type: 'integer',
                description: 'Server port'
              },
              authType: {
                type: 'string',
                description: 'Authentication type'
              },
              username: {
                type: 'string',
                description: 'Username'
              },
              baseDN: {
                type: 'string',
                description: 'Base Distinguished Name'
              },
              useTLS: {
                type: 'boolean',
                description: 'Use TLS/SSL'
              },
              status: {
                type: 'string',
                description: 'Connection status'
              },
              lastConnected: {
                type: 'string',
                format: 'date-time',
                description: 'Last connected timestamp'
              }
            }
          },
          ActivityLog: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                description: 'Log ID'
              },
              action: {
                type: 'string',
                description: 'Action performed'
              },
              resource: {
                type: 'string',
                description: 'Resource name'
              },
              resourceType: {
                type: 'string',
                description: 'Resource type'
              },
              userId: {
                type: 'integer',
                description: 'User ID'
              },
              username: {
                type: 'string',
                description: 'Username'
              },
              status: {
                type: 'string',
                description: 'Status'
              },
              details: {
                type: 'object',
                description: 'Additional details'
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Timestamp'
              }
            }
          },
          LdapUser: {
            type: 'object',
            properties: {
              cn: {
                type: 'string',
                description: 'Common Name'
              },
              sAMAccountName: {
                type: 'string',
                description: 'SAM Account Name'
              },
              mail: {
                type: 'string',
                description: 'Email address'
              },
              distinguishedName: {
                type: 'string',
                description: 'Distinguished Name'
              }
            }
          },
          LdapGroup: {
            type: 'object',
            properties: {
              cn: {
                type: 'string',
                description: 'Common Name'
              },
              distinguishedName: {
                type: 'string',
                description: 'Distinguished Name'
              },
              member: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Group members'
              }
            }
          },
          LdapOU: {
            type: 'object',
            properties: {
              ou: {
                type: 'string',
                description: 'Organizational Unit name'
              },
              distinguishedName: {
                type: 'string',
                description: 'Distinguished Name'
              }
            }
          },
          LdapComputer: {
            type: 'object',
            properties: {
              cn: {
                type: 'string',
                description: 'Computer name'
              },
              distinguishedName: {
                type: 'string',
                description: 'Distinguished Name'
              },
              operatingSystem: {
                type: 'string',
                description: 'Operating System'
              }
            }
          },
          Error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Error message'
              }
            }
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ]
    },
    apis: ['./server/api.ts']
  };

  const swaggerSpec = swaggerJsdoc(options);
  
  app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Serve the OpenAPI spec as JSON
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
