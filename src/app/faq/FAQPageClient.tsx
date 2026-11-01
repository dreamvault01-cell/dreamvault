'use client';

import { useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import SupportPage from '@/components/SupportPage';
import styles from './faq.module.css';

function getFaqs(supportEmail: string) {
  return [
  {
    category: 'Orders & Shipping',
    questions: [
      {
        q: 'How long does delivery take?',
        a: 'Timing depends on your print format, destination, and courier. Once the order ships, its courier and tracking details appear on your order page so you can follow the latest available estimate.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Checkout currently supports delivery addresses in India. International delivery is not available yet.',
      },
      {
        q: 'How can I track my order?',
        a: 'Once your order ships, we send a tracking update to the email used at checkout when order email is enabled. You can always use the Track Your Order page with your order reference and checkout email.',
      },
      {
        q: 'What are the shipping charges?',
        a: 'Delivery is currently included in the checkout total. If this changes, the full charge will be shown before you place an order.',
      },
    ],
  },
  {
    category: 'Products & Quality',
    questions: [
      {
        q: 'What paper quality do you use?',
        a: 'Poster Prints use Classic Matte paper. Premium Art Prints and Framed Art Prints use Premium Fine-Art Matte paper. The exact choice is shown before you add a print to your cart.',
      },
      {
        q: 'What sizes are available?',
        a: 'Each product shows the sizes available for that artwork and format. Common sizes include A4 (8.3 × 11.7 in), A3 (11.7 × 16.5 in), and A2 (16.5 × 23.4 in). Custom dimensions are not currently offered at checkout.',
      },
      {
        q: 'Are frames included?',
        a: 'Poster Prints and Premium Art Prints are sold unframed. Choose a Framed Art Print for Black, White, Natural Oak, or Walnut framing where that configuration is available.',
      },
      {
        q: 'Can I request a custom poster?',
        a: 'Custom photo and quote prints are not open for checkout yet. Today, you can choose from our ready-to-order Poster Prints, Premium Art Prints, and Framed Art Prints. Contact us if you would like to share what you want to see next.',
      },
    ],
  },
  {
    category: 'Returns & Refunds',
    questions: [
      {
        q: 'What is your return policy?',
        a: 'If an item arrives damaged, defective, or materially different from the order, contact us within 7 days of delivery with your order reference and clear photos. We will review it and confirm the next step.',
      },
      {
        q: 'How do I initiate a return?',
        a: `Contact us at ${supportEmail} with your order reference and photos of the issue. We will review your request and confirm any return instructions before you send the item.`,
      },
      {
        q: 'How long do refunds take?',
        a: 'Once a refund is approved and completed through the payment provider, the time to appear in your balance depends on your bank or payment method. We will confirm the refund status with you.',
      },
    ],
  },
  {
    category: 'Payment & Security',
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'Online checkout uses Razorpay. The payment methods available for your transaction, such as UPI, cards, net banking, or wallets, are shown in its secure payment window. Cash on delivery is also available at checkout.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Online payment details are entered in Razorpay’s secure payment window. RareDaze stores the payment reference and status needed to confirm the order, without storing complete card, bank, or UPI credentials.',
      },
      {
        q: 'Do you offer Cash on Delivery?',
        a: 'Yes. Cash on Delivery is available alongside secure online payment at checkout.',
      },
    ],
  },
];
}

export default function FAQPageClient({ supportEmail }: { supportEmail: string }) {
  const faqs = getFaqs(supportEmail);
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
              <span>RareDaze / FAQ</span>
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
