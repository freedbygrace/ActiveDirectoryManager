import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { User as SelectUser, loginSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";
const SESSION_SECRET = process.env.SESSION_SECRET || "session-secret-change-in-production";

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === "production",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for username/password authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  // JWT strategy for API token authentication
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: JWT_SECRET,
      },
      async (payload, done) => {
        try {
          const user = await storage.getUser(payload.sub);
          if (!user) {
            return done(null, false, { message: "User not found" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint - fixed with better error handling
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt:", { ...req.body, password: "***" });
      
      // Validate inputs
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("Validation failed:", validationResult.error.errors);
        return res.status(400).json({ message: "Invalid input", errors: validationResult.error.errors });
      }

      const { username, password } = req.body;
      
      // Check for existing user
      try {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          console.log("Username already exists:", username);
          return res.status(400).json({ message: "Username already exists" });
        }
      } catch (error) {
        console.error("Error checking for existing user:", error);
        return res.status(500).json({ message: "Error checking for existing user" });
      }

      // Hash password
      let hashedPassword;
      try {
        hashedPassword = await hashPassword(password);
      } catch (error) {
        console.error("Error hashing password:", error);
        return res.status(500).json({ message: "Error processing password" });
      }
      
      // Get default role
      let roleId = req.body.roleId;
      if (!roleId) {
        try {
          const defaultRole = await storage.getDefaultRole();
          roleId = defaultRole?.id;
          console.log("Using default role ID:", roleId);
        } catch (error) {
          console.error("Error getting default role:", error);
          return res.status(500).json({ message: "Error getting default role" });
        }
      }
      
      // Create user
      let user;
      try {
        user = await storage.createUser({
          username,
          password: hashedPassword,
          email: req.body.email || null,
          fullName: req.body.fullName || null,
          roleId: roleId,
        });
        console.log("User created successfully:", { id: user.id, username });
      } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).json({ message: "Error creating user" });
      }

      // Remove password from response
      const userResponse = { ...user, password: undefined };

      // Manual login instead of using req.login
      try {
        req.user = user;
        // Use req.session to store user data
        if (req.session) {
          req.session.userId = user.id;
        }
        
        // Send success response
        console.log("Registration completed successfully");
        return res.status(201).json(userResponse);
      } catch (error) {
        console.error("Error during session setup:", error);
        // Still return the created user even if session setup fails
        return res.status(201).json({ 
          ...userResponse, 
          warning: "User created but session setup failed, please log in manually" 
        });
      }
    } catch (error) {
      console.error("Unexpected error during registration:", error);
      return res.status(500).json({ message: "Internal server error during registration" });
    }
  });

  // Login endpoint - fixed without relying on req.isAuthenticated
  app.post("/api/login", (req, res, next) => {
    try {
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          console.error("Authentication error:", err);
          return res.status(500).json({ message: "Internal server error during authentication" });
        }
        
        if (!user) {
          return res.status(401).json({ message: info?.message || "Authentication failed" });
        }
        
        // Manual login with try-catch to safely handle errors
        try {
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("Login error:", loginErr);
              return res.status(500).json({ message: "Error during login process" });
            }
            
            // Remove password from response
            const userResponse = { ...user, password: undefined };
            return res.json(userResponse);
          });
        } catch (loginError) {
          console.error("Exception during login:", loginError);
          return res.status(500).json({ message: "Login process failed" });
        }
      })(req, res, next);
    } catch (error) {
      console.error("Unexpected error in login route:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) return next(sessionErr);
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user endpoint - fixed without relying on req.isAuthenticated
  app.get("/api/user", (req, res) => {
    try {
      // Check if user exists in session instead of using isAuthenticated
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Remove password from response
      const userResponse = { ...req.user, password: undefined };
      res.json(userResponse);
    } catch (error) {
      console.error("Error in user endpoint:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate API token endpoint - fixed without relying on req.isAuthenticated
  app.post("/api/tokens", (req, res, next) => {
    try {
      // Check if user exists in session
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { name, expiresAt, roleId, customPermissions } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Token name is required" });
      }

      // Create JWT token with user ID and optional permissions
      const token = jwt.sign(
        { 
          sub: req.user.id,
          customPermissions 
        },
        JWT_SECRET,
        { 
          expiresIn: expiresAt ? Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000) : '365d' 
        }
      );

      // Store the token in the database
      const apiToken = storage.createApiToken({
        name,
        token,
        userId: req.user.id,
        roleId: roleId || null,
        customPermissions: customPermissions || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      res.status(201).json(apiToken);
    } catch (error) {
      console.error("Error generating API token:", error);
      res.status(500).json({ message: "Failed to generate API token" });
    }
  });

  // Middleware to check API token authentication
  const authenticateApiToken = passport.authenticate("jwt", { session: false });

  return { authenticateApiToken };
}
