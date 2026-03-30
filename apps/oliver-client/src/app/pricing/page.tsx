"use client";

import React from "react";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "../../../components/ui/button";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative">
        {/* Header */}
        <div className="border-b border-slate-800 py-6 px-6 sticky top-0 z-40 glass">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded-lg transition-smooth"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Pricing Plans</h1>
          </div>
        </div>

        {/* Content */}
        <div className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-bold">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-slate-400">
                Choose the plan that fits your development needs
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`rounded-xl p-8 border transition-smooth ${
                    plan.featured
                      ? "glass border-black/50 bg-gradient-to-br from-black/10 to-black/5 ring-2 ring-black/30 md:scale-105"
                      : "glass border-slate-700/50"
                  }`}
                >
                  {plan.featured && (
                    <div className="inline-block bg-black text-white px-3 py-1 rounded-full text-sm font-semibold mb-4">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-slate-400 mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-5xl font-bold">${plan.price}</span>
                    <span className="text-slate-400">/month</span>
                  </div>

                  <Button
                    variant={plan.featured ? "black" : "white"}
                    size="md"
                    className="w-full rounded-lg mb-8"
                  >
                    Get Started
                  </Button>

                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div
                        key={featureIndex}
                        className="flex items-start gap-3"
                      >
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* FAQ */}
            <div className="mt-20 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="glass rounded-lg p-6 border border-slate-700/50"
                  >
                    <h4 className="font-semibold text-lg mb-2">
                      {faq.question}
                    </h4>
                    <p className="text-slate-400">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const plans = [
  {
    name: "Starter",
    description: "Perfect for individual developers",
    price: 29,
    featured: false,
    features: [
      "100 code generations/month",
      "Basic platform integrations",
      "Community support",
      "Standard templates",
      "1 team member",
    ],
  },
  {
    name: "Professional",
    description: "For growing teams",
    price: 99,
    featured: true,
    features: [
      "Unlimited code generations",
      "All platform integrations",
      "Priority email support",
      "Advanced templates",
      "Up to 10 team members",
      "Custom workflows",
      "API access",
      "Advanced analytics",
    ],
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    price: 299,
    featured: false,
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Custom integrations",
      "Unlimited team members",
      "On-premise deployment",
      "24/7 phone support",
      "SLA guarantee",
      "Advanced security features",
    ],
  },
];

const faqs = [
  {
    question: "Can I switch plans anytime?",
    answer:
      "Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.",
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "Yes, we offer a 14-day free trial on all paid plans. No credit card required.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards, PayPal, and wire transfers for Enterprise customers.",
  },
  {
    question: "Is there a discount for annual billing?",
    answer:
      "Yes! Annual plans include 20% discount compared to monthly billing.",
  },
];
