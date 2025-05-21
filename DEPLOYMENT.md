# Deployment Guide

This document provides detailed instructions for deploying the Active Directory Management Platform in various environments.

## Table of Contents

- [Docker Deployment](#docker-deployment)
  - [Prerequisites](#prerequisites)
  - [Deployment Steps](#deployment-steps)
  - [Configuration](#configuration)
  - [Health Monitoring](#health-monitoring)
  - [Backups](#backups)
  - [Scaling](#scaling)
- [Manual Deployment](#manual-deployment)
  - [Prerequisites](#prerequisites-1)
  - [Installation Steps](#installation-steps)
  - [Service Configuration](#service-configuration)
  - [Reverse Proxy Setup](#reverse-proxy-setup)
- [Cloud Deployment](#cloud-deployment)
  - [AWS Deployment](#aws-deployment)
  - [Azure Deployment](#azure-deployment)
  - [Google Cloud Deployment](#google-cloud-deployment)
- [Production Best Practices](#production-best-practices)
  - [Security Considerations](#security-considerations)
  - [Performance Tuning](#performance-tuning)
  - [Monitoring and Logging](#monitoring-and-logging)
  - [High Availability Setup](#high-availability-setup)

## Docker Deployment

### Prerequisites

- Docker Engine v20.10.0 or later
- Docker Compose v2.0.0 or later
- At least 2GB of RAM
- 10GB of disk space
- Access to LDAP/Active Directory server(s)
- Domain name with SSL certificates (recommended for production)

### Deployment Steps

1. **Prepare the Environment**

   Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ad-management-platform.git
   cd ad-management-platform
   ```

2. **Configure Environment Variables**

   Create a .env file from the example:
   ```bash
   cp .env.example .env
   ```

   Edit the .env file with your specific configuration:
   ```bash
   nano .env
   ```

3. **SSL Configuration**

   For production environments, the application is designed to work behind a reverse proxy or load balancer that handles SSL termination.

   If you need to implement SSL directly in your environment, consider:

   - Using a reverse proxy like Nginx or Traefik in front of the application
   - Setting up SSL termination at the infrastructure level (e.g., using AWS Application Load Balancer)
   - Configuring your cloud provider's SSL management services

4. **Start the Application Stack**

   ```bash
   docker-compose up -d
   ```

5. **Initialize the Database**

   The first time you run the application, you need to apply migrations:
   ```bash
   docker-compose exec app npm run db:push
   ```

6. **Create an Admin User**

   ```bash
   docker-compose exec app npm run create-admin
   ```

7. **Verify Deployment**

   Access the application at:
   - Frontend: https://your-server-domain
   - API: https://your-server-domain/api
   - Swagger Documentation: https://your-server-domain/api/docs

### Configuration

The application is configured through environment variables defined in the .env file. Key configuration sections:

#### Database Configuration
```
POSTGRES_USER=admanagement
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=admanagement
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

#### Redis Configuration
```
REDIS_URL=redis://redis:6379
```

#### Application Configuration
```
NODE_ENV=production
PORT=5000
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=24h
```

#### LDAP Connection Settings
```
LDAP_CONNECT_TIMEOUT=10000
LDAP_IDLE_TIMEOUT=60000
LDAP_RECONNECT_TIMEOUT=10000
```

### Health Monitoring

The application provides health check endpoints:

- **API Health**: `https://your-server-domain/api/health`
- **Database Health**: `https://your-server-domain/api/health/db`
- **Redis Health**: `https://your-server-domain/api/health/redis`
- **LDAP Health**: `https://your-server-domain/api/health/ldap`

These endpoints can be used with monitoring tools like Prometheus, Grafana, or cloud provider health checks.

### Backups

#### Database Backups

Use the following command to backup the PostgreSQL database:

```bash
docker-compose exec postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup_$(date +%Y%m%d%H%M%S).sql
```

Set up a cron job for regular backups:

```bash
0 2 * * * cd /path/to/ad-management-platform && docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backups/backup_$(date +%Y%m%d%H%M%S).sql
```

#### Restore from Backup

```bash
cat backup_file.sql | docker-compose exec -T postgres psql -U ${POSTGRES_USER} ${POSTGRES_DB}
```

### Scaling

For higher loads, consider scaling the application:

1. **Horizontal Scaling**:
   - Modify docker-compose.yml to add more application instances
   - Set up load balancing with an appropriate solution for your environment

2. **Vertical Scaling**:
   - Allocate more resources to containers
   - Optimize database and Redis configurations

3. **Database Scaling**:
   - Consider PostgreSQL replication for read-heavy workloads
   - Implement connection pooling

## Manual Deployment

### Prerequisites

- Node.js v18 or later
- PostgreSQL v13 or later
- Redis v6 or later
- PM2 or systemd for process management
- (Optional) A reverse proxy for production environments

### Installation Steps

1. **System Preparation**

   Update system packages and install dependencies:
   ```bash
   apt update && apt upgrade -y
   apt install -y curl git build-essential
   ```

2. **Install Node.js**

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt install -y nodejs
   ```

3. **Install PostgreSQL**

   ```bash
   apt install -y postgresql postgresql-contrib
   ```

   Create a database and user:
   ```bash
   sudo -u postgres psql -c "CREATE USER admanagement WITH PASSWORD 'your_secure_password';"
   sudo -u postgres psql -c "CREATE DATABASE admanagement OWNER admanagement;"
   ```

4. **Install Redis**

   ```bash
   apt install -y redis-server
   ```

   Configure Redis:
   ```bash
   sed -i 's/supervised no/supervised systemd/g' /etc/redis/redis.conf
   systemctl restart redis
   ```

5. **Clone and Configure the Application**

   ```bash
   git clone https://github.com/yourusername/ad-management-platform.git /opt/ad-management
   cd /opt/ad-management
   npm install --production
   ```

   Create and configure .env file:
   ```bash
   cp .env.example .env
   nano .env
   ```

6. **Build the Application**

   ```bash
   npm run build
   ```

7. **Set Up Database**

   ```bash
   npm run db:push
   ```

8. **Create Admin User**

   ```bash
   npm run create-admin
   ```

9. **Set Up Process Management with PM2**

   Install PM2:
   ```bash
   npm install -g pm2
   ```

   Create a process file (ecosystem.config.js):
   ```bash
   cat > ecosystem.config.js << EOF
   module.exports = {
     apps: [{
       name: 'ad-management',
       script: 'dist/server/index.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production'
       }
     }]
   };
   EOF
   ```

   Start the application:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Service Configuration

Alternatively, you can use systemd for process management:

```bash
cat > /etc/systemd/system/ad-management.service << EOF
[Unit]
Description=Active Directory Management Platform
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ad-management
ExecStart=/usr/bin/node dist/server/index.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start the service:
```bash
systemctl enable ad-management
systemctl start ad-management
```

### Reverse Proxy Setup (Optional)

In production, you may choose to place your application behind a reverse proxy for SSL termination, load balancing, or additional security. Options include:

#### Common Reverse Proxy Options

1. **Nginx** - Lightweight, high-performance web server and reverse proxy
2. **Apache** - Full-featured web server with mod_proxy
3. **Traefik** - Modern, auto-configuring reverse proxy designed for microservices
4. **HAProxy** - High-performance TCP/HTTP load balancer
5. **Caddy** - Modern web server with automatic HTTPS

Key configurations to include when setting up a reverse proxy:

1. **SSL Termination** - Handle HTTPS traffic and forward to your application
2. **Security Headers** - Add headers like X-Frame-Options, X-XSS-Protection, and Content-Security-Policy
3. **Caching** - Configure appropriate caching for static assets
4. **Compression** - Enable gzip/brotli compression for faster content delivery
5. **WebSocket Support** - Ensure WebSocket connections are properly handled
6. **Health Checks** - Configure checks to detect application failures

For specific configuration examples, refer to the documentation for your chosen reverse proxy.

## Cloud Deployment

### AWS Deployment

For deployment on AWS, you can use several approaches:

1. **EC2 Instances**:
   - Launch EC2 instances (t3.medium or higher recommended)
   - Set up the application using either Docker or manual deployment methods
   - Use Amazon RDS for PostgreSQL
   - Use Amazon ElastiCache for Redis
   - Configure Application Load Balancer for high availability

2. **ECS/Fargate**:
   - Create a task definition using the Dockerfile
   - Set up an ECS cluster with Fargate
   - Configure Auto Scaling
   - Use RDS for PostgreSQL
   - Use ElastiCache for Redis

3. **EKS (Kubernetes)**:
   - Use Kubernetes manifests or Helm charts
   - Deploy to Amazon EKS
   - Use RDS for PostgreSQL
   - Use ElastiCache for Redis

Detailed AWS deployment instructions can be found in [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md).

### Azure Deployment

For deployment on Microsoft Azure:

1. **Virtual Machines**:
   - Deploy to Azure VMs
   - Follow Docker or manual deployment procedures

2. **App Service**:
   - Deploy as a containerized application
   - Use Azure Database for PostgreSQL
   - Use Azure Cache for Redis

3. **Azure Kubernetes Service (AKS)**:
   - Deploy using Kubernetes manifests
   - Use managed PostgreSQL and Redis services

Detailed Azure deployment instructions can be found in [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md).

For comprehensive Kubernetes deployment instructions for any cloud provider, refer to the [Kubernetes Deployment Guide](docs/kubernetes-deployment.md).

### Google Cloud Deployment

For deployment on Google Cloud Platform:

1. **Compute Engine**:
   - Deploy to Compute Engine VMs
   - Follow Docker or manual deployment procedures

2. **Google Kubernetes Engine (GKE)**:
   - Deploy using Kubernetes manifests
   - Use Cloud SQL for PostgreSQL
   - Use Memorystore for Redis

3. **Cloud Run**:
   - Deploy as a containerized application
   - Use Cloud SQL for PostgreSQL
   - Use Memorystore for Redis

Detailed GCP deployment instructions can be found in [GCP_DEPLOYMENT.md](GCP_DEPLOYMENT.md).

For comprehensive Kubernetes deployment instructions for any cloud provider, refer to the [Kubernetes Deployment Guide](docs/kubernetes-deployment.md).

## Production Best Practices

### Security Considerations

1. **Secrets Management**:
   - Never store secrets in the codebase
   - Use environment variables or a secrets manager
   - Rotate credentials regularly

2. **Network Security**:
   - Use HTTPS everywhere
   - Implement proper firewall rules
   - Consider using a Web Application Firewall (WAF)

3. **Authentication and Authorization**:
   - Enforce strong password policies
   - Implement multi-factor authentication
   - Apply the principle of least privilege

4. **Regular Updates**:
   - Keep all dependencies up to date
   - Apply security patches promptly
   - Enable automatic updates where possible

### Performance Tuning

1. **Database Optimization**:
   - Index frequently queried fields
   - Monitor query performance
   - Optimize slow queries

2. **Caching Strategy**:
   - Configure appropriate TTL values
   - Cache frequently accessed data
   - Use Redis cache for session storage

3. **Application Performance**:
   - Use compression for HTTP responses
   - Implement efficient pagination
   - Optimize JavaScript bundle size

### Monitoring and Logging

1. **Application Monitoring**:
   - Use monitoring solutions like Prometheus + Grafana
   - Set up alerts for critical metrics
   - Monitor application health endpoints

2. **Logging**:
   - Implement structured logging
   - Use a central log management solution
   - Set up log rotation

3. **Error Tracking**:
   - Implement error tracking with services like Sentry
   - Set up alerts for critical errors
   - Regularly review error logs

### High Availability Setup

1. **Load Balancing**:
   - Deploy multiple application instances
   - Use a load balancer to distribute traffic
   - Implement health checks

2. **Database High Availability**:
   - Set up PostgreSQL replication
   - Implement automated failover
   - Regularly test failover procedures

3. **Backup and Recovery**:
   - Implement automated database backups
   - Test restore procedures regularly
   - Store backups in multiple locations