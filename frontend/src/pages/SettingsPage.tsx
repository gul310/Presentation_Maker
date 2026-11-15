
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme, COLOR_PRESETS } from "../context/ThemeContext";
import type { AppColorTheme, PlanTier } from "../types/auth";
import { apiFetch } from "../services/api";
import { communityApi } from "../services/communityApi";
import {
  Settings,
  User as UserIcon,
  Palette,
  Languages,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  Zap,
  Check,
  Sparkles,
  CreditCard
} from "lucide-react";

interface SettingsPageProps {
  onNavigate: (path: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { user, updateUserLocal } = useAuth();
  const { mode, colorPreset, setThemeMode, setColorPreset } = useTheme();

  const [activeTab, setActiveTab] = useState<"appearance" | "subscription" | "profile" | "language">("subscription");

  // Form states for profile & language updates
  const [name, setName] = useState<string>(user?.name || "");
  const [country, setCountry] = useState<string>(user?.country || "Global");
  const [interfaceLang, setInterfaceLang] = useState<string>(user?.interface_language || "English");
  const [presentationLang, setPresentationLang] = useState<string>(user?.presentation_language || "English");

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  // Manual NayaPay Subscription States (Part 10)
  const [selectedPaidPlan, setSelectedPaidPlan] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [trxRef, setTrxRef] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [payerName, setPayerName] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);
  const [myPayments, setMyPayments] = useState<any[]>([]);

