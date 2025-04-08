import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production';
  const sessionSecret = process.env.SESSION_SECRET || 'default_session_secret_key_change_in_production';

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
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

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Log this activity
      await storage.createActivityLog({
        action: 'Create',
        resource: user.username,
        resourceType: 'User',
        userId: null,
        username: 'System',
        status: 'Success',
        details: { id: user.id }
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't send password back
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Don't send password back
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.status(200).json(userWithoutPassword);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Don't send password back
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });

  // Middleware to verify API token
  const verifyApiToken = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'API token is required' });
    }
    
    try {
      // Check if token exists in storage
      const apiToken = await storage.getApiTokenByToken(token);
      
      if (!apiToken) {
        return res.status(401).json({ message: 'Invalid API token' });
      }
      
      // Check if token is expired
      if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) {
        return res.status(401).json({ message: 'API token has expired' });
      }
      
      // Update the last used timestamp
      await storage.updateApiToken(apiToken.id, { lastUsedAt: new Date() });
      
      // Get the user associated with this token
      const user = await storage.getUser(apiToken.userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User associated with token not found' });
      }
      
      // Set the user in the request
      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({ message: 'Error verifying API token' });
    }
  };

  return { verifyApiToken };
}
