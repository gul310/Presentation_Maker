import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { config } from "../config/config.js";
import { User, IUser } from "../models/User.js";

export interface AuthContext {
  user?: IUser | null;
  userId?: string | null;
  guestSessionId?: string | null;
  isGuest: boolean;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const guestHeader = (req.headers["x-guest-session-id"] as string) || (req.query.guest_session_id as string);

  req.auth = {
    user: null,
    userId: null,
    guestSessionId: guestHeader || null,
    isGuest: true
  };

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        sub: string;
        email?: string;
        role?: string;
        is_admin?: boolean;
      };

      if (decoded && decoded.sub) {
        let user: IUser | null = null;
        if (Types.ObjectId.isValid(decoded.sub)) {
          user = await User.findById(decoded.sub);
        }
        if (!user && decoded.email) {
          user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
        }

        // Strict account isolation: Verify that user is active and matches token claims
        if (user && user.is_active) {
          if (decoded.email && user.email.toLowerCase().trim() !== decoded.email.toLowerCase().trim()) {
            // Identity mismatch detected — reject session to avoid account bleed
            req.auth.user = null;
            req.auth.userId = null;
            req.auth.isGuest = true;
          } else {
            req.auth.user = user;
            req.auth.userId = user._id.toString();
            req.auth.isGuest = false;
          }
        }
      }
    } catch (err) {
      // Invalid or expired token - leave req.auth as unauthenticated guest
      req.auth.user = null;
      req.auth.userId = null;
      req.auth.isGuest = true;
    }
  }

  next();
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.auth?.user || !req.auth?.userId) {
    res.status(401).json({ detail: "Authentication required for this action." });
    return;
  }
  next();
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.auth?.user || !req.auth?.userId) {
    res.status(401).json({ detail: "Authentication required." });
    return;
  }
  const user = req.auth.user as any;
  const roleStr = String(user.role || "").toLowerCase().trim();
  const isRoleAdmin = roleStr === "admin";
  const isFlagAdmin = Boolean(user.is_admin);
  const isAdmin = isRoleAdmin || isFlagAdmin;
  if (!isAdmin) {
    res.status(403).json({ detail: "Administrator access required. Access denied." });
    return;
  }
  next();
};
