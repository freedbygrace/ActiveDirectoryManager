# Active Directory Management API Features

## Core Features

### LDAP Connection Management
- Configure and manage multiple LDAP connections
- Test connections with automatic status tracking
- Support for TLS/SSL secure connections

### User Management
- View and search Active Directory users
- Filter by various attributes (name, email, department, etc.)
- Enable/disable user accounts
- Reset passwords
- Move users between Organizational Units
- Add/remove users from groups

### Group Management
- Create, edit, and delete groups
- View group memberships
- Add and remove members
- Change group scope and type
- Move groups between Organizational Units

### Dynamic Group Management
- Create LDAP query-based rules for automatic group membership
- Schedule rule execution with cron expressions (basic or advanced mode)
- Bind rules to specific LDAP connections
- Support for dynamic variables in group names and OU paths
- Automatic creation of groups and OUs as needed

### Organizational Unit Management
- Create, edit, and delete OUs
- Move OUs in the directory tree
- Set management delegation

### Computer Management
- View and search domain computers
- Filter by various attributes (name, OS, last logon)
- Enable/disable computer accounts
- Move computers between Organizational Units
- Add/remove computers from groups

### Domain Information
- View domain details and functional levels
- Domain controller information
- Trust relationships

### Sites and Subnets
- View and manage Active Directory sites
- Configure subnet assignments to sites
- Create and manage site links

### LDAP Query Builder
- Visual query builder with condition groups
- Support for multiple filter conditions
- Real-time LDAP filter generation
- Filter saving and version control
- One-click copy feature
- Drag and drop condition ordering

### Dashboard and Reporting
- Customizable dashboards with various chart types
- Data visualization for Active Directory metrics
- Export capability to PDF or images
- Shareable dashboard snapshots with custom branding

### API Access
- API token management for programmatic access
- Rate limiting and expiration controls
- Role-based access control for API consumers

### Audit Logging
- Comprehensive audit trail for all directory changes
- Filterable and searchable logs
- Export capability

## Authentication and Security

### Multi-method Authentication
- Local username/password authentication
- LDAP authentication against configured connections
- OpenID Connect (OIDC) integration

### Role-based Access Control
- Granular permission system
- Multiple user roles
- Role assignment and management

## Technical Features

### API Documentation
- Full Swagger/OpenAPI documentation
- Interactive API testing
- Downloadable API specifications

### Caching
- Redis caching support for improved performance
- Configurable cache expiration

### Performance Optimization
- Pagination for large data sets
- Request throttling
- Query optimization

### Deployment
- Docker-based deployment
- Comprehensive environment variable configuration
- Support for various deployment scenarios