import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import { getSupportConfig } from '@/lib/support-config';

export default function ShippingPolicyPage() {
  const supportEmail = getSupportConfig().supportEmail || 'support@soliheleug.resend.app';
  return (
    <PolicyLayout
      tag="POLICIES"
      title="Shipping"
      titleAccent="Policy"
      subtitle="We're committed to delivering your art safely and on time. Here's everything you need to know about our shipping process."
      lastUpdated="October 1, 2026"
    >
      <PolicySection id="processing-time" title="Processing Time">
        <p>All orders are processed within 1–2 business days (excluding weekends and public holidays). You will receive a confirmation email with tracking details once your order has shipped.</p>
      </PolicySection>
      <PolicySection id="shipping-rates" title="Shipping Rates">
        <p><strong>Free Standard Shipping</strong> on all orders above ₹499. For orders below ₹499, a flat shipping fee of ₹79 applies. Express shipping (2–3 business days) is available at checkout for ₹149.</p>
      </PolicySection>
      <PolicySection id="delivery-timeframes" title="Delivery Timeframes">
        <p><strong>Standard Delivery:</strong> 5–7 business days across India.</p>
        <p><strong>Express Delivery:</strong> 2–3 business days (available in select cities).</p>
        <p>Delivery times may vary during festive seasons, sales, or due to unforeseen circumstances. We&apos;ll notify you of any delays via email.</p>
      </PolicySection>
      <PolicySection id="packaging" title="Packaging">
        <p>Each poster is carefully rolled in a protective tube or packed flat with rigid cardboard backing to prevent bending, creasing, or water damage during transit. We take extra care to ensure your art arrives in pristine condition.</p>
      </PolicySection>
      <PolicySection id="shipping-partners" title="Shipping Partners">
        <p>We work with India&apos;s leading logistics partners including Delhivery, BlueDart, and India Post to ensure reliable and trackable deliveries across all pin codes.</p>
      </PolicySection>
      <PolicySection id="international-shipping" title="International Shipping">
        <p>Currently, we only ship within India. International shipping is coming soon — sign up for our newsletter to be notified when we expand globally.</p>
      </PolicySection>
      <PolicySection id="damaged-or-lost-shipments" title="Damaged or Lost Shipments">
        <p>If your order arrives damaged or is lost in transit, please contact us within 48 hours at <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with your order ID and photos. We&apos;ll arrange a free replacement or full refund.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
