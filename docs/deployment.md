# Deployment Guide

This guide provides instructions for deploying the Active Directory Management application using Docker, Docker Compose, and Kubernetes.

## Table of Contents

- [Docker Deployment](#docker-deployment)
  - [Building the Docker Image](#building-the-docker-image)
  - [Running with Docker](#running-with-docker)
  - [Environment Variables](#environment-variables)
- [Docker Compose Deployment](#docker-compose-deployment)
  - [Configuration](#configuration)
  - [Starting the Services](#starting-the-services)
  - [Stopping the Services](#stopping-the-services)
- [Kubernetes Deployment](#kubernetes-deployment)
  - [Prerequisites](#prerequisites)
  - [Configuration](#kubernetes-configuration)
  - [Deployment](#deployment)
  - [Accessing the Application](#accessing-the-application)
  - [Scaling](#scaling)
  - [Updating](#updating)
  - [Monitoring](#monitoring)
- [Production Considerations](#production-considerations)
  - [Security](#security)
  - [Backups](#backups)
  - [High Availability](#high-availability)

## Docker Deployment

### Building the Docker Image

To build the Docker image using the provided build scripts:

#### Linux/macOS:
```bash
# Navigate to the iac/docker directory
cd iac/docker

# Make the script executable
chmod +x build.sh

# Build the image with default settings
./build.sh

# Build with custom tag
./build.sh --tag v1.0.0

# Build and push to a registry
./build.sh --registry your-registry.com --tag v1.0.0 --push
```

#### Windows:
```powershell
# Navigate to the iac/docker directory
cd iac\docker

# Build the image with default settings
.\build.ps1

# Build with custom tag
.\build.ps1 -tag v1.0.0

# Build and push to a registry
.\build.ps1 -registry your-registry.com -tag v1.0.0 -push
```

#### Manually:
```bash
# Navigate to the project root
cd /path/to/project

# Build the image
docker build -t ad-management:latest -f iac/docker/Dockerfile .
```

### Running with Docker

To run the application with Docker:

```bash
docker run -d --name ad-management \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e POSTGRES_HOST=your-postgres-host \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_DB=admgr \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your-password \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET=your-jwt-secret \
  -e SESSION_SECRET=your-session-secret \
  ad-management:latest
```

### Environment Variables

The application uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Port to run the server on | `5000` |
| `BASE_URL` | Base URL for the application | `http://localhost:5000` |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_DB` | PostgreSQL database name | `admgr` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | - |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | Secret for JWT tokens | - |
| `SESSION_SECRET` | Secret for session cookies | - |
| `DEFAULT_ADMIN_USERNAME` | Default admin username | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Default admin password | - |
| `DEFAULT_ADMIN_EMAIL` | Default admin email | - |
| `DEFAULT_ADMIN_FULLNAME` | Default admin full name | `System Administrator` |
| `DISABLE_REGISTRATION` | Disable user registration | `false` |

## Docker Compose Deployment

### Configuration

The application includes a `docker-compose.yml` file for easy deployment. You can customize the environment variables by creating or modifying the `.env` file in the `iac/docker` directory.

Example `.env` file:

```
NODE_ENV=production
PORT=5000
BASE_URL=http://localhost:5000
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=admgr
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-postgres-password
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=your-admin-password
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_FULLNAME=System Administrator
DISABLE_REGISTRATION=false
```

### Starting the Services

To start all services:

```bash
# Navigate to the iac/docker directory
cd iac/docker

# Start the application stack
docker-compose up -d
```

This will start the application, PostgreSQL, and Redis containers.

### Stopping the Services

To stop all services:

```bash
# Navigate to the iac/docker directory
cd iac/docker

# Stop the application stack
docker-compose down
```

To stop and remove all data volumes:

```bash
# Navigate to the iac/docker directory
cd iac/docker

# Stop the application stack and remove volumes
docker-compose down -v
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured to communicate with your cluster
- [Kustomize](https://kustomize.io/) (v4.0+) or kubectl v1.14+ which includes kustomize
- Optional: Ingress controller (e.g., NGINX Ingress Controller)
- Optional: cert-manager for TLS certificates

### Kubernetes Configuration

The Kubernetes manifests are located in the `iac/kubernetes/` directory. Before deploying, you should customize the following files:

1. `iac/kubernetes/configmap.yaml`: Update environment variables
2. `iac/kubernetes/secrets.yaml`: Update secrets (use base64-encoded values)
3. `iac/kubernetes/deployment.yaml`: Update resource limits if needed
4. `iac/kubernetes/ingress.yaml`: Update host name and TLS configuration

### Deployment

To deploy the application to Kubernetes:

```bash
# Navigate to the iac/kubernetes directory
cd iac/kubernetes

# Apply all resources
kubectl apply -k .

# Or from anywhere in the project
kubectl apply -k iac/kubernetes
```

This will create:
- A namespace called `ad-management`
- ConfigMap and Secret for environment variables
- PostgreSQL StatefulSet with persistent storage
- Redis StatefulSet with persistent storage
- Application Deployment with 2 replicas
- Services for all components
- Ingress for external access

### Accessing the Application

If you've configured the Ingress, the application will be available at the hostname specified in `kubernetes/ingress.yaml`.

Without Ingress, you can use port-forwarding to access the application:

```bash
kubectl port-forward -n ad-management svc/ad-management 5000:80
```

Then access the application at http://localhost:5000.

### Scaling

To scale the application:

```bash
kubectl scale -n ad-management deployment/ad-management --replicas=3
```

### Updating

To update the application to a new version:

1. Build and push the new Docker image
2. Update the image tag in `kubernetes/deployment.yaml`
3. Apply the changes:

```bash
kubectl apply -k kubernetes/
```

Or use kubectl set image:

```bash
kubectl set image -n ad-management deployment/ad-management ad-management=ad-management:new-tag
```

### Monitoring

You can monitor the application using:

```bash
# Check pod status
kubectl get pods -n ad-management

# View logs
kubectl logs -n ad-management deployment/ad-management

# Describe deployment
kubectl describe deployment -n ad-management ad-management
```

## Production Considerations

### Security

For production deployments:

1. Use strong, unique passwords for all secrets
2. Enable TLS for all connections
3. Use network policies to restrict traffic between components
4. Set up proper RBAC for Kubernetes resources
5. Regularly update all components and dependencies
6. Consider using a secrets management solution like HashiCorp Vault

### Backups

Set up regular backups for:

1. PostgreSQL database
2. Redis data (if persistence is enabled)
3. Application configuration

Example PostgreSQL backup:

```bash
kubectl exec -n ad-management postgres-0 -- pg_dump -U postgres admgr > backup.sql
```

### High Availability

For high availability:

1. Run multiple replicas of the application
2. Use a PostgreSQL cluster with replication
3. Configure Redis with replication or cluster mode
4. Deploy across multiple availability zones
5. Use a load balancer or ingress controller with multiple backends
6. Implement proper health checks and readiness probes
