import { BRAND_NAME } from '@/lib/brand';
import styles from './BrandLogo.module.css';

/** The same transparent artwork is recoloured with the site's light/dark tokens. */
export default function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`${styles.logo} ${className}`} role="img" aria-label={BRAND_NAME}>
      <span className={styles.wordmark} aria-hidden="true" />
    </span>
  );
}
