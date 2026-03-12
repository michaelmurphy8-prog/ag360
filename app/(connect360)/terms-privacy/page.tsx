'use client'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

const LAST_UPDATED = 'March 2026'

export default function TermsPrivacyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F7F5F0' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <ChevronLeft size={16} color="#FFFFFF" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>Terms & Privacy</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Last updated {LAST_UPDATED}</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4 pb-10">
        {[
          {
            title: '1. About Connect360',
            body: `Connect360 is a professional networking platform operated by AG360 Inc., designed to connect farmers, agricultural workers, service providers, and industry professionals across Canada and worldwide. By using Connect360, you agree to these terms in full.`,
          },
          {
            title: '2. User Verification & Liability',
            body: `AG360 Inc. and Connect360, along with any of their subsidiaries, affiliates, officers, employees, agents, and partners, make commercially reasonable efforts to verify the identity and credentials of users on the platform. We review profiles before approval and may request supporting documentation at our discretion.\n\nHowever, we do not guarantee the accuracy, completeness, or legitimacy of any information provided by users. We are not responsible for misrepresentation by any party.\n\nAG360 Inc. and Connect360 accept no liability for any negotiations, agreements, employment arrangements, contracts, or any other dealings conducted between users — whether initiated through the platform or otherwise. All agreements made between users are solely the responsibility of the parties involved. Users are encouraged to conduct their own due diligence before entering into any arrangement.`,
          },
          {
            title: '3. Data We Collect',
            body: `We collect information you provide when creating a profile (name, email, phone, location, work history, credentials), along with usage data to improve the platform. We do not sell your personal data to third parties. Your profile information is visible to other verified Connect360 members only.`,
          },
          {
            title: '4. How We Use Your Data',
            body: `Your data is used to operate the Connect360 platform, match you with relevant connections and opportunities, send email notifications (if enabled), and improve our services. We may use anonymized, aggregated data for platform analytics.`,
          },
          {
            title: '5. User Conduct',
            body: `Users agree not to misrepresent their identity, credentials, or qualifications. Harassment, spam, fraudulent job postings, or any use of the platform for illegal purposes will result in immediate removal. AG360 reserves the right to suspend or delete any account at its sole discretion.`,
          },
          {
            title: '6. Content Ownership',
            body: `You retain ownership of any content you submit to Connect360 (profile information, photos, CVs). By submitting content, you grant AG360 Inc. a non-exclusive, royalty-free licence to display that content within the platform for the purpose of operating the service.`,
          },
          {
            title: '7. Limitation of Liability',
            body: `To the maximum extent permitted by applicable law, AG360 Inc. and Connect360 shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the platform — including but not limited to lost wages, lost contracts, or damages arising from interactions with other users.`,
          },
          {
            title: '8. Changes to These Terms',
            body: `We may update these terms from time to time. Continued use of the platform after any changes constitutes acceptance of the revised terms. We will make reasonable efforts to notify users of significant changes.`,
          },
          {
            title: '9. Contact',
            body: `For any questions, data requests, or concerns regarding these terms or your privacy, contact us at:\n\nhello@ag360.farm\n\nAG360 Inc. — Swift Current, Saskatchewan, Canada`,
          },
        ].map((section, i) => (
          <div key={i} className="rounded-2xl p-4"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 className="text-sm font-bold mb-2" style={{ color: '#0D1520' }}>{section.title}</h2>
            <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: '#6B7280' }}>{section.body}</p>
          </div>
        ))}

        <p className="text-center text-[10px] px-4" style={{ color: '#B0A898' }}>
          © {new Date().getFullYear()} AG360 Inc. All rights reserved. Connect360 is a product of AG360 Inc.
        </p>
      </div>
    </div>
  )
}