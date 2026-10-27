import { Children, isValidElement, type ReactNode } from 'react';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import SupportPage from '@/components/SupportPage';
import styles from './PolicyLayout.module.css';

type PolicySectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

export function PolicySection({ id, title, children }: PolicySectionProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  );
}

export default function PolicyLayout({
  tag,
  title,
  titleAccent,
  subtitle,
  lastUpdated,
  children,
}: {
  tag: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  const sections = Children.toArray(children)
    .filter((child) => isValidElement<PolicySectionProps>(child))
    .map((child) => ({ id: child.props.id, title: child.props.title }));

  return (
    <SupportPage
      eyebrow={tag}
      title={<>{title} <em>{titleAccent}</em></>}
      description={subtitle}
      breadcrumb={`${title} ${titleAccent}`}
      meta={<span className={styles.updated}><CalendarDays size={13} aria-hidden="true" />Last updated: {lastUpdated}</span>}
    >
      <div className={styles.layout} id="policy-top">
        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            <nav className={styles.contents} aria-label="On this page">
              <p className={styles.label}>On this page</p>
              <ol>
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>
                      <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </aside>

        <article className={styles.document} aria-label={`${title} ${titleAccent}`}>
          <div className={styles.documentHeader}>
            <span>{tag === 'LEGAL' ? 'The fine print' : 'The essentials'}</span>
            <span>{String(sections.length).padStart(2, '0')} sections</span>
          </div>
          {children}
          <a className={styles.backToTop} href="#policy-top">Back to top <ArrowUpRight size={14} aria-hidden="true" /></a>
        </article>
      </div>
    </SupportPage>
  );
}
