import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import styles from '@/components/PolicyLayout.module.css';
import { getSupportConfig } from '@/lib/support-config';

export default function ReturnsRefundsPage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return <PolicyLayout tag="INFORMATION" title="Returns &" titleAccent="Refunds" subtitle="If something is wrong with your order, here is the straightforward way to ask for help." lastUpdated="October 1, 2026">
    <PolicySection id="our-promise" title="Our Promise">
      <p>If an order arrives damaged, defective, or materially different from what you ordered, contact us and we will review the issue with you.</p>
    </PolicySection>
    <PolicySection id="return-window" title="Return Window">
      <p>Please contact us within <strong>7 days</strong> of delivery and include your order reference plus clear photos of the issue.</p>
    </PolicySection>
    <PolicySection id="how-to-return" title="How to Request Help">
      <ol className={styles.steps}>
        {[
          { step: '1', title: 'Contact Us', desc: `Email ${supportEmail} with your order reference, photos of the issue, and your preferred resolution.` },
          { step: '2', title: 'Review', desc: 'We review the request and confirm the next step by email.' },
          { step: '3', title: 'Return Instructions', desc: 'If a return is needed, we will confirm the return instructions and any shipping arrangement before you send the item.' },
          { step: '4', title: 'Refund or Replacement', desc: 'Once the return is received and inspected, we will confirm any refund or replacement with you.' },
        ].map((item) => <li key={item.step} className={styles.step}><span className={styles.stepNumber} aria-hidden="true">{item.step}</span><div><h3>{item.title}</h3><p>{item.desc}</p></div></li>)}
      </ol>
    </PolicySection>
    <PolicySection id="non-returnable-items" title="Non-Returnable Items">
      <p>Personalized items, once available, may only be eligible for a return where they arrive damaged, defective, or materially different from the approved specification.</p>
    </PolicySection>
  </PolicyLayout>;
}
