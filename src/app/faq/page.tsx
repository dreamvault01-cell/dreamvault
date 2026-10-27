'use client';

import { useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import SupportPage from '@/components/SupportPage';
import styles from './faq.module.css';

const faqs = [
  {
    category: 'Orders & Shipping',
    questions: [
      {
        q: 'How long does delivery take?',
        a: 'We typically process orders within 1–2 business days. Standard delivery takes 5–7 business days across India. Express shipping (2–3 days) is available at checkout for an additional fee.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Currently, we only ship within India. We are working on expanding to international markets soon. Sign up for our newsletter to stay updated!',
      },
      {
        q: 'How can I track my order?',
        a: 'Once your order ships, you\'ll receive a tracking link via email and SMS. You can also track your order from the "Track Your Order" page using your order ID.',
      },
      {
        q: 'What are the shipping charges?',
        a: 'We offer free standard shipping on all orders above ₹499. For orders below ₹499, a flat shipping fee of ₹79 applies.',
      },
    ],
  },
  {
    category: 'Products & Quality',
    questions: [
      {
        q: 'What paper quality do you use?',
        a: 'We use premium 300 GSM art card stock with a rich matte finish. Our prints are vibrant, long-lasting, and designed to look stunning on any wall.',
      },
      {
        q: 'What sizes are available?',
        a: 'Our posters are available in A4 (8.3 × 11.7 in), A3 (11.7 × 16.5 in), and A2 (16.5 × 23.4 in). Select sizes are also available in custom dimensions.',
      },
      {
        q: 'Are frames included?',
        a: 'Posters are sold unframed to keep them affordable and to give you the flexibility to choose a frame that matches your decor. We may offer framing options in the future.',
      },
      {
        q: 'Can I request a custom poster?',
        a: 'Absolutely! Visit our Custom Poster page to submit your design idea. Our team will work with you to create a one-of-a-kind piece tailored to your vision.',
      },
    ],
  },
  {
    category: 'Returns & Refunds',
    questions: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns within 7 days of delivery if the product is damaged, defective, or not as described. Custom orders are non-returnable.',
      },
      {
        q: 'How do I initiate a return?',
        a: 'Contact us at hello@dreamvault.in with your order ID and photos of the issue. We\'ll process your return within 24 hours.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Refunds are processed within 5–7 business days after we receive and inspect the returned item. The amount will be credited to your original payment method.',
      },
    ],
  },
  {
    category: 'Payment & Security',
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit/debit cards (Visa, Mastercard, RuPay), UPI, net banking, and popular wallets through Razorpay — India\'s most trusted payment gateway.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes. All transactions are processed through Razorpay with 256-bit SSL encryption. We never store your card details on our servers.',
      },
      {
        q: 'Do you offer Cash on Delivery?',
        a: 'Currently, we do not offer COD. We support all digital payment methods to ensure a seamless and secure checkout experience.',
      },
    ],
  },
];

