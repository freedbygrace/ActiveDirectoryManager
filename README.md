# Active Directory Management Platform

A comprehensive REST API and admin interface for Active Directory management, designed for efficient user and resource management with advanced configuration and monitoring capabilities.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Development Setup](#development-setup)
  - [Production Deployment](#production-deployment)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [LDAP Query Builder](#ldap-query-builder)
- [Contributing](#contributing)
- [License](#license)

## Features

The Active Directory Management Platform provides the following key features:

### Core Functionality
- **User Management**: Create, read, update, and delete Active Directory users with comprehensive attribute support
- **Group Management**: Manage security and distribution groups, including nested group structures
- **Organizational Unit (OU) Management**: Create and manage the hierarchical OU structure
- **Computer Management**: Manage computer accounts with detailed property configuration
- **Domain Management**: View and configure domain controllers and settings

### Administration
- **API Token Management**: Create and manage API tokens for secure programmatic access
- **LDAP Connection Management**: Configure and test multiple LDAP server connections
- **Role-Based Access Control**: Granular permissions system for secure delegation of administrative tasks
- **User Management**: Admin interface for managing platform users and their permissions

### Advanced Features
- **Dynamic Group Management**: Automated group membership management
  - Rules based on LDAP queries for dynamic group assignment
  - Scheduled execution with flexible cron expressions
  - Variable support for dynamic group and OU naming
  - Automatic creation of target groups and OUs as needed
  - Multi-connection support for cross-domain management
- **Custom Dashboards**: Custom visualizations for Active Directory metrics
  - Multiple chart types (bar, line, pie, etc.)
  - Data export capabilities (PDF, image)
  - Shareable dashboard snapshots with custom branding
- **LDAP Query Builder**: Visual interface for building, testing, and saving complex LDAP queries
  - Filter version history with revision control
  - Revert to previous filter versions
  - Test filters against live Active Directory data
  - Save frequently used filters for reuse
  - Drag and drop condition reordering
  - One-click copy feature for generated queries
- **API Filtering**: Dynamic property filtering on all API endpoints
- **Bulk Operations**: Efficient batch processing for operations on multiple directory objects
- **Audit Logging**: Comprehensive audit trail for all directory changes
- **Caching**: Redis-based caching for improved performance

## Technology Stack

### Backend
- **Express.js**: Fast, unopinionated, minimalist web framework for Node.js
- **PostgreSQL**: Advanced open-source relational database with JSON support
- **Drizzle ORM**: Type-safe SQL query builder and ORM for TypeScript
- **Redis**: In-memory data structure store used for caching
- **Passport.js**: Authentication middleware for Node.js
- **Swagger/OpenAPI**: API documentation and specification

### Frontend
- **React**: JavaScript library for building user interfaces
- **Material UI**: React components that implement Google's Material Design
- **React Query**: Powerful data synchronization for React applications
- **Recharts**: Composable charting library built on React components
- **React Hook Form**: Performant forms with easy-to-use validation

### DevOps
- **Docker**: Containerization platform for consistent deployment

## Architecture

The application follows a modern web architecture with clear separation of concerns:

1. **Client Layer**: React-based SPA that provides the user interface
2. **API Layer**: Express.js REST API with comprehensive endpoint coverage
3. **Service Layer**: Business logic implementation with domain-specific services
4. **Data Access Layer**: Database interaction through Drizzle ORM
5. **Infrastructure Layer**: PostgreSQL database, Redis cache, and LDAP connectivity

## Installation

### Prerequisites

- Node.js v18 or later
- PostgreSQL v13 or later
- Redis v6 or later
- Docker and Docker Compose (for containerized deployment)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ad-management-platform.git
   cd ad-management-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file from the example:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. The application will be available at:
   - Frontend: http://localhost:5000
   - API: http://localhost:5000/api
   - Swagger Documentation: http://localhost:5000/api/docs

### Production Deployment

#### Using Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ad-management-platform.git
   cd ad-management-platform
   ```

2. Create a .env file from the example:
   ```bash
   cp .env.example .env
   # Edit .env with your production configuration
   ```

3. Set up environment variables for production:
   ```bash
   # Make sure to set appropriate values in your .env file
   # For production deployments, ensure secure values for SESSION_SECRET and other security settings
   ```

4. Start the application stack:
   ```bash
   docker-compose up -d
   ```

5. The application will be available at:
   - Frontend: https://your-server-domain
   - API: https://your-server-domain/api
   - Swagger Documentation: https://your-server-domain/api/docs

#### Manual Deployment

For manual deployment instructions, refer to the [Deployment Guide](DEPLOYMENT.md).

## API Documentation

The API is thoroughly documented using the OpenAPI specification (Swagger):

- **Interactive Documentation**: Available at `/api/docs` when the application is running
- **Downloadable Specification**: Available at `/api/docs/download`
- **Advanced Usage Guide**: Available at `/api/docs/more-info`

### API Standards

- **Authentication**: JWT tokens via Authorization header
- **Request Format**: JSON with proper content-type headers
- **Response Format**: Consistent JSON structure with appropriate status codes
- **Error Handling**: Descriptive error messages and appropriate HTTP status codes

### Filterable Endpoints

All list endpoints support filtering with a flexible query syntax:

```
GET /api/users?filter[firstName]=John&filter[lastName]=Doe
GET /api/groups?filter[description]=contains:Marketing
```

## Configuration

Configuration is managed through environment variables. See [.env.example](.env.example) for a complete list of available options.

### Key Configuration Options

- **Database**: PostgreSQL connection settings
- **Redis**: Caching configuration
- **Session**: Security settings for user sessions
- **JWT**: Settings for API tokens
- **LDAP**: Connection parameters for Active Directory
- **Rate Limiting**: API request restrictions
- **Logging**: Debug and audit log configuration
- **Default Admin**: Initial admin user configuration
- **Authentication**: LDAP and OpenID Connect (OIDC) authentication settings
- **Registration**: Enable/disable user registration

## LDAP Query Builder

The LDAP Query Builder is an advanced feature that helps administrators construct complex LDAP queries through a visual interface.

### Features

- **Visual Query Construction**: Build LDAP filters without knowing the exact syntax
- **Object Class Selection**: Pre-configured attribute lists based on Active Directory object classes
- **Condition Groups**: Create complex queries with nested AND/OR logic
- **Live Preview**: See the generated LDAP filter syntax as you build
- **Testing**: Execute the query against your Active Directory to validate results
- **Saving**: Store frequently used queries for later use
- **Version History**: Track changes to queries with full revision history
- **Rollback**: Revert to previous versions if needed

### Usage

1. Navigate to the LDAP Query Builder page from the main navigation
2. Select a connection and object class
3. Build your filter by adding conditions or groups
4. Test the filter to see results
5. Save the filter with a descriptive name
6. Access saved filters for later use or sharing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.