  const fetchMyPayments = async () => {
    try {
      const res = await communityApi.getMySubscriptionPayments();
      setMyPayments(res.payments || []);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setCountry(user.country || "Global");
      setInterfaceLang(user.interface_language || "English");
      setPresentationLang(user.presentation_language || "English");
      fetchMyPayments();
    } else {
      setMyPayments([]);
    }
  }, [user?.id, user?.email]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(null);
    try {
      const updatedUser = await apiFetch<any>("/users/me/settings", {
        method: "PUT",
        body: JSON.stringify({
          name,
          country,
          interface_language: interfaceLang,
          presentation_language: presentationLang,
        }),
      });
      updateUserLocal(updatedUser);
      setSaveSuccess("Settings successfully saved to database!");
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async (plan: PlanTier) => {
    if (plan === "free") {
      try {
        setUpgradingPlan("free");
        setSaveSuccess(null);
        const res = await communityApi.upgradeFreePlan();
        updateUserLocal(res.user);
        setSaveSuccess("Free Tier activated successfully!");
      } catch (err: any) {
        alert(err.message || "Failed to activate Free Tier.");
      } finally {
        setUpgradingPlan(null);
      }
      return;
    }

    try {
      setUpgradingPlan(plan);
      setSaveSuccess(null);
      const res = await communityApi.requestSubscriptionPurchase(plan);
      setSelectedPaidPlan({
        plan,
        name: res.plan,
        amount_pkr: res.amount_pkr,
        amount_usd: res.amount_usd,
        payment_id: res.payment_id,
        transaction_ref: res.transaction_ref,
        instructions: res.payment_instructions
      });
      setTrxRef(res.transaction_ref);
      setPayerName(user?.name || "");
      setShowPaymentModal(true);
    } catch (err: any) {
      alert(err.message || "Failed to initiate subscription purchase.");
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleSubmitSubscriptionPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaidPlan) return;
    try {
      setSubmittingPayment(true);
      const res = await communityApi.submitSubscriptionPayment({
        payment_id: selectedPaidPlan.payment_id,
        plan: selectedPaidPlan.plan,
        transaction_ref: trxRef,
        receipt_url: receiptUrl,
        payer_name: payerName
      });
      setShowPaymentModal(false);
      setSaveSuccess(res.message || "Payment proof submitted for Super Admin approval!");
      fetchMyPayments();
    } catch (err: any) {
      alert(err.message || "Failed to submit subscription payment proof.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const currentPlan = user?.subscription?.plan || "free";
  const remainingCredits = user?.ai_credits?.remaining ?? 10;
  const totalCredits = user?.ai_credits?.total_granted ?? 10;
  const usedCredits = user?.ai_credits?.used ?? 0;

  const PLANS = [
    {
      id: "free" as PlanTier,
      name: "Free Tier",
      price: "$0",
      period: "forever",
      credits: "10 AI Credits",
      description: "Essential presentation creation for trial and personal practice.",
      features: [
        "10 AI presentation generations",
        "Document to slide conversion",
        "Full speaker notes & export",
        "Practice rehearsal evaluation",
        "Public presentation sharing"
      ]
    },
    {
      id: "student" as PlanTier,
      name: "Student Plan",
      price: "$4.99",
      period: "/month",
      credits: "+50 AI Credits / mo",
      popular: true,
      description: "Perfect for students, researchers, and academic assignments.",
      features: [
        "50 AI generations per month",
        "Full Teach Me educational tutor",
        "Urdu & multilingual support",
        "PowerPoint & PDF vector export",
        "Practice speech metrics & WPM"
      ]
    },
    {
      id: "pro" as PlanTier,
      name: "Pro Creator",
      price: "$9.99",
      period: "/month",
      credits: "+150 AI Credits / mo",
      description: "For teachers, educators, consultants, and power presenters.",
      features: [
        "150 AI generations per month",
        "Marketplace publishing & selling",
        "Priority AI Presentation Engine",
        "Standalone HTML & ZIP Packages",
        "Community rating badges"
      ]
    },
    {
      id: "team" as PlanTier,
      name: "Team & Institute",
      price: "$19.99",
      period: "/user/month",
      credits: "+500 AI Credits / mo",
      description: "For university departments, research labs, and enterprises.",
      features: [
        "500 AI generations per seat",
        "Team collaboration & shared templates",
        "Custom branding & palettes",
        "Bulk document processing",
        "Dedicated AI processing queue"
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBD7BE]/60 dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#FFFFFF] text-xs font-semibold shadow-sm">
          <Settings className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Presentation Maker Settings & Subscriptions
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#4A3A34] dark:text-[#FFFFFF] tracking-tight">
          Account & SaaS Preferences
        </h1>
        <p className="text-[#6B4E3D] dark:text-[#FFFFFF] text-sm">
          Manage your AI credits, subscription tier, custom themes, and profile metadata.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-lg">
          <span className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{saveSuccess}</span>
          </span>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 font-bold text-base leading-none">
            &times;
          </button>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-[#D0AE92]/40 dark:border-[#8C7D70]/40 pb-3">
        <button
          onClick={() => setActiveTab("subscription")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "subscription"
              ? "bg-[var(--color-primary)] text-[#FFFFFF] shadow-md shadow-[var(--color-primary)]/25"
              : "bg-[#EBD7BE]/40 dark:bg-[#3E3731] hover:bg-[#EBD7BE]/80 dark:hover:bg-[#5A4F47] text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40"
          }`}
        >
          <Zap className={`w-4 h-4 ${activeTab === "subscription" ? "text-amber-300 fill-amber-300" : "text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400"}`} />
          <span>Plans & AI Credits</span>
        </button>

        <button
          onClick={() => setActiveTab("appearance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "appearance"
              ? "bg-[var(--color-primary)] text-[#FFFFFF] shadow-md shadow-[var(--color-primary)]/25"
              : "bg-[#EBD7BE]/40 dark:bg-[#3E3731] hover:bg-[#EBD7BE]/80 dark:hover:bg-[#5A4F47] text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Appearance & Theme</span>
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "profile"
              ? "bg-[var(--color-primary)] text-[#FFFFFF] shadow-md shadow-[var(--color-primary)]/25"
              : "bg-[#EBD7BE]/40 dark:bg-[#3E3731] hover:bg-[#EBD7BE]/80 dark:hover:bg-[#5A4F47] text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40"
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Profile Details</span>
        </button>

        <button
          onClick={() => setActiveTab("language")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "language"
              ? "bg-[var(--color-primary)] text-[#FFFFFF] shadow-md shadow-[var(--color-primary)]/25"
              : "bg-[#EBD7BE]/40 dark:bg-[#3E3731] hover:bg-[#EBD7BE]/80 dark:hover:bg-[#5A4F47] text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40"
          }`}
        >
          <Languages className="w-4 h-4" />
          <span>Languages</span>
        </button>
      </div>

      {/* TAB 1: SUBSCRIPTION PLANS & AI CREDITS */}
      {activeTab === "subscription" && (
        <div className="space-y-8">
          {/* Real AI Credits Usage Card */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-white via-[#FDFBF7] to-[#F5ECE0] dark:from-[#3E3731] dark:via-[#332D28] dark:to-[#3E3731] border border-[#D0AE92]/60 dark:border-[#8C7D70]/40 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Real AI Usage & Credits Balance</span>
                </span>
                <h3 className="text-2xl font-black text-[#4A3A34] dark:text-[#FFFFFF] tracking-tight">
                  Active Tier: <span className="uppercase text-[var(--color-primary)] dark:text-[#FFFFFF]">{currentPlan} Plan</span>
                </h3>
              </div>
              <div className="text-left sm:text-right bg-[#EBD7BE]/40 dark:bg-[#4D443D] px-4 py-2.5 rounded-2xl border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 shadow-sm">
                <div className="text-3xl md:text-4xl font-black text-[#4A3A34] dark:text-[#FFFFFF]">{remainingCredits}</div>
                <div className="text-xs font-semibold text-[#6B4E3D] dark:text-[#FFFFFF]">AI Credits Remaining</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 pt-1">
              <div className="w-full h-3.5 rounded-full bg-[#EBD7BE]/70 dark:bg-[#2A2521] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-primary)] via-[#A8836C] to-amber-500 rounded-full transition-all duration-500 shadow-sm"
                  style={{
                    width: `${Math.min(100, Math.max(5, (remainingCredits / (totalCredits || 1)) * 100))}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs font-semibold text-[#6B4E3D] dark:text-[#FFFFFF]">
                <span>{usedCredits} credits used</span>
                <span>{totalCredits} total credits allocated</span>
              </div>
            </div>
          </div>

          {/* Pricing Plans Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#4A3A34] dark:text-[#FFFFFF] flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
              <span>Available Subscription Plans</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {PLANS.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-5 border flex flex-col justify-between transition-all duration-200 relative ${
                      isCurrent
                        ? "bg-white dark:bg-[#3E3731] border-2 border-[var(--color-primary)] shadow-xl ring-2 ring-[var(--color-primary)]/20"
                        : plan.popular
                        ? "bg-gradient-to-b from-[#FFFDF9] to-white dark:from-[#3E3731] dark:to-[#3E3731] border-2 border-[#A8836C] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        : "bg-white/95 dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 hover:border-[#A8836C] shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    {plan.popular && !isCurrent && (
                      <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-600 to-[#A8836C] text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                        Recommended
                      </span>
                    )}

                    {isCurrent && (
                      <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-emerald-600 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> Current Plan
                      </span>
                    )}

                    <div className="space-y-3.5">
                      <div>
                        <h3 className="text-lg font-bold text-[#4A3A34] dark:text-[#FFFFFF]">{plan.name}</h3>
                        <p className="text-xs text-[#6B4E3D] dark:text-[#FFFFFF] mt-1 min-h-[32px] leading-relaxed">{plan.description}</p>
                      </div>

                      <div className="pt-1 flex items-baseline">
                        <span className="text-3xl font-black text-[#4A3A34] dark:text-[#FFFFFF] tracking-tight">{plan.price}</span>
                        <span className="text-xs font-semibold text-[#77574A] dark:text-[#FFFFFF] ml-1.5">{plan.period}</span>
                      </div>

                      <div className="pt-0.5">
                        <div className={`text-xs font-bold py-1.5 px-3 rounded-xl inline-flex items-center gap-1.5 ${
                          plan.popular
                            ? "bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30"
                            : isCurrent
                            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] dark:text-[#FFFFFF] border border-[var(--color-primary)]/25"
                            : "bg-[#EBD7BE]/50 dark:bg-[#4D443D] text-[#77574A] dark:text-[#FFFFFF] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40"
                        }`}>
                          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{plan.credits}</span>
                        </div>
                      </div>

                      <ul className="space-y-2 pt-3 border-t border-[#D0AE92]/40 dark:border-[#8C7D70]/40">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-xs text-[#4A3A34] dark:text-[#FFFFFF] leading-relaxed">
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 stroke-[2.5]" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-5 mt-4 border-t border-[#D0AE92]/40 dark:border-[#8C7D70]/40">
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isCurrent || upgradingPlan === plan.id}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                          isCurrent
                            ? "bg-[#EBD7BE]/60 dark:bg-[#4D443D] text-[#77574A] dark:text-[#FFFFFF] border border-[#D0AE92]/60 dark:border-[#8C7D70]/40 cursor-default"
                            : plan.popular
                            ? "bg-gradient-to-r from-amber-600 to-[#A8836C] hover:from-amber-700 hover:to-[#916F5B] text-white shadow-md shadow-[#A8836C]/25"
                            : "text-white shadow-md hover:opacity-90 transition-opacity"
                        }`}
                        style={!isCurrent && !plan.popular ? { backgroundColor: 'var(--color-primary)' } : undefined}
                      >
                        {isCurrent ? (
                          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 stroke-[3]" /> Active Plan</span>
                        ) : upgradingPlan === plan.id ? (
                          <span>Upgrading...</span>
                        ) : (
                          <span>Choose {plan.name}</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User's Payment Requests History (Part 10) */}
          {myPayments.length > 0 && (
            <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-[#4A3A34] dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>My Subscription Upgrade Requests</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#D0AE92]/30 text-[#77574A] dark:text-[#EBD7BE] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Transaction Reference</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0AE92]/20">
                    {myPayments.map(p => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 uppercase font-bold text-[11px]">{p.plan}</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-600">
                          PKR {p.amount_pkr?.toLocaleString() || (p.gross_amount * 280).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">{p.transaction_ref}</td>
                        <td className="py-2.5 px-3 text-[#77574A]">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.payment_status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-700"
                              : p.payment_status === "REJECTED"
                              ? "bg-rose-500/20 text-rose-700"
                              : "bg-amber-500/20 text-amber-700"
                          }`}>
                            {p.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPEARANCE & THEME */}
      {activeTab === "appearance" && (
        <div className="space-y-8">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF]">App Theme Mode</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setThemeMode("light")}
                className={`p-4 rounded-xl border flex flex-col items-center space-y-2 transition-all ${
                  mode === "light"
                    ? "bg-[#A8836C]/20 border-[#A8836C] text-[#4A3A34] dark:text-[#FFFFFF] shadow-sm"
                    : "bg-[#F9F2E4]/40 dark:bg-[#4D443D] border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#FFFFFF] hover:border-[#A8836C]"
                }`}
              >
                <Sun className="w-6 h-6 text-amber-500" />
                <span className="text-xs font-semibold">Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode("dark")}
                className={`p-4 rounded-xl border flex flex-col items-center space-y-2 transition-all ${
                  mode === "dark"
                    ? "bg-[#A8836C]/20 border-[#A8836C] text-[#4A3A34] dark:text-[#FFFFFF] shadow-md shadow-[#A8836C]/15"
                    : "bg-[#F9F2E4]/40 dark:bg-[#4D443D] border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#FFFFFF] hover:border-[#A8836C]"
                }`}
              >
                <Moon className="w-6 h-6 text-[#A8836C]" />
                <span className="text-xs font-semibold">Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode("system")}
                className={`p-4 rounded-xl border flex flex-col items-center space-y-2 transition-all ${
                  mode === "system"
                    ? "bg-[#A8836C]/20 border-[#A8836C] text-[#4A3A34] dark:text-[#FFFFFF] shadow-sm"
                    : "bg-[#F9F2E4]/40 dark:bg-[#4D443D] border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#FFFFFF] hover:border-[#A8836C]"
                }`}
              >
                <Monitor className="w-6 h-6 text-[#A8836C]" />
                <span className="text-xs font-semibold">System Default</span>
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Color Theme Presets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(COLOR_PRESETS).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColorPreset(key as AppColorTheme)}
                  className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${
                    colorPreset === key
                      ? "bg-[#EBD7BE]/50 dark:bg-[#4D443D] border-[#A8836C] shadow-md ring-1 ring-[#A8836C]/40"
                      : "bg-[#F9F2E4]/30 dark:bg-[#4D443D] border-[#D0AE92]/40 dark:border-[#8C7D70]/40 hover:border-[#A8836C]"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: value.hex }} />
                  <span className="text-xs font-medium text-[#4A3A34] dark:text-[#FFFFFF]">{value.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROFILE DETAILS */}
      {activeTab === "profile" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Your Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6B4E3D] dark:text-[#FFFFFF]">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/60 dark:placeholder-[#B8ABA0] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6B4E3D] dark:text-[#FFFFFF]">Email Address (Read-Only)</label>
              <input
                type="text"
                disabled
                value={user?.email || ""}
                className="w-full px-3.5 py-2.5 bg-[#EBD7BE]/40 dark:bg-[#2A2521] border border-[#D0AE92]/30 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#77574A]/70 dark:text-[#FFFFFF]/60 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6B4E3D] dark:text-[#FFFFFF]">Country / Region</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/60 dark:placeholder-[#B8ABA0] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6B4E3D] dark:text-[#FFFFFF]">User Role</label>
              <input
                type="text"
                disabled
                value={user?.role || "student"}
                className="w-full px-3.5 py-2.5 bg-[#EBD7BE]/40 dark:bg-[#2A2521] border border-[#D0AE92]/30 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#77574A]/70 dark:text-[#FFFFFF]/60 capitalize cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-[#FFFFFF] text-xs font-bold transition-all shadow-md hover:opacity-90 shiny-button cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: LANGUAGES */}
      {activeTab === "language" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Language & Localization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6B4E3D] dark:text-[#FFFFFF]">Interface Language</label>
              <select
                value={interfaceLang}
                onChange={(e) => setInterfaceLang(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#4A3A34] dark:text-[#FFFFFF] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="English" className="bg-[#F9F2E4] dark:bg-[#2A2521] text-[#4A3A34] dark:text-[#FFFFFF]">English</option>
                <option value="Urdu" className="bg-[#F9F2E4] dark:bg-[#2A2521] text-[#4A3A34] dark:text-[#FFFFFF]">Urdu (اردو)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6B4E3D] dark:text-[#FFFFFF]">Default Presentation Language</label>
              <select
                value={presentationLang}
                onChange={(e) => setPresentationLang(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#4A3A34] dark:text-[#FFFFFF] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="English" className="bg-[#F9F2E4] dark:bg-[#2A2521] text-[#4A3A34] dark:text-[#FFFFFF]">English</option>
                <option value="Urdu" className="bg-[#F9F2E4] dark:bg-[#2A2521] text-[#4A3A34] dark:text-[#FFFFFF]">Urdu (اردو)</option>
                <option value="Spanish" className="bg-[#F9F2E4] dark:bg-[#2A2521] text-[#4A3A34] dark:text-[#FFFFFF]">Spanish (Español)</option>
                <option value="French" className="bg-[#F9F2E4] dark:bg-[#2A2521] text-[#4A3A34] dark:text-[#FFFFFF]">French (Français)</option>
                <option value="German" className="bg-[#F9F2E4] dark:bg-[#2A2521] text-[#4A3A34] dark:text-[#FFFFFF]">German (Deutsch)</option>
                <option value="Chinese" className="bg-[#F9F2E4] dark:bg-[#2A2521] text-[#4A3A34] dark:text-[#FFFFFF]">Chinese (中文)</option>
                <option value="Arabic" className="bg-[#F9F2E4] dark:bg-[#2A2521] text-[#4A3A34] dark:text-[#FFFFFF]">Arabic (العربية)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-[#FFFFFF] text-xs font-bold transition-all shadow-md hover:opacity-90 shiny-button cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {saving ? "Saving..." : "Save Language Preferences"}
            </button>
          </div>
        </div>
      )}

      {/* NayaPay Subscription Upgrade Modal (Part 10) */}
      {showPaymentModal && selectedPaidPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D0AE92]/30 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#4A3A34] dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  Upgrade to {selectedPaidPlan.name}
                </h3>
                <span className="text-xs text-emerald-600 font-extrabold">
                  Payable Amount: PKR {selectedPaidPlan.amount_pkr?.toLocaleString()} (${selectedPaidPlan.amount_usd})
                </span>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Official NayaPay Credentials Card */}
            <div className="p-4 rounded-2xl bg-[#F9F2E4] dark:bg-[#332D28] border border-[#D0AE92]/40 space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-[#77574A] dark:text-[#EBD7BE]">
                Official Platform Payment Receiver (NayaPay)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#77574A] block text-[10px]">Recipient Name:</span>
                  <span className="font-bold text-[#4A3A34] dark:text-white">Syeda Gul Andam Malik Kazmi</span>
                </div>
                <div>
                  <span className="text-[#77574A] block text-[10px]">Payment Number / Account:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">03339114569</span>
                </div>
              </div>
              <p className="text-[11px] text-[#77574A] dark:text-[#EBD7BE] pt-1">
                Transfer via NayaPay or any Bank app, Raast, JazzCash, or Easypaisa to <strong>03339114569</strong>.
                Enter <strong>{selectedPaidPlan.transaction_ref}</strong> in the transfer reference note.
              </p>
            </div>

            <form onSubmit={handleSubmitSubscriptionPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Sender / Payer Full Name
                </label>
                <input
                  type="text"
                  required
                  value={payerName}
                  onChange={e => setPayerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white"
                  placeholder="Your name as displayed on bank receipt"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Transaction Reference ID (Trx ID)
                </label>
                <input
                  type="text"
                  required
                  value={trxRef}
                  onChange={e => setTrxRef(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white font-mono"
                  placeholder="e.g. NP-SUB-... or bank transaction ID"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Receipt Screenshot / Image URL
                </label>
                <input
                  type="url"
                  value={receiptUrl}
                  onChange={e => setReceiptUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white"
                  placeholder="https://... (link to uploaded receipt screenshot)"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#D0AE92]/30">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D0AE92]/40 text-[#77574A] dark:text-[#EBD7BE] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md transition-colors"
                >
                  {submittingPayment ? "Submitting..." : "Submit Payment for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
