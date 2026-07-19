import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/shared/ui/BrandLogo'

/** A titled policy section: numbered heading + its body (paragraphs / bullet lists). */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-content-primary">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-6 text-content-secondary">{children}</div>
    </section>
  )
}

/** Bulleted list from an array of nodes. */
function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 ps-5 marker:text-content-tertiary">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/**
 * PrivacyPolicyPage — the MI Technology privacy policy, rendered in-app at `/privacy`.
 * A standalone public document page (its own header + back link); opened in a new tab from the
 * register agree-terms link so a user in the wizard never loses their progress.
 */
export function PrivacyPolicyPage() {
  return (
    // dir="ltr": the policy text is English-only, so it must read left-to-right even when the
    // app is in Arabic (otherwise the document inherits RTL and the punctuation/numbering flips).
    <div dir="ltr" className="min-h-screen bg-bg-canvas">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="mimony home">
            <BrandLogo className="h-10 w-auto" />
          </Link>
          <Link to="/" className="text-sm font-medium text-content-link hover:text-content-link-hover">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold text-content-primary">Privacy Policy for MI Technology</h1>
        <p className="mt-2 text-sm text-content-tertiary">Last Updated: July 14, 2026</p>

        <div className="mt-8 flex flex-col gap-8">
          <Section title="1. Preface">
            <List
              items={[
                'Welcome to MI Technology ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy document explains how we collect, use, share, and protect your information when you use our website, mobile application, or any of our digital services.',
                'If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.',
              ]}
            />
          </Section>

          <Section title="2. Consent">
            <p>By using our websites, you hereby consent to our Privacy Policy and agree to its terms.</p>
          </Section>

          <Section title="3. Information we collect">
            <p>We may collect, use, store, and transfer different kinds of personal data about you:</p>
            <List
              items={[
                'When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.',
                'Any other information we gather about you from other cookies, Websites or companies that you have agreed to their policies, which gives them the right to sell, give, exchange the Data they have with other cookies.',
                'If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.',
              ]}
            />
          </Section>

          <Section title="4. How and Why We Use Your Data (Legal Basis)">
            <p>
              Under the PDPL, we will only use your personal data when the law allows us to. Most commonly, we use the
              information we collect in various ways, including to:
            </p>
            <List
              items={[
                'Provide, operate, and maintain our websites, and Businesses.',
                'Improve, personalize, and expand our websites, and Businesses.',
                'Understand and analyse how you use our websites, and Businesses.',
                'Develop new products, services, features, and functionality.',
                'Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the websites or businesses, and for marketing and promotional purposes.',
                'Send you emails, call you or any other contact process.',
                'Find and prevent fraud and any other illegal actions.',
              ]}
            />
          </Section>

          <Section title="5. Log Files">
            <List
              items={[
                'MI-Technologies follows a standard procedure of using log files.',
                'These files log visitors when they visit websites. All hosting companies do this and a part of hosting services’ analytics.',
                'The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable.',
                'The purpose of the information is for analysing trends, administering the site, tracking users’ movement on the website, and gathering demographic information.',
              ]}
            />
          </Section>

          <Section title="6. Third Party Privacy Policies">
            <List
              items={[
                'MI-Technologies\' Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.',
                'You can choose to disable cookies through your individual browser options. To know more detailed information about cookie management with specific web browsers, it can be found at the browsers’ respective websites.',
              ]}
            />
          </Section>

          <Section title="7. Privacy Rights">
            <p>Under this policy, consumers have the right to:</p>
            <List
              items={[
                'Request that a business that collects a consumer’s personal data disclose the categories and specific pieces of personal data that a business has collected about consumers.',
                'Request that a business delete any personal data about the consumer that a business has collected.',
                'If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.',
              ]}
            />
          </Section>

          <Section title="8. Data Protection Rights">
            <p>
              We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled
              to the following:
            </p>
            <List
              items={[
                'The right to access – You have the right to request copies of your personal data. We may charge you a small fee for this service.',
                'The right to rectification – You have the right to request that we correct any information you believe is inaccurate. You also have the right to request that we complete the information you believe is incomplete.',
                'The right to erasure – You have the right to request that we erase your personal data, under certain conditions.',
                'The right to restrict processing – You have the right to request that we restrict the processing of your personal data, under certain conditions.',
                'The right to object to processing – You have the right to object to our processing of your personal data, under certain conditions.',
                'The right to data portability – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.',
                'If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.',
              ]}
            />
          </Section>

          <Section title="9. Children’s Information">
            <List
              items={[
                'Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.',
                'MI-Technologies does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.',
              ]}
            />
          </Section>

          <Section title="10. Laws and Regulations">
            <List
              items={[
                'This privacy statement falls under the laws and regulations of the Kingdom of Saudi Arabia of consumer rights, confidential information, any laws shall apply by the court of law in the Kingdom.',
                'By logging into our websites and clicking I agree or I acknowledge the privacy policy or terms and conditions we empower MI-Technologies all the rights mentioned above and more with other cookies unless stated otherwise.',
              ]}
            />
          </Section>

          <Section title="11. Cross-Border Data Transfers">
            <p>
              Your data is primarily processed and stored on secure servers located within the Kingdom of Saudi Arabia.
            </p>
            <p>
              If we transfer your personal data outside of Saudi Arabia, we ensure a similar degree of protection is
              afforded to it by ensuring that the transfer complies with the PDPL cross-border regulatory framework (e.g.,
              utilizing standard contractual clauses approved by SDAIA or transferring to jurisdictions with an adequate
              level of protection).
            </p>
          </Section>

          <Section title="12. Data Security">
            <p>MI-Technologies applies industry-standard security practices to safeguard user data.</p>
            <List
              items={[
                'Data is stored securely on protected servers.',
                'We use encryption, authentication, and restricted access measures.',
                'Only authorized staff can access data when necessary.',
              ]}
            />
          </Section>

          <Section title="13. Data Retention">
            <p>We retain your information as long as needed for service delivery or legal compliance.</p>
            <p>Upon account deletion, we remove or anonymize personal data within 90 days.</p>
          </Section>

          <Section title="14. Policy Updates">
            <p>
              We may revise this Privacy Policy periodically. Any updates will be posted directly on this page with an
              updated "Last Updated" date.
            </p>
            <p>Any significant changes will be communicated via email or in-app notifications.</p>
            <p>Continued use of the platform constitutes your acceptance of the updated terms.</p>
          </Section>

          <Section title="15. Contact us">
            <p>
              All provisions mentioned herein regarding inquiries, modifications, deletions, or anything not provided for
              herein shall be contacted via the following address:{' '}
              <a
                href="mailto:privacy@mi-technologies.sa"
                className="font-medium text-content-link hover:text-content-link-hover"
              >
                privacy@mi-technologies.sa
              </a>
            </p>
            <p>
              <span className="font-medium text-content-primary">Address:</span> Dammam, Kingdom of Saudi Arabia
            </p>
          </Section>
        </div>
      </main>
    </div>
  )
}
