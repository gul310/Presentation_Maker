import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Presentation } from "../models/Presentation.js";
import { config } from "../config/config.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";

const router = Router();

const PLAN_CREDITS: Record<string, number> = {
  free: 10,
  student: 50,
  pro: 150,
  team: 500
};

// Register
router.post("/register", async (req, res): Promise<void> => {
  try {
    const name = req.body.name || req.body.full_name;
    const { email, password, role, country, interface_language, presentation_language } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ detail: "Name, email, and password are required." });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ detail: "An account with this email already exists." });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Strict role sanitization: Never permit public admin registration
    const allowedRoles = ["student", "teacher", "researcher", "professional"];
    const sanitizedRole = allowedRoles.includes(role) ? role : "student";

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      role: sanitizedRole,
      is_admin: false,
      country: country || "Global",
      interface_language: interface_language || "English",
      presentation_language: presentation_language || "English",
      subscription: {
        plan: "free",
        status: "active"
      },
      ai_credits: {
        total_granted: PLAN_CREDITS.free,
        used: 0,
        remaining: PLAN_CREDITS.free
      }
    });

    await user.save();

    // Claim any unowned guest presentations created during this session and disconnect from guest ID
    const guestSessionId = (req.headers["x-guest-session-id"] as string) || req.body?.guest_session_id;
    if (guestSessionId) {
      await Presentation.updateMany(
        { guest_session_id: guestSessionId, $or: [{ user_id: null }, { user_id: { $exists: false } }] },
        { $set: { user_id: user._id, guest_session_id: null } }
      );
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role, is_admin: user.is_admin === true },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    const userObj = user.toObject();
    delete (userObj as any).password_hash;

    res.status(201).json({
      token,
      access_token: token,
      token_type: "bearer",
      user: { ...userObj, id: user._id.toString() }
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    res.status(500).json({ detail: err.message || "Registration failed." });
  }
});

// Login
router.post("/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ detail: "Email and password are required." });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.is_active) {
      res.status(401).json({ detail: "Invalid email or password." });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ detail: "Invalid email or password." });
      return;
    }

    // Claim any unowned guest presentations created during this session and disconnect from guest ID
    const guestSessionId = (req.headers["x-guest-session-id"] as string) || req.body?.guest_session_id;
    if (guestSessionId) {
      await Presentation.updateMany(
        { guest_session_id: guestSessionId, $or: [{ user_id: null }, { user_id: { $exists: false } }] },
        { $set: { user_id: user._id, guest_session_id: null } }
      );
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role, is_admin: user.is_admin === true },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    const userObj = user.toObject();
    delete (userObj as any).password_hash;

    res.json({
      token,
      access_token: token,
      token_type: "bearer",
      user: { ...userObj, id: user._id.toString() }
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ detail: err.message || "Login failed." });
  }
});

// Current User Profile
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.auth!.user!;
  const userObj = user.toObject();
  delete (userObj as any).password_hash;
  res.json({ ...userObj, id: user._id.toString() });
});

// Upgrade Subscription Plan & Grant Credits
router.post("/upgrade-plan", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plan } = req.body;
    if (!["free", "student", "pro", "team"].includes(plan)) {
      res.status(400).json({ detail: "Invalid plan type. Available: free, student, pro, team." });
      return;
    }

    const user = req.auth!.user!;
    const grantedCredits = PLAN_CREDITS[plan] || 10;

    user.subscription.plan = plan;
    user.subscription.status = "active";
    user.subscription.renews_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    user.ai_credits.total_granted += grantedCredits;
    user.ai_credits.remaining += grantedCredits;

    await user.save();

    const userObj = user.toObject();
    delete (userObj as any).password_hash;

    res.json({
      message: `Successfully upgraded to ${plan.toUpperCase()} plan! Added ${grantedCredits} AI credits.`,
      user: { ...userObj, id: user._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Plan upgrade failed." });
  }
});

// Get AI Credits info
router.get("/credits", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.auth!.user!;
  res.json({
    plan: user.subscription.plan,
    total_granted: user.ai_credits.total_granted,
    used: user.ai_credits.used,
    remaining: user.ai_credits.remaining
  });
});

export default router;
