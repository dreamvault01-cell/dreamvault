import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './SupportPage.module.css';

interface SupportPageProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  breadcrumb: string;
  meta?: ReactNode;
  children: ReactNode;
}

export default function SupportPage({ eyebrow, title, description, breadcrumb, meta, children }: SupportPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span>
            {breadcrumb !== 'Help & information' && <><Link href="/faq">Help</Link><span aria-hidden="true">/</span></>}
            <span aria-current="page">{breadcrumb}</span>
          </nav>
          <div className={`${styles.heroContent}${meta ? ` ${styles.withMeta}` : ''}`}>
            <div className={styles.heroCopy}><span className={styles.eyebrow}><span />{eyebrow}</span><h1>{title}</h1><p className={styles.description}>{description}</p></div>
            {meta && <div className={styles.meta}>{meta}</div>}
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
