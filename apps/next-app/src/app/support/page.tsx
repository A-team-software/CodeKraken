"use client";

import React, { useState } from "react";
import { ArrowLeft, Mail, MessageCircle, HelpCircle, Send, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    // Simulate form submission (replace with actual API call)
    try {
      // TODO: Replace with actual API endpoint
      // await fetch("/api/support", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(formData),
      // });

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmitStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

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
        <div className="border-b border-slate-800 py-6 px-6">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded-lg transition-smooth"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Customer Support</h1>
          </div>
        </div>

        {/* Content */}
        <div className="py-20 px-6">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Introduction */}
            <section className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <h2 className="text-3xl font-bold">How Can We Help You?</h2>
              <p className="text-lg text-slate-200 max-w-2xl mx-auto">
                Our support team is here to assist you with any questions, issues, or feedback 
                about OliverAI. We typically respond within 24-48 hours.
              </p>
            </section>

            {/* Contact Methods */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Email Support */}
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-bold">Email Support</h3>
                </div>
                <p className="text-slate-200 mb-4">
                  Send us an email and we'll get back to you as soon as possible.
                </p>
                <a
                  href="mailto:benmatanda354@gmail.com"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-smooth"
                >
                  <Mail className="w-4 h-4" />
                  benmatanda354@gmail.com
                </a>
              </div>

              {/* Response Time */}
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="w-6 h-6 text-purple-400" />
                  <h3 className="text-xl font-bold">Response Time</h3>
                </div>
                <p className="text-slate-200 mb-4">
                  We aim to respond to all inquiries within 24-48 hours during business days.
                </p>
                <div className="text-sm text-slate-400">
                  <p>Business Hours: Monday - Friday, 9 AM - 5 PM EST</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <section className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
              
              {submitStatus === "success" && (
                <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <p className="text-green-400">
                    Thank you! Your message has been sent. We'll get back to you soon.
                  </p>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400">
                    There was an error sending your message. Please try again or email us directly.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-2">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-200 mb-2">
                    Subject <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth"
                  >
                    <option value="">Select a topic</option>
                    <option value="technical">Technical Issue</option>
                    <option value="billing">Billing Question</option>
                    <option value="integration">Integration Help</option>
                    <option value="feature">Feature Request</option>
                    <option value="bug">Bug Report</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-200 mb-2">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth resize-none"
                    placeholder="Please describe your question or issue in detail..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-smooth flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* FAQ Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
              
              <div className="space-y-4">
                <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    How do I integrate with Jira?
                  </h3>
                  <p className="text-slate-200">
                    You can integrate with Jira by going to the Integrations page in your dashboard 
                    and following the OAuth setup process. For detailed instructions, check out our{" "}
                    <Link href="/docs" className="text-blue-400 hover:underline">
                      documentation
                    </Link>
                    .
                  </p>
                </div>

                <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    What payment methods do you accept?
                  </h3>
                  <p className="text-slate-200">
                    We accept all major credit cards and process payments securely through our 
                    payment provider. Enterprise customers can also arrange for invoicing.
                  </p>
                </div>

                <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Can I cancel my subscription at any time?
                  </h3>
                  <p className="text-slate-200">
                    Yes, you can cancel your subscription at any time from your account settings. 
                    Your subscription will remain active until the end of your current billing period.
                  </p>
                </div>

                <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Is my code and data secure?
                  </h3>
                  <p className="text-slate-200">
                    Yes, we take security seriously. All data is encrypted in transit and at rest. 
                    We use industry-standard security practices and never store your code permanently 
                    unless you explicitly save it. For more details, see our{" "}
                    <Link href="/privacy" className="text-blue-400 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </section>

            {/* Additional Resources */}
            <section className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-4">Additional Resources</h2>
              <div className="grid md:grid-cols-2 gap-4 text-slate-200">
                <Link
                  href="/docs"
                  className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-smooth"
                >
                  <h3 className="font-semibold text-white mb-1">Documentation</h3>
                  <p className="text-sm">Comprehensive guides and API reference</p>
                </Link>
                <Link
                  href="/pricing"
                  className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-smooth"
                >
                  <h3 className="font-semibold text-white mb-1">Pricing</h3>
                  <p className="text-sm">View our plans and features</p>
                </Link>
                <Link
                  href="/privacy"
                  className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-smooth"
                >
                  <h3 className="font-semibold text-white mb-1">Privacy Policy</h3>
                  <p className="text-sm">Learn how we protect your data</p>
                </Link>
                <Link
                  href="/terms"
                  className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-smooth"
                >
                  <h3 className="font-semibold text-white mb-1">Terms of Service</h3>
                  <p className="text-sm">Read our terms and conditions</p>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

