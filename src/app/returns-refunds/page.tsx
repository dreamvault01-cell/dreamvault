import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import styles from '@/components/PolicyLayout.module.css';
import { getSupportConfig } from '@/lib/support-config';

export default function ReturnsRefundsPage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return (
    <PolicyLayout
      tag="INFORMATION"
      title="Returns &"
      titleAccent="Refunds"
      subtitle="Not 100% satisfied? Here's how we make it right."
      lastUpdated="October 1, 2026"
    >
      <PolicySection id="our-promise" title="Our Promise">
        <p>At DreamVault, we stand behind the quality of every product we sell. If your order arrives damaged, defective, or significantly different from what you ordered, we&apos;ll make it right — guaranteed.</p>
      </PolicySection>
      <PolicySection id="return-window" title="Return Window">
        <p>You have <strong>7 days</strong> from the date of delivery to initiate a return. After this window, we will not be able to process your return request.</p>
      </PolicySection>
      <PolicySection id="how-to-return" title="How to Return">
        <ol className={styles.steps}>
          {[
            { step: '1', title: 'Contact Us', desc: `Email ${supportEmail} with your order ID, photos of the issue, and your preferred resolution (refund or exchange).` },
            { step: '2', title: 'Approval', desc: 'Our team reviews your request within 24 hours and sends you return instructions if approved.' },
            { step: '3', title: 'Ship It Back', desc: 'Pack the item securely and ship it using the prepaid label we provide. Return shipping is free for approved claims.' },
            { step: '4', title: 'Refund / Exchange', desc: 'Once we receive the item, your refund is processed in 5–7 business days, or a replacement is shipped immediately.' },
          ].map((item) => (
            <li key={item.step} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">{item.step}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </PolicySection>
      <PolicySection id="non-returnable-items" title="Non-Returnable Items">
        <p>Custom/personalized poster orders cannot be returned unless they arrive with manufacturing defects or shipping damage.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
