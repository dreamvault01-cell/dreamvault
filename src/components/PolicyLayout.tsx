'use client';

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
  children: React.ReactNode;
}) {
  return (
    <div style={{ paddingTop: '10px' }}>
      <section
        style={{
          padding: 'clamp(3rem, 8vw, 6rem) 0',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '700px' }}>
          <div className="hero-tag" style={{ margin: '0 auto 1.5rem' }}>{tag}</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '1rem' }}>
            {title} <span className="accent">{titleAccent}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', lineHeight: 1.8 }}>
            {subtitle}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '1rem' }}>
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="policy-content">{children}</div>
        </div>
      </section>
    </div>
  );
}
