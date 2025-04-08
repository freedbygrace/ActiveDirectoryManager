import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import debugLib from "debug";

// Initialize debug channels
const debugHttp = debugLib('api:http');
const debugError = debugLib('api:error');

const app = express();

// Apply compression middleware
app.use(compression());

// Apply JSON and URL encoding middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// HTTP request logging (in development mode)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev', {
    stream: {
      write: (message: string) => {
        debugHttp(message.trim());
      }
    }
  }));
}

// Response capture and detailed logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Add response size info
      const contentLength = res.getHeader('content-length');
      if (contentLength) {
        logLine += ` - ${contentLength} bytes`;
      }
      
      // Add cache info if available
      const cacheHeader = res.getHeader('x-cache');
      if (cacheHeader) {
        logLine += ` [Cache: ${cacheHeader}]`;
      }
      
      // Log response body for debugging in non-production
      if (process.env.NODE_ENV !== 'production' && capturedJsonResponse) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        if (responseStr.length > 200) {
          debugHttp(`Response (truncated): ${responseStr.slice(0, 200)}...`);
        } else {
          debugHttp(`Response: ${responseStr}`);
        }
      }

      // Short log for console
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Enhanced error handling middleware with detailed logging
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log detailed error information
    debugError(`Error: ${err.message}`);
    debugError(`Status: ${status}`);
    debugError(`Path: ${req.method} ${req.path}`);
    
    // Include stack trace for non-production environments
    if (process.env.NODE_ENV !== 'production') {
      debugError(`Stack: ${err.stack}`);
      
      // Log additional request information for debugging
      if (Object.keys(req.query).length > 0) {
        debugError(`Query params: ${JSON.stringify(req.query)}`);
      }
      
      if (Object.keys(req.body).length > 0) {
        debugError(`Request body: ${JSON.stringify(req.body)}`);
      }
    }
    
    // Create error response object
    const errorResponse = { 
      message,
      timestamp: new Date().toISOString()
    };
    
    // Add errors array if validation errors exist
    if (err.errors && Array.isArray(err.errors)) {
      Object.assign(errorResponse, { errors: err.errors });
    }
    
    // Send error response
    res.status(status).json(errorResponse);
    
    // Don't throw in error handler - it will crash the server
    // Instead, let Express handle the error from here
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    const env = app.get("env");
    log(`Active Directory Management API server started`);
    log(`Environment: ${env}`);
    log(`Server is running on http://0.0.0.0:${port}`);
    log(`API documentation: http://0.0.0.0:${port}/api/docs`);
    log(`API documentation download: http://0.0.0.0:${port}/api/docs/download`);
    log(`Advanced API usage guide: http://0.0.0.0:${port}/api/docs/more-info`);
    
    // Enable debug logs in development
    if (env === "development") {
      log(`Debug logs enabled: api:http, api:error, api:cache, api:swagger`);
      log(`To view debug logs, set DEBUG environment variable:`);
      log(`DEBUG=api:* npm run dev`);
    }
  });
})();
