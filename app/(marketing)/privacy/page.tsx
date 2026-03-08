// app/(marketing)/privacy/page.tsx
// Privacy Policy stub — required for App Store submission
// Update with real legal content before public launch

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | AG360",
  description: "AG360 Privacy Policy",
};

const LAST_UPDATED = "March 8, 2026";
const CONTACT_EMAIL = "mike@ag360.farm";
const APP_NAME = "AG360";
const COMPANY = "AG360 Technologies Inc.";

export default function PrivacyPolicyPage() {
  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "60px 24px", fontFamily: "system-ui, sans-serif", color: "#1a2940", lineHeight: 1.7 }}>
      <div style={{ marginBottom: "40px" }}>
        <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Legal
        </div>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#070D18", marginBottom: "8px" }}>Privacy Policy</h1>
        <p style={{ fontSize: "14px", color: "#6B7280" }}>Last updated: {LAST_UPDATED}</p>
      </div>

      <section style={{ marginBottom: "32px" }}>
        <p>{COMPANY} ("we", "our", or "us") operates the {APP_NAME} agricultural management platform (the "Service"). This Privacy Policy describes how we collect, use, and protect your information when you use our Service.</p>
      </section>

      {[
        {
          title: "1. Information We Collect",
          content: `We collect information you provide directly to us, such as:
          
• Account information: name, email address, farm name, and location (province)
• Farm operational data: field boundaries, crop records, grain inventory, equipment records, and financial records you choose to enter
• Usage data: how you interact with the platform
• Device information: IP address, browser type, operating system
• Location data: GPS coordinates when using mobile features (with your permission)

We do not sell your personal information or farm data to third parties.`,
        },
        {
          title: "2. How We Use Your Information",
          content: `We use the information we collect to:

• Provide, maintain, and improve the Service
• Send you technical notices and support messages
• Respond to your comments and questions
• Protect against fraudulent, unauthorized, or illegal activity
• Generate anonymized, aggregated insights (no farm-specific data is shared)`,
        },
        {
          title: "3. Data Storage and Security",
          content: `Your data is stored on secure servers hosted in North America. We use industry-standard encryption (TLS/SSL) for data in transit and at rest. Farm operational data is logically isolated per account using tenant-level access controls.

We retain your data for as long as your account is active. Upon account deletion, your data is removed within 30 days except where required by law.`,
        },
        {
          title: "4. Location Data",
          content: `The ${APP_NAME} mobile app requests access to your device's location for features including field mapping, scouting reports, and employee time clock. Location data is:

• Only collected when the app is in use and you have granted permission
• Used solely for operational features within your account
• Never shared with third parties for advertising purposes

You can revoke location access at any time in your device settings.`,
        },
        {
          title: "5. Third-Party Services",
          content: `We use the following third-party services to operate the platform:

• Clerk (authentication)
• Vercel (hosting and infrastructure)
• Neon (database)
• Mapbox (mapping)
• Anthropic (AI advisor features — only query text and photo data you explicitly submit is processed)

Each third-party service operates under their own privacy policy.`,
        },
        {
          title: "6. Your Rights (PIPEDA — Canadian Users)",
          content: `Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), you have the right to:

• Access the personal information we hold about you
• Correct inaccurate information
• Request deletion of your personal information
• Withdraw consent for data processing
• File a complaint with the Office of the Privacy Commissioner of Canada

To exercise these rights, contact us at ${CONTACT_EMAIL}.`,
        },
        {
          title: "7. Children's Privacy",
          content: `The Service is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13.`,
        },
        {
          title: "8. Changes to This Policy",
          content: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or through the Service. Continued use of the Service after changes take effect constitutes acceptance of the updated policy.`,
        },
        {
          title: "9. Contact Us",
          content: `If you have questions about this Privacy Policy, please contact us at:\n\n${COMPANY}\nEmail: ${CONTACT_EMAIL}`,
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