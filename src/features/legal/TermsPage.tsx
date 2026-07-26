import { LegalPage, Section, List } from './LegalDocument'

/** A mailto/website link styled like the rest of the document body. */
function DocLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel="noopener noreferrer"
      className="font-medium text-content-link hover:text-content-link-hover"
    >
      {children}
    </a>
  )
}

const SITE = <DocLink href="https://www.mi-mony.sa">www.mi-mony.sa</DocLink>
const SUPPORT = <DocLink href="mailto:support@mi-mony.sa">support@mi-mony.sa</DocLink>

/**
 * TermsPage — the MI-Mony Terms of Use and Conditions, rendered in-app at `/terms`.
 * A standalone public document (see {@link LegalPage}); opened in a new tab from the register
 * agree-terms link so a user in the wizard never loses their progress.
 */
export function TermsPage() {
  return (
    <LegalPage
      title="MI-Mony Terms of Use and Conditions"
      updated="July 15, 2026"
      note="Disclaimer: Note this is a temporary document, and an updated version (compliant with local laws) will be provided later."
    >
      <Section title="1. Definitions">
        <List
          items={[
            <>
              <span className="font-medium text-content-primary">Platform / MI-Mony:</span> Refers to MI-Mony, operated
              by MI-Technology, based in Dhahran, Kingdom of Saudi Arabia, with the official website {SITE}.
            </>,
            <>
              <span className="font-medium text-content-primary">User / Client / Buyer:</span> Any individual or entity
              registered to use MI-Mony's services as a buyer.
            </>,
            <>
              <span className="font-medium text-content-primary">Supplier:</span> Any party offering products for sale
              through the platform.
            </>,
            <>
              <span className="font-medium text-content-primary">Products:</span> B2B Marketplace application for Saudi
              construction-materials sector listed on the platform.
            </>,
            <>
              <span className="font-medium text-content-primary">Agreement:</span> This Terms of Use document and its
              future amendments.
            </>,
          ]}
        />
      </Section>

      <Section title="2. Acceptance and Use">
        <List
          items={[
            'By accessing or registering on MI-Mony, you agree to these Terms of Use.',
            <>
              MI-Technologies reserves the right to modify this Agreement at any time. Updates take effect once
              published on {SITE}.
            </>,
            'Continued use implies acceptance of any updated version.',
          ]}
        />
      </Section>

      <Section title="3. Registration &amp; Accounts">
        <List
          items={[
            'Users must provide accurate information, maintain confidentiality, and are responsible for all activities under their accounts.',
            'MI-Technologies reserves the right to suspend or terminate accounts in case of misuse or violations.',
          ]}
        />
      </Section>

      <Section title="4. Services &amp; Transactions">
        <List
          items={[
            'MI-Mony acts as a digital marketplace connecting suppliers and buyers for Saudi construction-materials sector transactions.',
            'MI-Technologies is not a party to any sale contract between suppliers and buyers.',
            'Prices and offers are set solely by suppliers.',
          ]}
        />
      </Section>

      <Section title="5. Purchasing &amp; Payment">
        <List
          items={[
            'Orders are placed through the platform and are subject to supplier confirmation.',
            'Payment methods may include cash, bank transfer, or deferred payment (if applicable).',
            'All taxes and fees will be disclosed prior to purchase.',
          ]}
        />
      </Section>

      <Section title="6. Returns &amp; Refunds">
        <List
          items={[
            'Return policies vary per supplier and product type.',
            <>Faulty or non-conforming products can be reported to {SUPPORT}.</>,
            'MI-Technologies is not liable for any delay or supplier failure to process returns.',
          ]}
        />
      </Section>

      <Section title="7. User Responsibilities">
        <List
          items={[
            'Users must comply with applicable laws and refrain from misusing the platform.',
            'MI-Technologies is not liable for technical issues or service interruptions.',
          ]}
        />
      </Section>

      <Section title="8. Intellectual Property">
        <p>
          All intellectual property related to the platform — including MI-Technologies trademarks, logos, content, and
          software — belong to MI-Technologies Limited Company.
        </p>
      </Section>

      <Section title="9. Disclaimer">
        <p>
          MI-Technologies is not liable for product quality, supplier performance, or transaction outcomes between
          users.
        </p>
      </Section>

      <Section title="10. Account Termination">
        <List
          items={[
            'MI-Technologies may suspend or terminate any account violating these terms.',
            <>Users can request account deletion via {SUPPORT}.</>,
          ]}
        />
      </Section>

      <Section title="11. Privacy Policy">
        <p>User data is handled per MI-Technology's Privacy Policy, available at {SITE}.</p>
      </Section>

      <Section title="12. Governing Law">
        <p>
          This Agreement is governed by the laws of the Kingdom of Saudi Arabia, with exclusive jurisdiction for the
          courts of Eastern region, Saudi Arabia.
        </p>
      </Section>
    </LegalPage>
  )
}
