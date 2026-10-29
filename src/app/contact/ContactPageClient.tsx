'use client';

import { ArrowRight, ArrowUpRight, Check, CircleAlert, HelpCircle, LoaderCircle, Mail, MessageCircle, Package, Ruler, Sparkles, Truck, Undo2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './contact.module.css';
import { useRef, useState } from 'react';
import { CONTACT_LIMITS, validateContactSubmission, type ContactField, type ContactFieldErrors, type ContactFormData } from '@/lib/contact';

export default function ContactPageClient({ supportEmail, developmentMode }: { supportEmail: string; developmentMode: boolean }) {
  const [formData, setFormData] = useState<ContactFormData>({ name: '', email: '', subject: '', message: '' });
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [website, setWebsite] = useState('');
  const inFlight = useRef(false);
  const submissionId = useRef<string | null>(null);

  const updateField = (field: ContactField, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setError('');
    setReference(null);
    submissionId.current = null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inFlight.current) return;
    submissionId.current ??= crypto.randomUUID();
    const payload = { ...formData, submissionId: submissionId.current, website };
    const validation = validateContactSubmission(payload);
    setReference(null);
    setError('');
    setFieldErrors({});
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors ?? {});
      setError(validation.error);
      const firstField = Object.keys(validation.fieldErrors ?? {})[0];
      if (firstField) document.getElementById(`contact-${firstField}`)?.focus();
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.success !== true || typeof result.reference !== 'string') {
        setFieldErrors(result.fieldErrors ?? {});
        throw new Error(typeof result.error === 'string' ? result.error : 'Your message could not be sent. Please try again.');
      }
      setReference(result.reference);
      setFormData({ name: '', email: '', subject: '', message: '' });
      submissionId.current = null;
    } catch (failure) {
      setError(controller.signal.aborted
        ? 'The request took too long. Your message is still in the form. Please try again.'
        : failure instanceof Error && failure.message !== 'Failed to fetch'
          ? failure.message
          : 'We could not connect. Please check your connection and try again. Your message is still in the form.');
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div className={styles.topline}>
            <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Contact</span></nav>
            <span className={styles.eyebrow}><span className={styles.dot} /> A conversation starts here</span>
          </div>
          <div className={styles.heroGrid}>
            <h1>Let’s start<br /><em>with a hello.</em></h1>
            <div className={styles.heroAside}>
              <span className={styles.eyebrow}>The human side of DreamVault</span>
              <p>A question, an idea, a print you can’t stop thinking about. We’d love to hear from you.</p>
              <a href="#contact-form" className={styles.textLink}>Drop us a note <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </header>

        <div className={styles.contactGrid}>
          <aside className={styles.contactAside} aria-label="Get in touch with DreamVault">
            <figure className={styles.artwork}>
              <Image src="/images/about/sanctuary.jpg" alt="A warm living room with a thoughtfully curated gallery wall" fill preload sizes="(max-width: 850px) 92vw, 500px" />
              <figcaption><span className={styles.imageEyebrow}>A little inspiration, every day.</span><span>Good spaces.<br /><em>Better conversations.</em></span></figcaption>
              <span className={styles.imageSignature} aria-hidden="true">DV</span>
            </figure>
            <div className={styles.asideHeading}><span className={styles.eyebrow}>Here to help</span><h2>A personal touch.<br />Every step of the way.</h2><p>From finding the right print to a question about your order, let’s make it a little easier.</p></div>
            <a href={`mailto:${supportEmail}`} className={styles.contactLink}>
              <span className={styles.contactIcon}><Mail size={19} strokeWidth={1.5} aria-hidden="true" /></span>
              <span><span className={styles.detailLabel}>Write to us</span><span className={styles.detailValue}>{supportEmail}</span></span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <div className={styles.practicalDetails}>
              <p><Mail size={15} aria-hidden="true" /><span>We reply to the email address you provide, so your conversation stays together.</span></p>
            </div>
          </aside>

          <section id="contact-form" className={styles.formCard} aria-labelledby="form-heading">
            <div className={styles.formTopline}><span className={styles.eyebrow}>A note to DreamVault</span><MessageCircle size={20} strokeWidth={1.3} aria-hidden="true" /></div>
            <h2 id="form-heading">What’s on your mind?</h2>
            <p className={styles.formIntro}>Tell us a little about it. We’ll take it from here.</p>
            {developmentMode && <p className={styles.formIntro}><small>Development preview: messages are saved; email delivery is currently limited to our test inbox.</small></p>}
            {reference && (
              <div className={styles.success} role="status" aria-live="polite">
                <span className={styles.successIcon}><Check size={19} aria-hidden="true" /></span>
                <div><strong>Your message is with us.</strong><p>We’ve received your note. Keep your reference handy for any follow-up.</p><span className={styles.reference}>Reference: {reference}</span></div>
              </div>
            )}
            {error && <div role="alert" className={styles.error}><CircleAlert size={18} aria-hidden="true" /><p>{error}</p></div>}

            <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
              <div aria-hidden="true" className={styles.honeypot}>
                <label htmlFor="contact-website">Leave this field empty</label>
                <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <fieldset disabled={isSubmitting} className={styles.fieldset}>
                <div className={styles.topics}>
                  <span className={styles.topicLabel}>A little direction <span>optional</span></span>
                  <div className={styles.topicOptions} aria-label="Suggested message subjects">
                    {[
                      { label: 'My order', icon: Package },
                      { label: 'Choosing a print', icon: Ruler },
                      { label: 'Something else', icon: Sparkles },
                    ].map(({ label, icon: Icon }) => (
                      <button type="button" key={label} aria-pressed={formData.subject === label} className={styles.topicButton} onClick={() => updateField('subject', formData.subject === label ? '' : label)}><Icon size={14} strokeWidth={1.5} aria-hidden="true" />{label}</button>
                    ))}
                  </div>
                </div>

                <div className={styles.fields}>
                  {(['name', 'email', 'subject'] as const).map((field) => (
                    <div key={field} className={field === 'subject' ? styles.fullWidth : undefined}>
                      <label className={styles.fieldLabel} htmlFor={'contact-' + field}>{field === 'name' ? 'Your name' : field === 'email' ? 'Email address' : 'Subject'}<span aria-hidden="true"> *</span></label>
                      <input
                        id={'contact-' + field}
                        name={field}
                        type={field === 'email' ? 'email' : 'text'}
                        placeholder={field === 'name' ? 'Your full name' : field === 'email' ? 'you@example.com' : 'A few words about your message'}
                        autoComplete={field === 'subject' ? 'off' : field}
                        required
                        minLength={CONTACT_LIMITS[field].min}
                        maxLength={CONTACT_LIMITS[field].max}
                        aria-invalid={Boolean(fieldErrors[field])}
                        aria-describedby={fieldErrors[field] ? 'contact-' + field + '-error' : undefined}
                        value={formData[field]}
                        onChange={(e) => updateField(field, e.target.value)}
                        className={styles.input}
                      />
                      {fieldErrors[field] && <p id={'contact-' + field + '-error'} className={styles.fieldError}>{fieldErrors[field]}</p>}
                    </div>
                  ))}
                  <div className={styles.fullWidth}>
                    <div className={styles.messageLabel}><label className={styles.fieldLabel} htmlFor="contact-message">Your message<span aria-hidden="true"> *</span></label><span>A little detail goes a long way.</span></div>
                    <textarea
                      id="contact-message"
                      name="message"
                      placeholder="Tell us what you have in mind. If it’s about an order, include your order ID."
                      required
                      minLength={CONTACT_LIMITS.message.min}
                      maxLength={CONTACT_LIMITS.message.max}
                      aria-invalid={Boolean(fieldErrors.message)}
                      aria-describedby={fieldErrors.message ? 'contact-message-error contact-message-hint' : 'contact-message-hint'}
                      rows={5}
                      value={formData.message}
                      onChange={(e) => updateField('message', e.target.value)}
                      className={styles.textarea}
                    />
                    {fieldErrors.message && <p id="contact-message-error" className={styles.fieldError}>{fieldErrors.message}</p>}
                    <p id="contact-message-hint" className={styles.characterCount}>{formData.message.length.toLocaleString()} <span>/ {CONTACT_LIMITS.message.max.toLocaleString()}</span></p>
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                  <span>{isSubmitting ? 'Sending your message…' : 'Send your message'}</span>
                  {isSubmitting ? <LoaderCircle size={19} className={styles.spinner} aria-hidden="true" /> : <ArrowUpRight size={21} strokeWidth={1.6} aria-hidden="true" />}
                </button>
              </fieldset>
              <p className={styles.formFootnote}>Your details help us get back to you.<Link href="/privacy-policy">Privacy policy <ArrowUpRight size={11} aria-hidden="true" /></Link></p>
            </form>
          </section>
        </div>

        <section className={styles.helpSection} aria-labelledby="help-heading">
          <div className={styles.helpHeader}><div><span className={styles.eyebrow}>A little clarity</span><h2 id="help-heading">The answer might be right here.</h2></div><Link href="/faq" className={styles.textLink}>All the FAQs <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          <div className={styles.helpLinks}>
            {[
              { href: '/faq', icon: HelpCircle, title: 'Good questions. Clear answers.', text: 'Paper, sizing, payments, and the little details.' },
              { href: '/shipping-delivery', icon: Truck, title: 'From our hands to your walls.', text: 'A closer look at shipping and delivery.' },
              { href: '/returns-refunds', icon: Undo2, title: 'Let’s make it right.', text: 'Everything about returns and refunds.' },
            ].map(({ href, icon: Icon, title, text }) => (
              <Link href={href} className={styles.helpLink} key={href}><Icon size={22} strokeWidth={1.3} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={17} aria-hidden="true" /></Link>
            ))}
          </div>
        </section>
        <div className={styles.signoff}><span>Thoughtfully made. Personally yours.</span><span>Dream<span>Vault</span></span></div>
      </div>
    </div>
  );
}
