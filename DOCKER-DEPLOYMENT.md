# Docker Deployment Instructions

This document describes how to deploy the Active Directory Management API using Docker.

## Dockerfile

Below is the updated Dockerfile that includes support for all the enhanced features:

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the application (optimized for production)
RUN npm run build

# Production stage
FROM node:20-slim AS runner

# Install necessary system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy build artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# Copy schema files for Drizzle
COPY ./shared/schema.ts ./shared/
COPY ./drizzle.config.ts ./

# Create a directory for logs
RUN mkdir -p /app/logs

# Set default environment variables (these should be overridden at runtime)
ENV DATABASE_URL=postgres://postgres:postgres@postgres:5432/postgres
ENV REDIS_URL=redis://redis:6379
ENV SESSION_SECRET=changeme

# Set rate limiting configuration
ENV RATE_LIMIT_WINDOW_MS=900000
ENV RATE_LIMIT_MAX_REQUESTS=100

# Set compression level (1-9, where 9 is maximum compression)
ENV COMPRESSION_LEVEL=6

# Set logging level (debug, info, warn, error)
ENV LOG_LEVEL=info

# Expose the port the app runs on
EXPOSE 5000

# Health check to ensure the application is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
```

## Docker Compose

For deploying the full stack with PostgreSQL and Redis, create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/postgres
      - REDIS_URL=redis://redis:6379
      - SESSION_SECRET=your_secure_session_secret
      - RATE_LIMIT_WINDOW_MS=900000
      - RATE_LIMIT_MAX_REQUESTS=100
      - COMPRESSION_LEVEL=6
      - LOG_LEVEL=info
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - app-network

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:7
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
```

## Environment Variables

The application supports the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@postgres:5432/postgres` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `SESSION_SECRET` | Secret for session encryption | `changeme` (replace in production!) |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window in milliseconds | `900000` (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum requests per window | `100` |
| `COMPRESSION_LEVEL` | Response compression level (1-9) | `6` |
| `LOG_LEVEL` | Logging level | `info` |

## Deployment Instructions

1. Create the Dockerfile and docker-compose.yml as specified above
2. Build and start the containers:
   ```
   docker-compose up -d
   ```
3. Run database migrations:
   ```
   docker-compose exec app npm run db:push
   ```
4. Access the application at http://localhost:5000
5. API documentation is available at http://localhost:5000/api/docs

## Health Checks

The application includes a health check endpoint at `/api/health` that returns HTTP 200 when the application is running normally. The Docker container is configured to use this endpoint for health checks.

## Scaling Considerations

- The application can be horizontally scaled by adding more instances of the app service
- For high-availability, consider using a managed PostgreSQL service instead of the containerized version
- For production, use a proper Redis cluster or managed Redis service
- Consider using a reverse proxy like Nginx or a load balancer in front of multiple app instances

## Security Notes

- Always replace the default `SESSION_SECRET` with a secure random string
- Use appropriate firewall rules to restrict access to PostgreSQL and Redis
- Consider setting up SSL/TLS for production deployments
- Adjust rate limiting parameters based on your expected traffic

## Troubleshooting

- If the application fails to start, check the logs:
  ```
  docker-compose logs app
  ```
- For database connection issues:
  ```
  docker-compose logs postgres
  ```
- For Redis connection issues:
  ```
  docker-compose logs redis
  ```