export default function FAQPage() {
  const [query, setQuery] = useState('');
  const [openItems, setOpenItems] = useState<string[]>(['0-0']);
  const searchInput = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const sections = faqs.map((section, sectionIndex) => ({
    ...section,
    sectionIndex,
    questions: section.questions
      .map((item, questionIndex) => ({ ...item, id: `${sectionIndex}-${questionIndex}` }))
      .filter((item) => `${item.q} ${item.a}`.toLocaleLowerCase().includes(normalizedQuery)),
  }));
  const resultCount = sections.reduce((count, section) => count + section.questions.length, 0);

  const toggle = (id: string) => {
    setOpenItems((current) => current.includes(id)
      ? current.filter((openId) => openId !== id)
      : [...current, id]);
  };

  const updateSearch = (value: string) => {
    setQuery(value);
    const nextQuery = value.trim().toLocaleLowerCase();
    setOpenItems(nextQuery
      ? faqs.flatMap((section, sectionIndex) => section.questions.flatMap((item, questionIndex) =>
        `${item.q} ${item.a}`.toLocaleLowerCase().includes(nextQuery) ? [`${sectionIndex}-${questionIndex}`] : []))
      : ['0-0']);
  };

  const resetSearch = () => {
    updateSearch('');
    searchInput.current?.focus();
  };

  return (
    <SupportPage
      eyebrow="The help center"
      title={<>Good questions.<br /><em>Clear answers.</em></>}
      description="A little clarity, from choosing your first print to the moment it arrives. Find the details you need, all in one place."
      breadcrumb="Frequently asked questions"
      meta={<span>04 topics / 14 answers</span>}
    >
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav aria-label="Frequently asked question topics" className={styles.topicNav}>
            <span className={styles.eyebrow}>Browse by topic</span>
            <div className={styles.topicList}>
              {sections.map((section) => (
                section.questions.length > 0 ? (
                  <a href={`#faq-topic-${section.sectionIndex}`} className={styles.topic} key={section.category}>
                    <span className={styles.topicNumber}>0{section.sectionIndex + 1}</span>
                    <span>{section.category}</span>
                    <ArrowDownRight size={15} aria-hidden="true" />
                  </a>
                ) : (
                  <span className={`${styles.topic} ${styles.unavailableTopic}`} key={section.category}>
                    <span className={styles.topicNumber}>0{section.sectionIndex + 1}</span>
                    <span>{section.category}</span>
                  </span>
                )
              ))}
            </div>
          </nav>
        </aside>

        <div className={styles.content}>
          <div className={styles.searchSection}>
            <label htmlFor="faq-search" className={styles.searchLabel}>What can we help you with?</label>
            <div className={styles.searchBox}>
              <Search size={20} aria-hidden="true" />
              <input
                ref={searchInput}
                id="faq-search"
                type="search"
                placeholder="Try delivery, sizes, returns…"
                value={query}
                onChange={(event) => updateSearch(event.target.value)}
                aria-controls="faq-results"
                autoComplete="off"
              />
              {query && (
                <button type="button" onClick={resetSearch} aria-label="Clear search" className={styles.clearSearch}>
                  <X size={17} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className={styles.searchMeta}>
              <p role="status">{normalizedQuery ? `${resultCount} ${resultCount === 1 ? 'answer' : 'answers'} found` : 'The details, without the guesswork.'}</p>
              <span>DreamVault / FAQ</span>
            </div>
          </div>

          <div id="faq-results">
            {resultCount === 0 ? (
              <div className={styles.emptyState}>
                <Search size={28} aria-hidden="true" />
                <h2>No answers just yet.</h2>
                <p>Try a different word, or reach out to us. We&apos;ll help you find what you need.</p>
                <div className={styles.emptyActions}>
                  <button type="button" onClick={resetSearch}>Show all questions</button>
                  <Link href="/contact">Ask our team <ArrowUpRight size={15} aria-hidden="true" /></Link>
                </div>
              </div>
            ) : sections.filter((section) => section.questions.length > 0).map((section) => (
              <section
                key={section.category}
                id={`faq-topic-${section.sectionIndex}`}
                aria-labelledby={`faq-heading-${section.sectionIndex}`}
                className={styles.faqSection}
              >
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>0{section.sectionIndex + 1}</span>
                  <h2 id={`faq-heading-${section.sectionIndex}`}>{section.category}</h2>
                  <span className={styles.questionCount}>{section.questions.length.toString().padStart(2, '0')}</span>
                </div>
                <div className={styles.questions}>
                  {section.questions.map((item) => {
                    const isOpen = openItems.includes(item.id);
                    return (
                      <div key={item.id} className={styles.question} data-open={isOpen}>
                        <h3>
                          <button
                            id={`faq-question-${item.id}`}
                            className={styles.questionButton}
                            type="button"
                            onClick={() => toggle(item.id)}
                            aria-expanded={isOpen}
                            aria-controls={`faq-answer-${item.id}`}
                          >
                            <span>{item.q}</span>
                            <span className={styles.toggleIcon}>
                              {isOpen ? <Minus size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                            </span>
                          </button>
                        </h3>
                        <div
                          id={`faq-answer-${item.id}`}
                          aria-labelledby={`faq-question-${item.id}`}
                          hidden={!isOpen}
                          className={styles.answer}
                        >
                          <p>{item.a}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </SupportPage>
  );
}
