"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CreditCard, Zap, Check, Crown, Sparkles, 
  ExternalLink, RefreshCw, Gift, Copy, CheckCircle2, Coins
} from "lucide-react";

interface Profile {
  plan: "free" | "plus";
  usage_cents_this_month: number;
  token_balance_cents: number;
  free_month_credits: number;
  referral_code: string;
  subscription_status: string;
  stripe_subscription_id?: string;
}

interface Usage {
  usedCents: number;
  limitCents: number;
  remainingCents: number;
  percentUsed: number;
}

interface Referrals {
  referralCode: string;
  totalReferred: number;
  pendingRewards: number;
  creditedRewards: number;
}

const PLANS = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "10 AI interactions/day",
      "Basic task management",
      "Habit tracking",
      "Journal",
    ],
  },
  plus: {
    name: "Pulse+",
    monthlyPrice: 5,
    yearlyPrice: 50,
    features: [
      "300 tokens/month included",
      "Full Life Dashboard",
      "Work Mode & Focus Timer",
      "Philosophy Dojo",
      "Identity Engine",
      "Voice features",
      "Deal & Contact Intelligence",
      "Unlimited feature access",
      "Priority support",
    ],
  },
};

const TOKEN_PACKAGES = [
  { id: "starter", name: "Starter", tokens: 100, price: 5, perToken: "$0.05" },
  { id: "standard", name: "Standard", tokens: 220, price: 10, perToken: "$0.045", savings: "10% off" },
  { id: "power", name: "Power", tokens: 600, price: 25, perToken: "$0.042", savings: "16% off" },
  { id: "ultimate", name: "Ultimate", tokens: 1400, price: 50, perToken: "$0.036", savings: "28% off" },
];

function BillingContent() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [referrals, setReferrals] = useState<Referrals | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const success = searchParams.get("success");
  const cancelled = searchParams.get("cancelled");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setUsage(data.usage);
        setReferrals(data.referrals);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading("plus");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "plus", billingPeriod }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setUpgrading(null);
    }
  };

  const handleBuyTokens = async (packageId: string) => {
    setUpgrading(packageId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: packageId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Token checkout error:", err);
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    }
  };

  const copyReferralLink = () => {
    const link = `https://pulselifeos.com/?ref=${referrals?.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  const tokensRemaining = (usage?.remainingCents || 0) + (profile?.token_balance_cents || 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        <div>
          <h1 className="text-2xl font-bold">Billing & Tokens</h1>
          <p className="text-zinc-400 mt-1">Manage your subscription and purchase tokens</p>
        </div>

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300">Payment successful! Your account has been updated.</span>
          </div>
        )}
        {cancelled && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <span className="text-yellow-300">Payment cancelled. No changes made to your account.</span>
          </div>
        )}

        <div className="p-6 bg-gradient-to-r from-violet-900/30 to-blue-900/30 border border-violet-500/30 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm mb-1">Token Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{tokensRemaining.toLocaleString()}</span>
                <span className="text-zinc-400">tokens</span>
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                ≈ ${(tokensRemaining / 100).toFixed(2)} of AI power
              </p>
            </div>
            <Coins className="w-16 h-16 text-violet-400 opacity-50" />
          </div>
          
          {profile?.plan === "plus" && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Monthly allowance used</span>
                <span>{usage?.usedCents || 0} / 300</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    (usage?.percentUsed || 0) > 80 ? "bg-red-500" :
                    (usage?.percentUsed || 0) > 50 ? "bg-yellow-500" :
                    "bg-violet-500"
                  }`}
                  style={{ width: `${Math.min(100, usage?.percentUsed || 0)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl border ${
            profile?.plan === "free" 
              ? "bg-zinc-900 border-zinc-700 ring-2 ring-zinc-600" 
              : "bg-zinc-900/50 border-zinc-800"
          }`}>
            <h3 className="text-lg font-semibold mb-2">Free</h3>
            <p className="text-3xl font-bold mb-4">$0</p>
            <ul className="space-y-2 mb-6">
              {PLANS.free.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                  <Check className="w-4 h-4 text-zinc-500" />
                  {f}
                </li>
              ))}
            </ul>
            {profile?.plan === "free" && (
              <div className="py-2 text-center text-sm text-zinc-500 bg-zinc-800 rounded-lg">
                Current Plan
              </div>
            )}
          </div>

          <div className={`p-6 rounded-2xl border ${
            profile?.plan === "plus" 
              ? "bg-gradient-to-b from-violet-900/30 to-zinc-900 border-violet-500/50 ring-2 ring-violet-500" 
              : "bg-gradient-to-b from-violet-900/20 to-zinc-900 border-violet-500/30"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Pulse+</h3>
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold">
                ${billingPeriod === "yearly" ? Math.round(50/12) : 5}
              </span>
              <span className="text-zinc-400">/mo</span>
            </div>
            
            {billingPeriod === "yearly" && (
              <p className="text-xs text-emerald-400 mb-4">Billed $50/year (2 months free!)</p>
            )}
            
            <ul className="space-y-2 mb-6">
              {PLANS.plus.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>

            {profile?.plan === "plus" ? (
              <div className="space-y-2">
                <div className="py-2 text-center text-sm text-violet-300 bg-violet-500/20 rounded-lg">
                  ✓ Active Subscription
                </div>
                <button
                  onClick={handleManageBilling}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Manage Subscription
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex bg-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() => setBillingPeriod("monthly")}
                    className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                      billingPeriod === "monthly" ? "bg-violet-600 text-white" : "text-zinc-400"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod("yearly")}
                    className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                      billingPeriod === "yearly" ? "bg-violet-600 text-white" : "text-zinc-400"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading === "plus"}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {upgrading === "plus" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Upgrade to Pulse+
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Buy Tokens</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Need more AI power? Buy tokens that never expire. 1 token ≈ 1 AI interaction.
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOKEN_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{pkg.name}</h3>
                  {pkg.savings && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                      {pkg.savings}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold">{pkg.tokens.toLocaleString()}</div>
                <div className="text-sm text-zinc-400 mb-3">tokens</div>
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-xl font-semibold">${pkg.price}</span>
                  <span className="text-xs text-zinc-500">{pkg.perToken}/token</span>
                </div>
                <button
                  onClick={() => handleBuyTokens(pkg.id)}
                  disabled={upgrading === pkg.id}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {upgrading === pkg.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Buy Now"
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gradient-to-r from-pink-900/20 to-violet-900/20 border border-pink-500/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-pink-400" />
            <h2 className="text-xl font-semibold">Refer Friends, Get Free Tokens</h2>
          </div>
          
          <p className="text-zinc-300 mb-4">
            Share your link. When friends sign up and upgrade, you both get 500 free tokens!
          </p>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 p-3 bg-zinc-800 rounded-lg font-mono text-sm truncate">
              https://pulselifeos.com/?ref={referrals?.referralCode}
            </div>
            <button
              onClick={copyReferralLink}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg flex items-center gap-2"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-2xl font-bold">{referrals?.totalReferred || 0}</div>
              <div className="text-zinc-400">Friends Referred</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{referrals?.pendingRewards || 0}</div>
              <div className="text-zinc-400">Tokens Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{referrals?.creditedRewards || 0}</div>
              <div className="text-zinc-400">Tokens Earned</div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link href="/settings" className="text-zinc-400 hover:text-white text-sm">
            ← Back to Settings
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
