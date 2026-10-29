import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import { getSupportConfig } from '@/lib/support-config';

export default function PrivacyPolicyPage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return (
    <PolicyLayout
      tag="LEGAL"
      title="Privacy"
      titleAccent="Policy"
      subtitle="A plain-language explanation of the information needed to run DreamVault and fulfil an order."
      lastUpdated="October 1, 2026"
    >
      <PolicySection id="information-we-collect" title="Information We Collect">
        <p>We collect the information you choose to provide when you create an account, place an order, contact us, or request support. This can include your name, email address, phone number, delivery address, order details, and the contents of your message.</p>
      </PolicySection>
      <PolicySection id="payments" title="Payments">
        <p>Online payments are handled by Razorpay. DreamVault receives the payment reference and status needed to confirm your order; we do not store complete card, bank, or UPI credentials in this website.</p>
      </PolicySection>
      <PolicySection id="how-we-use-your-information" title="How We Use Your Information">
        <p>We use order and contact information to process purchases, arrange delivery, provide support, prevent misuse, and meet applicable legal obligations. We do not use your details for marketing unless you separately choose to receive it.</p>
      </PolicySection>
      <PolicySection id="information-sharing" title="When Information Is Shared">
        <p>We share only the information necessary to provide the service you request: for example, with our payment provider for a payment and with a courier after an order is ready to ship. We do not sell personal information.</p>
      </PolicySection>
      <PolicySection id="security" title="Keeping Information Safe">
        <p>We use access controls and secure connections provided by this service and its providers to protect information in transit and at rest. No online system can guarantee absolute security, so please contact us promptly if you believe your account or order information has been misused.</p>
      </PolicySection>
      <PolicySection id="cookies" title="Cookies and Session Data">
        <p>The site and its authentication provider use essential session data to keep you signed in and operate the checkout. You can manage browser cookies in your browser settings. If optional analytics or marketing tools are added later, this policy will be updated before they are used.</p>
      </PolicySection>
      <PolicySection id="your-rights" title="Your Choices">
        <p>You may contact us to ask about access to, correction of, or deletion of the personal information connected to your order. Some information may need to be retained for accounting, fraud prevention, or other legal reasons.</p>
      </PolicySection>
      <PolicySection id="contact-us" title="Contact Us">
        <p>For privacy questions or requests, email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
