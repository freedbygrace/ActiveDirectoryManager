FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim AS runner

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

# Set the database URL environment variable (this will be overridden at runtime)
ENV DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres

# Set session secret (should be overridden at runtime)
ENV SESSION_SECRET=changeme

# Expose the port the app runs on
EXPOSE 5000

# Start the application
CMD ["node", "dist/index.js"]