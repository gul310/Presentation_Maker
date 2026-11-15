import { Router, Response } from "express";
import { User } from "../models/User.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";

const router = Router();

// Theme update
router.put("/me/theme", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { app_theme_mode, app_color_theme, custom_primary_color } = req.body;
    const user = req.auth!.user!;

    if (app_theme_mode) user.app_theme_mode = app_theme_mode;
    if (app_color_theme) user.app_color_theme = app_color_theme;
    if (custom_primary_color !== undefined) user.custom_primary_color = custom_primary_color;

    await user.save();
    const userObj = user.toObject();
    delete (userObj as any).password_hash;
    res.json({ ...userObj, id: user._id.toString() });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update theme." });
  }
});

// Settings update
router.put("/me/settings", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, country, interface_language, presentation_language, app_theme_mode, app_color_theme, custom_primary_color } = req.body;
    const user = req.auth!.user!;

    if (name) user.name = name.trim();
    if (country) user.country = country;
    if (interface_language) user.interface_language = interface_language;
    if (presentation_language) user.presentation_language = presentation_language;
    if (app_theme_mode) user.app_theme_mode = app_theme_mode;
    if (app_color_theme) user.app_color_theme = app_color_theme;
    if (custom_primary_color !== undefined) user.custom_primary_color = custom_primary_color;

    await user.save();
    const userObj = user.toObject();
    delete (userObj as any).password_hash;
    res.json({ ...userObj, id: user._id.toString() });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update settings." });
  }
});

export default router;
