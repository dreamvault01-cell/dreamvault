import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Compass } from 'lucide-react';
import SupportPage from '@/components/SupportPage';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <SupportPage eyebrow="A little detour" title={<>A little off course.<br /><em>Still in good company.</em></>} description="This page seems to have wandered. Let’s find you a more inspiring direction." breadcrumb="Page not found" meta={<span>Page / 404</span>}>
      <section className={styles.card} aria-labelledby="not-found-heading">
        <span className={styles.number} aria-hidden="true">404</span>
        <div className={styles.copy}><Compass size={30} strokeWidth={1.2} aria-hidden="true" /><h2 id="not-found-heading">Let’s get you back<br />to something lovely.</h2><p>The link may have changed, or the page may no longer be here. Your next discovery is just a click away.</p><Link href="/">Back to RareDaze <ArrowRight size={18} aria-hidden="true" /></Link><Link href="/faq" className={styles.secondary}>Looking for a little help? <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      </section>
    </SupportPage>
  );
}
