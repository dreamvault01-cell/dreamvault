import type { ComponentProps } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SignIn, SignUp } from '@clerk/nextjs';
import { ArrowLeft, ArrowUpRight, LockKeyhole } from 'lucide-react';
import styles from './AuthPage.module.css';

const appearance = {
  variables: {
    colorPrimary: 'var(--auth-gold)',
    colorPrimaryForeground: 'var(--btn-primary-text)',
    colorBackground: 'var(--bg-card)',
    colorForeground: 'var(--text-primary)',
    colorInput: 'var(--bg-primary)',
    colorInputForeground: 'var(--text-primary)',
    colorMuted: 'var(--bg-secondary)',
    colorMutedForeground: 'var(--text-secondary)',
    colorNeutral: 'var(--text-primary)',
    colorBorder: 'var(--border-light)',
    colorRing: 'var(--accent-gold)',
    fontFamily: 'var(--font-sans)',
    fontFamilyButtons: 'var(--font-sans)',
    borderRadius: '5px',
  },
  elements: {
    rootBox: styles.clerkRoot,
    cardBox: styles.clerkCardBox,
    card: styles.clerkCard,
    headerTitle: styles.clerkTitle,
    headerSubtitle: styles.clerkSubtitle,
    socialButtonsBlockButton: styles.socialButton,
    formFieldInput: styles.formInput,
    formButtonPrimary: styles.primaryButton,
    footer: styles.clerkFooter,
    footerActionLink: styles.footerLink,
    formFieldAction: styles.footerLink,
  },
} satisfies NonNullable<ComponentProps<typeof SignIn>['appearance']>;

export default function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const signingIn = mode === 'sign-in';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topline}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={14} aria-hidden="true" /> Back to RareDaze
          </Link>
          <span className={styles.edition}>Art for the way you live.</span>
        </div>

        <div className={styles.grid}>
          <section className={styles.welcome} aria-labelledby="account-heading">
            <span className={styles.eyebrow}><span className={styles.dot} /> Your little corner of RareDaze</span>
            <h1 id="account-heading">
              {signingIn ? 'Make yourself' : 'A little art.'}<br />
              <em>{signingIn ? 'at home.' : 'A world of you.'}</em>
            </h1>
            <p className={styles.intro}>
              {signingIn
                ? 'Welcome back to a world of thoughtful art and spaces that feel like you.'
                : 'Find your next favorite print. Create an account and make room for a little inspiration.'}
            </p>

            <figure className={styles.artwork}>
              <Image
                src="/images/about/sanctuary.jpg"
                alt="A warm, thoughtfully styled living space with contemporary wall art"
                fill
                preload
                sizes="(max-width: 800px) 92vw, (max-width: 1300px) 48vw, 560px"
              />
              <figcaption>
                <span>A sense of belonging.</span>
                <span>RareDaze <span aria-hidden="true">/</span> Everyday inspiration</span>
              </figcaption>
            </figure>

            <div className={styles.welcomeFooter}>
              <span>Thoughtfully curated. Personally yours.</span>
              <Link href="/about">Our story <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
          </section>

          <section className={styles.account} aria-label={signingIn ? 'Sign in to your account' : 'Create your account'}>
            <div className={styles.accountIntro}>
              <span className={styles.eyebrow}>{signingIn ? 'A familiar place' : 'Your story starts here'}</span>
              <span className={styles.accountIndex} aria-hidden="true">RD / {signingIn ? '01' : '02'}</span>
            </div>
            <div className={styles.formContainer}>
              {signingIn ? <SignIn appearance={appearance} /> : <SignUp appearance={appearance} />}
            </div>
            <div className={styles.securityNote}>
              <LockKeyhole size={13} strokeWidth={1.5} aria-hidden="true" />
              <p>Your account, kept secure. <Link href="/privacy-policy">Your privacy matters.</Link></p>
            </div>
            <div className={styles.support}>
              <span>A little help getting started?</span>
              <Link href="/contact">Talk to us <ArrowUpRight size={13} aria-hidden="true" /></Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
