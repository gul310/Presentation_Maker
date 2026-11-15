import { Router, Response } from "express";
import { Types } from "mongoose";
import { User } from "../models/User.js";
import { SubscriptionPayment } from "../models/SubscriptionPayment.js";
import { PlatformSettings } from "../models/PlatformSettings.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";

const router = Router();

export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free Tier",
    price_usd: 0,
    price_pkr: 0,
    period: "forever",
    credits: 10,
    features: [
      "10 AI presentation generations",
      "Document to slide conversion",
      "Full speaker notes & export",
      "Practice rehearsal evaluation",
      "Public presentation sharing"
    ]
  },
  student: {
    id: "student",
    name: "Student Plan",
    price_usd: 4.99,
    price_pkr: 1400,
    period: "/month",
    credits: 50,
    features: [
      "50 AI generations per month",
      "Full Teach Me educational tutor",
      "Urdu & multilingual support",
      "PowerPoint & PDF vector export",
      "Practice speech metrics & WPM"
    ]
  },
  pro: {
    id: "pro",
    name: "Pro Creator",
    price_usd: 9.99,
    price_pkr: 2800,
    period: "/month",
    credits: 200,
    features: [
      "200 AI generations per month",
      "Marketplace publishing & selling",
      "Priority AI Presentation Engine",
      "Freemium Templates unlocked",
      "Standalone HTML & ZIP Packages"
    ]
  },
  team: {
    id: "team",
    name: "Enterprise & Team",
    price_usd: 19.99,
    price_pkr: 5500,
    period: "/month",
    credits: 500,
    features: [
      "500 AI generations per month",
      "Unlimited premium template access",
      "Multi-seat workspace & collaboration",
      "Custom branding & typography themes",
      "Dedicated priority customer support"
    ]
  }
};

// 1. GET /api/subscriptions/plans: View available subscription plans & NayaPay details
router.get("/plans", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }

    res.json({
      plans: Object.values(SUBSCRIPTION_PLANS),
      payment_details: {
        payment_provider: settings.payment_provider || "NayaPay",
        account_title: settings.account_title || "Syeda Gul Andam Malik Kazmi",
        platform_payment_number: settings.platform_payment_number || "03339114569",
        bank_details: settings.bank_details,
        instructions: settings.payment_instructions
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch subscription plans." });
  }
});

// 2. POST /api/subscriptions/purchase-request: Initiate paid plan purchase
router.post("/purchase-request", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { plan } = req.body;
    const user = req.auth!.user!;

    if (!plan || !["student", "pro", "team"].includes(plan)) {
      res.status(400).json({ detail: "Invalid paid plan. Choose from student, pro, team." });
      return;
    }

    const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];

    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }

    const transaction_ref = `NP-SUB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = new SubscriptionPayment({
      user_id: user._id,
      plan,
      payment_type: "initial",
      gross_amount: planConfig.price_usd,
      amount_pkr: planConfig.price_pkr,
      net_amount: planConfig.price_usd,
      currency: "PKR",
      payment_status: "PENDING_PAYMENT",
      gateway_provider: settings.payment_provider || "NayaPay",
      payment_method: "NayaPay",
      transaction_ref
    });

    await payment.save();

    res.json({
      payment_id: payment._id.toString(),
      plan: planConfig.name,
      plan_key: plan,
      amount_pkr: planConfig.price_pkr,
      amount_usd: planConfig.price_usd,
      transaction_ref,
      payment_instructions: {
        provider: settings.payment_provider || "NayaPay",
        account_title: settings.account_title || "Syeda Gul Andam Malik Kazmi",
        platform_payment_number: settings.platform_payment_number || "03339114569",
        bank_details: settings.bank_details,
        note: `Transfer PKR ${planConfig.price_pkr} to NayaPay account 03339114569 (Title: Syeda Gul Andam Malik Kazmi). In reference/note enter '${transaction_ref}', then submit your receipt screenshot.`
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to create subscription purchase request." });
  }
});

// 3. POST /api/subscriptions/submit-payment: User submits transaction reference and receipt proof
router.post("/submit-payment", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { payment_id, plan, transaction_ref, receipt_url, payer_name, payer_account } = req.body;
    const user = req.auth!.user!;

    if (!transaction_ref || !transaction_ref.trim()) {
      res.status(400).json({ detail: "Transaction Reference (Trx ID) is required." });
      return;
    }

    let payment: any = null;
    if (payment_id && Types.ObjectId.isValid(payment_id)) {
      payment = await SubscriptionPayment.findOne({ _id: payment_id, user_id: user._id });
    }

    if (!payment && transaction_ref) {
      payment = await SubscriptionPayment.findOne({ transaction_ref, user_id: user._id });
    }

    if (!payment) {
      if (!plan || !["student", "pro", "team"].includes(plan)) {
        res.status(400).json({ detail: "Valid plan is required when initiating new payment." });
        return;
      }

      const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];
      payment = new SubscriptionPayment({
        user_id: user._id,
        plan,
        payment_type: "initial",
        gross_amount: planConfig.price_usd,
        amount_pkr: planConfig.price_pkr,
        net_amount: planConfig.price_usd,
        currency: "PKR",
        payment_status: "PENDING_PAYMENT",
        gateway_provider: "NayaPay",
        payment_method: "NayaPay",
        transaction_ref
      });
    }

    payment.transaction_ref = transaction_ref.trim();
    payment.receipt_url = receipt_url || null;
    payment.payer_name = payer_name || user.name;
    payment.payer_account = payer_account || null;
    payment.payment_status = "PAYMENT_SUBMITTED";

    await payment.save();

    res.json({
      message: "Subscription payment proof submitted successfully. Your plan will activate once verified by Super Admin.",
      payment: {
        ...payment.toObject(),
        id: payment._id.toString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to submit subscription payment." });
  }
});

// 4. POST /api/subscriptions/upgrade-free: Free tier instant activation
router.post("/upgrade-free", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.auth!.user!;
    user.subscription.plan = "free";
    user.subscription.status = "free";
    await user.save();

    res.json({
      message: "Free plan activated successfully.",
      user: {
        ...user.toObject(),
        id: user._id.toString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to activate free plan." });
  }
});

// 5. GET /api/subscriptions/my-payments: User's subscription payment records
router.get("/my-payments", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.auth!.userId!;
    const userObjId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const filter = userObjId ? { $or: [{ user_id: userObjId }, { user_id: userId }] } : { user_id: userId };
    const payments = await SubscriptionPayment.find(filter)
      .sort({ created_at: -1 })
      .lean();

    res.json({
      payments: payments.map(p => ({
        ...p,
        id: p._id.toString()
      }))
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch subscription payments." });
  }
});

export default router;

