FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV BASE_URL=http://localhost:5000

# Authentication environment variables
ENV JWT_SECRET=change-this-in-production
ENV SESSION_SECRET=change-this-in-production
ENV DEFAULT_ADMIN_USERNAME=admin
ENV DEFAULT_ADMIN_PASSWORD=password
ENV DEFAULT_ADMIN_EMAIL=
ENV DEFAULT_ADMIN_FULLNAME="System Administrator"
ENV DISABLE_REGISTRATION=false

# Database configuration
ENV DATABASE_URL=postgres://postgres:postgres@postgres:5432/admgr

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy migration files
COPY --from=builder /app/migrations ./migrations

# Create a non-root user and set ownership
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 5000

# Start the application
CMD ["node", "dist/server/index.js"]