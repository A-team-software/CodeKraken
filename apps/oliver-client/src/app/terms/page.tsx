"use client";

import React from "react";
import { ArrowLeft, FileText, AlertTriangle, Scale, Gavel } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
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
            <h1 className="text-3xl font-bold">Terms of Service</h1>
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
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-blue-400" />
                <h2 className="text-3xl font-bold">Agreement to Terms</h2>
              </div>
              <p className="text-lg text-slate-200">
                These Terms of Service ("Terms") constitute a legally binding agreement between you 
                ("User," "you," or "your") and OliverAI ("Company," "we," "us," or "our") regarding 
                your use of our AI-powered coding assistant service that integrates with project 
                management tools such as Jira, Linear, Asana, and Trello.
              </p>
              <p className="text-slate-200">
                By accessing or using our service, you agree to be bound by these Terms. If you do 
                not agree to these Terms, you may not access or use our service.
              </p>
            </section>

            {/* Description of Service */}
            <section className="space-y-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-4">Description of Service</h2>
              <p className="text-slate-200">
                OliverAI is an AI-powered coding assistant that helps engineering teams resolve coding 
                tickets by integrating with project management and version control systems. Our service:
              </p>
              <ul className="space-y-2 ml-4 mt-4 text-slate-200">
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Connects to project management tools (Jira, Linear, Asana, Trello)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Integrates with Git providers (GitHub, GitLab, Bitbucket)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Generates code based on ticket requirements</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Automates pull request creation and code workflows</span>
                </li>
              </ul>
            </section>

            {/* User Accounts */}
            <section className="space-y-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold">User Accounts and Registration</h2>
              </div>
              <div className="space-y-3 text-slate-200">
                <p>
                  To use our service, you must:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Create an account with accurate and complete information</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Maintain the security of your account credentials</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Be at least 18 years old or have parental consent</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Notify us immediately of any unauthorized access to your account</span>
                  </li>
                </ul>
                <p className="mt-4">
                  You are responsible for all activities that occur under your account. We reserve 
                  the right to suspend or terminate accounts that violate these Terms.
                </p>
              </div>
            </section>

            {/* Acceptable Use */}
            <section className="space-y-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold">Acceptable Use Policy</h2>
              </div>
              <p className="text-slate-200 mb-4">
                You agree not to use our service to:
              </p>
              <ul className="space-y-2 ml-4 text-slate-200">
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span>Violate any applicable laws, regulations, or third-party rights</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span>Generate malicious code, malware, or code that violates security best practices</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span>Attempt to reverse engineer, decompile, or extract our AI models or algorithms</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span>Interfere with or disrupt the service or servers connected to the service</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span>Use automated systems to access the service in a manner that exceeds reasonable usage</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span>Share your account credentials with others or allow unauthorized access</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span>Use the service to process or store sensitive personal data without proper authorization</span>
                </li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Gavel className="w-6 h-6 text-pink-400" />
                <h2 className="text-2xl font-bold">Intellectual Property Rights</h2>
              </div>
              <div className="space-y-4 text-slate-200">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Our Intellectual Property</h3>
                  <p>
                    The service, including all content, features, functionality, AI models, algorithms, 
                    and software, is owned by OliverAI and protected by copyright, trademark, and 
                    other intellectual property laws.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Your Content and Generated Code</h3>
                  <p>
                    You retain ownership of any code, content, or data you provide to the service. 
                    Code generated by our AI assistant based on your input belongs to you, subject 
                    to your compliance with these Terms.
                  </p>
                  <p className="mt-2">
                    By using our service, you grant us a limited, non-exclusive license to use, 
                    process, and analyze your content solely for the purpose of providing and 
                    improving our service.
                  </p>
                </div>
              </div>
            </section>

            {/* Third-Party Integrations */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Third-Party Integrations</h2>
              <p className="text-slate-200">
                Our service integrates with third-party services (Jira, Linear, Asana, Trello, GitHub, etc.). 
                Your use of these integrations is subject to the terms and conditions of those third-party 
                services. We are not responsible for the availability, accuracy, or practices of third-party 
                services.
              </p>
              <p className="text-slate-200 mt-4">
                You are responsible for ensuring you have the necessary permissions and rights to connect 
                your accounts and access data from these third-party services.
              </p>
            </section>

            {/* Payment and Billing */}
            <section className="space-y-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-4">Payment and Billing</h2>
              <div className="space-y-4 text-slate-200">
                <p>
                  If you subscribe to a paid plan:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>You agree to pay all fees associated with your subscription plan</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Fees are billed in advance on a monthly or annual basis</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>All fees are non-refundable except as required by law</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>We reserve the right to change our pricing with 30 days' notice</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Failure to pay may result in suspension or termination of your account</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Disclaimers */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Disclaimers</h2>
              <div className="space-y-4 text-slate-200">
                <p>
                  <strong>AI-Generated Code:</strong> Code generated by our AI assistant is provided 
                  "as is" and may require review, testing, and modification before use in production. 
                  You are responsible for reviewing, testing, and validating all generated code.
                </p>
                <p>
                  <strong>No Warranty:</strong> Our service is provided "as is" and "as available" 
                  without warranties of any kind, either express or implied, including but not limited 
                  to warranties of merchantability, fitness for a particular purpose, or non-infringement.
                </p>
                <p>
                  <strong>Service Availability:</strong> We do not guarantee that the service will be 
                  available at all times or free from errors, interruptions, or security vulnerabilities.
                </p>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section className="space-y-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
              <p className="text-slate-200">
                To the maximum extent permitted by law, OliverAI shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
                whether incurred directly or indirectly, or any loss of data, use, goodwill, or other 
                intangible losses resulting from your use of the service.
              </p>
              <p className="text-slate-200 mt-4">
                Our total liability for any claims arising from or related to the service shall not exceed 
                the amount you paid us in the twelve (12) months preceding the claim.
              </p>
            </section>

            {/* Indemnification */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Indemnification</h2>
              <p className="text-slate-200">
                You agree to indemnify, defend, and hold harmless OliverAI and its officers, directors, 
                employees, and agents from any claims, damages, losses, liabilities, and expenses (including 
                attorneys' fees) arising from your use of the service, violation of these Terms, or 
                infringement of any rights of another party.
              </p>
            </section>

            {/* Termination */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Termination</h2>
              <div className="space-y-4 text-slate-200">
                <p>
                  We may terminate or suspend your account and access to the service immediately, without 
                  prior notice, for conduct that we believe violates these Terms or is harmful to other 
                  users, us, or third parties.
                </p>
                <p>
                  You may terminate your account at any time by contacting us or using the account 
                  deletion feature in your settings. Upon termination, your right to use the service 
                  will immediately cease.
                </p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Changes to Terms</h2>
              <p className="text-slate-200">
                We reserve the right to modify these Terms at any time. We will notify you of material 
                changes by posting the updated Terms on this page and updating the "Last updated" date. 
                Your continued use of the service after such changes constitutes acceptance of the new Terms.
              </p>
            </section>

            {/* Governing Law */}
            <section className="space-y-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-4">Governing Law and Dispute Resolution</h2>
              <p className="text-slate-200">
                These Terms shall be governed by and construed in accordance with the laws of the United States 
                and the State of Delaware, without regard to its conflict of law provisions.
              </p>
              <p className="text-slate-200 mt-4">
                Any disputes arising from these Terms or your use of the service shall be resolved through 
                binding arbitration in accordance with the rules of the American Arbitration Association (AAA), 
                except where prohibited by law. The arbitration shall take place in Delaware, and you waive any 
                right to a jury trial.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
              <p className="text-slate-200">
                If you have any questions about these Terms of Service, please contact us at:
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

