import PolicyLayout, { PolicySection } from '@/components/PolicyLayout';
import styles from '@/components/PolicyLayout.module.css';

export default function ShippingDeliveryPage() {
  return (
    <PolicyLayout
      tag="INFORMATION"
      title="Shipping &"
      titleAccent="Delivery"
      subtitle="Everything you need to know about how we get your art to your doorstep."
      lastUpdated="October 1, 2026"
    >
      <PolicySection id="delivery-zones-and-timeframes" title="Delivery Zones & Timeframes">
        <div className={styles.tableWrap} role="region" aria-label="Delivery zones, timeframes and costs" tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr>
                {['Zone', 'Estimated Delivery', 'Standard Cost', 'Express Cost'].map((h) => (
                  <th key={h} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Metro Cities', '3–5 days', 'Free (₹499+)', '₹149'],
                ['Tier 2 Cities', '5–7 days', 'Free (₹499+)', '₹149'],
                ['Rural Areas', '7–10 days', '₹79', '₹199'],
                ['North East', '7–12 days', '₹99', '₹249'],
              ].map(([zone, time, std, exp], i) => (
                <tr key={i}>
                  <td>{zone}</td>
                  <td>{time}</td>
                  <td>{std}</td>
                  <td>{exp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PolicySection>
      <PolicySection id="how-we-pack-your-art" title="How We Pack Your Art">
        <p>Every poster is printed on premium 300 GSM art card stock, then carefully packed in a rigid cardboard mailer or protective tube to ensure it arrives without bends, creases, or damage. We also add a moisture-resistant inner sleeve for extra protection.</p>
      </PolicySection>
      <PolicySection id="order-tracking" title="Order Tracking">
        <p>Once your order ships, you&apos;ll receive an email and SMS with a live tracking link. You can also visit our <a href="/track-order">Track Your Order</a> page and enter your Order ID to check real-time status.</p>
      </PolicySection>
      <PolicySection id="need-help" title="Need Help?">
        <p>If you have any questions about shipping or delivery, contact us at <a href="mailto:hello@dreamvault.in">hello@dreamvault.in</a> or call +91 98765 43210.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
