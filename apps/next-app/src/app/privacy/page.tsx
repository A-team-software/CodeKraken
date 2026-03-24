"use client";

import React from "react";
import { ArrowLeft, Shield, Lock, Eye, Database, Users } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>
        </div>

        {/* Content */}
        <div className="py-20 px-6">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Last Updated */}
            <div className="text-sm text-slate-400">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </div>

            {/* Introduction */}
            <section className="space-y-4">
              <h2 className="text-3xl font-bold mb-4">Introduction</h2>
              <p className="text-lg text-slate-200">
                At OliverAI ("we," "our," or "us"), we are committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                information when you use our AI-powered coding assistant service that integrates 
                with project management tools like Jira, Linear, Asana, and Trello.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="space-y-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold">Information We Collect</h2>
              </div>
              
              <div className="space-y-4 text-slate-200">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">1. Account Information</h3>
                  <p>When you create an account, we collect:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Email address</li>
                    <li>Name and profile information</li>
                    <li>Authentication credentials (stored securely)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">2. Integration Data</h3>
                  <p>To provide our services, we access and process:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li><strong>Code:</strong> Source code, code snippets, and project files from your repositories</li>
                    <li><strong>Tickets:</strong> Project management tool tickets and issues (Jira, Linear, Asana, Trello) including descriptions, requirements, and metadata</li>
                    <li><strong>Integrations:</strong> Repository information from connected Git providers (GitHub, GitLab, etc.), OAuth tokens, API keys, and integration configuration data (all encrypted and stored securely)</li>
                    <li>Project context and metadata necessary for code generation and workflow automation</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">3. Usage Data</h3>
                  <p>We automatically collect:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Service usage patterns and feature interactions</li>
                    <li>Error logs and performance metrics</li>
                    <li>IP address and device information</li>
                    <li>Browser type and version</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Information */}
            <section className="space-y-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold">How We Use Your Information</h2>
              </div>
              
              <ul className="space-y-3 text-slate-200">
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>To provide, maintain, and improve our AI coding assistant services</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>To process and generate code based on your project management tickets</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>To authenticate and manage integrations with third-party services</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>To communicate with you about your account, service updates, and support requests</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>To analyze usage patterns and improve our AI models and algorithms</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>To detect, prevent, and address technical issues and security threats</span>
                </li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section className="space-y-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-6 h-6 text-pink-400" />
                <h2 className="text-2xl font-bold">Data Sharing and Disclosure</h2>
              </div>
              
              <div className="space-y-4 text-slate-200">
                <p>
                  We do not sell your personal information. We may share your information only in the following circumstances:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span><strong>Service Providers:</strong> With trusted third-party service providers who assist in operating our service (e.g., cloud hosting, AI model providers)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span><strong>Legal Requirements:</strong> When required by law, court order, or government regulation</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Data Security */}
            <section className="space-y-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-6 h-6 text-green-400" />
                <h2 className="text-2xl font-bold">Data Security</h2>
              </div>
              
              <p className="text-slate-200">
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="space-y-2 ml-4 mt-4 text-slate-200">
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Encryption of data in transit (TLS/SSL) and at rest</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Secure storage of authentication tokens and API keys</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Regular security audits and vulnerability assessments</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Access controls and authentication mechanisms</span>
                </li>
              </ul>
              <p className="text-slate-200 mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. 
                While we strive to use commercially acceptable means to protect your information, we cannot 
                guarantee absolute security.
              </p>
            </section>

            {/* Your Rights */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold">Your Privacy Rights (US)</h2>
              </div>
              
              <p className="text-slate-200 mb-4">
                As a user in the United States, you have the following rights regarding your personal information:
              </p>
              <ul className="space-y-2 ml-4 text-slate-200">
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span><strong>Access:</strong> Request access to your personal information</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span><strong>Correction:</strong> Request correction of inaccurate information</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span><strong>Deletion:</strong> Request deletion of your personal information</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span><strong>Portability:</strong> Request transfer of your data to another service</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span><strong>Opt-out:</strong> Opt-out of certain data processing activities</span>
                </li>
              </ul>
              <p className="text-slate-200 mt-4">
                To exercise these rights, please contact us at{" "}
                <a href="mailto:benmatanda354@gmail.com" className="text-blue-400 hover:underline">
                  benmatanda354@gmail.com
                </a>
              </p>
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-slate-200">
                  <strong>California Residents:</strong> If you are a California resident, you have additional 
                  rights under the California Consumer Privacy Act (CCPA), including the right to know what 
                  personal information we collect, the right to delete personal information, and the right 
                  to opt-out of the sale of personal information (we do not sell your personal information).
                </p>
              </div>
            </section>

            {/* Cookies */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Cookies and Tracking Technologies</h2>
              <p className="text-slate-200">
                We use cookies and similar tracking technologies to track activity on our service and 
                store certain information. You can instruct your browser to refuse all cookies or to 
                indicate when a cookie is being sent. However, if you do not accept cookies, you may 
                not be able to use some portions of our service.
              </p>
            </section>

            {/* Third-Party Services */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Third-Party Services</h2>
              <p className="text-slate-200">
                Our service integrates with third-party services (Jira, Linear, Asana, Trello, GitHub, etc.). 
                Your use of these services is subject to their respective privacy policies. We encourage 
                you to review the privacy policies of any third-party services you connect to our platform.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Children's Privacy</h2>
              <p className="text-slate-200">
                Our service is not intended for individuals under the age of 18. We do not knowingly 
                collect personal information from children. If you become aware that a child has provided 
                us with personal information, please contact us, and we will take steps to delete such 
                information.
              </p>
            </section>

            {/* Changes to Policy */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Changes to This Privacy Policy</h2>
              <p className="text-slate-200">
                We may update our Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date. 
                You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
              <p className="text-slate-200">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <div className="mt-4 space-y-2 text-slate-200">
                <p>
                  <strong>Email:</strong>{" "}
                  <a href="mailto:benmatanda354@gmail.com" className="text-blue-400 hover:underline">
                    benmatanda354@gmail.com
                  </a>
                </p>
                <p>
                  <strong>Support:</strong>{" "}
                  <Link href="/support" className="text-blue-400 hover:underline">
                    Visit our support page
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

