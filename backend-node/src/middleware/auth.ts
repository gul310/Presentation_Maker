import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
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
      const decoded = jwt.verify(token, config.jwtSecret) as { sub: string; email?: string; role?: string; is_admin?: boolean };
      if (decoded && decoded.sub) {
        const user = await User.findById(decoded.sub);
        if (user && user.is_active) {
          req.auth.user = user;
          req.auth.userId = user._id.toString();
          req.auth.isGuest = false;
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
  const isAdmin = user.role === "admin" || user.is_admin === true;
  if (!isAdmin) {
    res.status(403).json({ detail: "Administrator access required. Access denied." });
    return;
  }
  next();
};
