import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import LdapStrategy from "passport-ldapauth";
import { Strategy as OpenIDStrategy } from "passport-openidconnect";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { ldapClient } from "./ldap";
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
  
  // LDAP authentication strategy
  if (process.env.LDAP_ENABLED === "true") {
    passport.use(
      new LdapStrategy(
        {
          server: {
            url: process.env.LDAP_URL || "ldap://localhost:389",
            bindDN: process.env.LDAP_BIND_DN || "",
            bindCredentials: process.env.LDAP_BIND_PASSWORD || "",
            searchBase: process.env.LDAP_SEARCH_BASE || "",
            searchFilter: process.env.LDAP_SEARCH_FILTER || "(uid={{username}})",
            searchAttributes: ["dn", "cn", "uid", "mail", "memberOf"],
            tlsOptions: {
              rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED === "true",
            },
          },
          usernameField: "username",
          passwordField: "password",
        },
        async (user, done) => {
          try {
            // Find user in our database or create one if it doesn't exist
            let existingUser = await storage.getUserByUsername(user.uid);
            
            if (!existingUser) {
              // Create a new user in our local database
              const defaultRole = await storage.getDefaultRole();
              
              existingUser = await storage.createUser({
                username: user.uid,
                // Create a random password that won't be used (LDAP auth will be used instead)
                password: await hashPassword(randomBytes(32).toString("hex")),
                email: user.mail || null,
                fullName: user.cn || null,
                roleId: defaultRole?.id || null,
                authProvider: "ldap",
                providerUserId: user.dn,
              });
            }
            
            return done(null, existingUser);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }
  
  // OpenID Connect authentication strategy
  if (process.env.OIDC_ENABLED === "true") {
    passport.use(
      new OpenIDConnectStrategy(
        {
          issuer: process.env.OIDC_ISSUER,
          authorizationURL: process.env.OIDC_AUTHORIZATION_URL,
          tokenURL: process.env.OIDC_TOKEN_URL,
          userInfoURL: process.env.OIDC_USERINFO_URL,
          clientID: process.env.OIDC_CLIENT_ID || "",
          clientSecret: process.env.OIDC_CLIENT_SECRET || "",
          callbackURL: process.env.OIDC_CALLBACK_URL || "http://localhost:3000/api/auth/oidc/callback",
          scope: ["openid", "profile", "email"],
        },
        async (issuer, profile, done) => {
          try {
            const { id, displayName, emails } = profile;
            
            // Find user in our database or create one if it doesn't exist
            let existingUser = await storage.getUserByProviderUserId("oidc", id);
            
            if (!existingUser) {
              // Create a new user in our local database
              const defaultRole = await storage.getDefaultRole();
              const email = emails && emails.length > 0 ? emails[0].value : null;
              
              existingUser = await storage.createUser({
                username: profile.username || `user_${id.substring(0, 8)}`,
                // Create a random password that won't be used (OIDC auth will be used instead)
                password: await hashPassword(randomBytes(32).toString("hex")),
                email,
                fullName: displayName || null,
                roleId: defaultRole?.id || null,
                authProvider: "oidc",
                providerUserId: id,
              });
            }
            
            return done(null, existingUser);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid input", errors: validationResult.error.errors });
      }

      const { username, password } = req.body;
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      // Get the default role if role ID isn't specified
      let roleId = req.body.roleId;
      if (!roleId) {
        const defaultRole = await storage.getDefaultRole();
        roleId = defaultRole?.id;
      }
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: req.body.email,
        fullName: req.body.fullName,
        roleId: roleId,
      });

      // Remove password from response
      const userResponse = { ...user, password: undefined };

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      next(error);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        // Remove password from response
        const userResponse = { ...user, password: undefined };
        res.json(userResponse);
      });
    })(req, res, next);
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

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Remove password from response
    const userResponse = { ...req.user, password: undefined };
    res.json(userResponse);
  });

  // Generate API token endpoint
  app.post("/api/tokens", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
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
      next(error);
    }
  });

  // Middleware to check API token authentication
  const authenticateApiToken = passport.authenticate("jwt", { session: false });

  return { authenticateApiToken };
}
