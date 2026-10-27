'use client';

import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { CONTACT_LIMITS, validateContactSubmission, type ContactField, type ContactFieldErrors, type ContactFormData } from '@/lib/contact';

export default function ContactPage() {
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
    <div style={{ paddingTop: '10px' }}>
      {/* Hero */}
      <section
        style={{
          padding: 'clamp(3rem, 8vw, 6rem) 0',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '700px' }}>
          <div className="hero-tag" style={{ margin: '0 auto 1.5rem' }}>GET IN TOUCH</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '1rem' }}>
            Contact <span className="accent">Us</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', lineHeight: 1.8 }}>
            Have a question, feedback, or just want to say hello? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '3rem', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Contact Info */}
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--text-primary)' }}>
                Let&apos;s <span className="accent">Connect</span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[
                  { icon: <Mail size={20} />, label: 'Email', value: 'hello@dreamvault.in', href: 'mailto:hello@dreamvault.in' },
                  { icon: <Phone size={20} />, label: 'Phone', value: '+91 98765 43210', href: 'tel:+919876543210' },
                  { icon: <MapPin size={20} />, label: 'Address', value: 'Mumbai, Maharashtra, India', href: undefined },
                  { icon: <Clock size={20} />, label: 'Hours', value: 'Mon – Sat, 10am – 7pm IST', href: undefined },
                  { icon: <MessageCircle size={20} />, label: 'Response Time', value: 'Within 24 hours', href: undefined },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent-gold)', flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        {item.label}
                      </div>
                      {item.href ? (
                        <a href={item.href} style={{ color: 'var(--text-primary)', fontSize: '0.9rem', transition: 'color 0.2s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-gold)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                        >{item.value}</a>
                      ) : (
                        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
              borderRadius: '16px', padding: '2rem',
            }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                Send a Message
              </h2>
              {reference && (
                <div role="status" aria-live="polite" style={{
                  background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem',
                  color: '#22c55e', fontSize: '0.85rem', textAlign: 'center',
                }}>
                  ✓ Your message has been received. We&apos;ll reply to the email you provided.
                  <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', overflowWrap: 'anywhere' }}>
                    Reference: {reference}
                  </span>
                </div>
              )}
              {error && (
                <div role="alert" style={{ padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--accent-rose)', borderRadius: '10px', color: 'var(--accent-rose)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
                <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                  <label htmlFor="contact-website">Leave this field empty</label>
                  <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <fieldset disabled={isSubmitting} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                {(['name', 'email', 'subject'] as const).map((field) => (
                  <div key={field}>
                    <label htmlFor={`contact-${field}`} style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                    id={`contact-${field}`}
                    name={field}
                    type={field === 'email' ? 'email' : 'text'}
                    placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                    autoComplete={field === 'subject' ? 'off' : field}
                    required
                    minLength={CONTACT_LIMITS[field].min}
                    maxLength={CONTACT_LIMITS[field].max}
                    aria-invalid={Boolean(fieldErrors[field])}
                    aria-describedby={fieldErrors[field] ? `contact-${field}-error` : undefined}
                    value={formData[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem', borderRadius: '10px',
                      border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.88rem', fontFamily: 'inherit',
                      outline: 'none', transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent-gold)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
                  />
                    {fieldErrors[field] && <p id={`contact-${field}-error`} style={{ color: 'var(--accent-rose)', fontSize: '0.75rem', marginTop: '0.4rem' }}>{fieldErrors[field]}</p>}
                  </div>
                ))}
                <div>
                <label htmlFor="contact-message" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  placeholder="Your message..."
                  required
                  minLength={CONTACT_LIMITS.message.min}
                  maxLength={CONTACT_LIMITS.message.max}
                  aria-invalid={Boolean(fieldErrors.message)}
                  aria-describedby={fieldErrors.message ? 'contact-message-error' : 'contact-message-hint'}
                  rows={4}
                  value={formData.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem', borderRadius: '10px',
                    border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.88rem', fontFamily: 'inherit',
                    outline: 'none', resize: 'vertical', transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent-gold)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
                />
                {fieldErrors.message && <p id="contact-message-error" style={{ color: 'var(--accent-rose)', fontSize: '0.75rem', marginTop: '0.4rem' }}>{fieldErrors.message}</p>}
                <p id="contact-message-hint" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'right', marginTop: '0.4rem' }}>{formData.message.length} / {CONTACT_LIMITS.message.max}</p>
                </div>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Sending your message…' : 'Send Message'}
                </button>
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
