// app/(marketing)/terms/page.tsx
// Terms of Service stub — required for App Store submission

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | AG360",
  description: "AG360 Terms of Service",
};

const LAST_UPDATED = "March 8, 2026";
const CONTACT_EMAIL = "mike@ag360tech.com";
const APP_NAME = "AG360";
const COMPANY = "AG360 Technologies Inc.";

export default function TermsPage() {
  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "60px 24px", fontFamily: "system-ui, sans-serif", color: "#1a2940", lineHeight: 1.7 }}>
      <div style={{ marginBottom: "40px" }}>
        <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Legal
        </div>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#070D18", marginBottom: "8px" }}>Terms of Service</h1>
        <p style={{ fontSize: "14px", color: "#6B7280" }}>Last updated: {LAST_UPDATED}</p>
      </div>

      <section style={{ marginBottom: "32px" }}>
        <p>By accessing or using {APP_NAME}, you agree to be bound by these Terms of Service. Please read them carefully. If you do not agree, do not use the Service.</p>
      </section>

      {[
        {
          title: "1. Acceptance of Terms",
          content: `These Terms constitute a legally binding agreement between you and ${COMPANY}. By creating an account or using the Service, you confirm that you are at least 18 years of age and have the authority to enter into this agreement.`,
        },
        {
          title: "2. Description of Service",
          content: `${APP_NAME} is an agricultural operating system for Canadian prairie farmers. The Service includes web and mobile tools for grain management, field mapping, inventory tracking, scouting, labour management, and AI-assisted farm advisory features.`,
        },
        {
          title: "3. Account Responsibilities",
          content: `You are responsible for:

• Maintaining the confidentiality of your account credentials
• All activity that occurs under your account
• Ensuring that invited team members comply with these Terms
• The accuracy of data you enter into the platform

You must notify us immediately at ${CONTACT_EMAIL} if you suspect unauthorized access to your account.`,
        },
        {
          title: "4. Acceptable Use",
          content: `You agree not to:

• Use the Service for any unlawful purpose
• Attempt to gain unauthorized access to other accounts or systems
• Upload malicious code, viruses, or harmful content
• Reverse engineer or copy the Service or its underlying code
• Resell or sublicense access to the Service without written permission`,
        },
        {
          title: "5. Data Ownership",
          content: `You retain full ownership of all farm data, records, and content you enter into ${APP_NAME}. We do not claim ownership of your data. You grant us a limited license to process and store your data solely for the purpose of providing the Service.

You can export or delete your data at any time. See our Privacy Policy for details on data retention.`,
        },
        {
          title: "6. Pricing and Payment",
          content: `${APP_NAME} is priced at no more than $0.10 per acre per month. Current pricing is displayed at checkout and within your account settings. We reserve the right to adjust pricing with 30 days' notice. Your continued use after a price change constitutes acceptance of the new pricing.`,
        },
        {
          title: "7. AI Features (Lily Advisor)",
          content: `The Lily AI Advisor feature provides general agricultural guidance based on the information you provide. AI-generated recommendations are for informational purposes only and do not constitute professional agronomic, financial, or legal advice. Always verify recommendations with a qualified professional before acting on them.`,
        },
        {
          title: "8. Disclaimer of Warranties",
          content: `The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or suitable for any particular purpose. Agricultural decisions involve significant risk; ${APP_NAME} does not guarantee crop outcomes or financial results.`,
        },
        {
          title: "9. Limitation of Liability",
          content: `To the maximum extent permitted by applicable law, ${COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to loss of profits, crop losses, or data loss.

Our total liability to you for any claims arising from use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim.`,
        },
        {
          title: "10. Termination",
          content: `You may terminate your account at any time by contacting ${CONTACT_EMAIL}. We reserve the right to suspend or terminate your account if you violate these Terms. Upon termination, your right to use the Service ceases immediately.`,
        },
        {
          title: "11. Governing Law",
          content: `These Terms are governed by the laws of the Province of Saskatchewan and the federal laws of Canada applicable therein, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Saskatchewan.`,
        },
        {
          title: "12. Contact",
          content: `Questions about these Terms? Contact us at:\n\n${COMPANY}\nEmail: ${CONTACT_EMAIL}`,
        },
      ].map(({ title, content }) => (
        <section key={title} style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#070D18", marginBottom: "12px" }}>{title}</h2>
          <div style={{ fontSize: "15px", color: "#374151", whiteSpace: "pre-line" }}>{content}</div>
        </section>
      ))}
    </main>
  );
}