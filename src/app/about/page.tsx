import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Layers, Plus, Scan, Package } from 'lucide-react';
import styles from './about.module.css';

export const metadata: Metadata = {
  title: 'Our Story | DreamVault — Art for the Way You Live',
  description: 'Meet DreamVault. Thoughtfully curated art, considered paper and frame choices, and a belief that your space should feel like you.',
};

const materials = [
  {
    number: '01', icon: Layers, title: 'Feel the difference.', label: 'The paper',
    description: 'A considered matte finish, chosen to suit the way you want to display it.',
    detail: 'Poster Prints use Classic Matte paper. Premium Art Prints and Framed Art Prints use Premium Fine-Art Matte paper. The exact option is shown before you add a piece to your cart.',
  },
  {
    number: '02', icon: Scan, title: 'Make it your own.', label: 'The finish',
    description: 'Choose your print. Choose your finish. Find the frame that feels right.',
    detail: 'Choose a Poster Print or Premium Art Print for an unframed piece, or select a Framed Art Print in Black, White, Natural Oak, or Walnut when available for the artwork and size you love.',
  },
  {
    number: '03', icon: Package, title: 'Care, all the way.', label: 'The journey',
    description: 'Thoughtful protective packaging, from our hands to your walls.',
    detail: 'Prints are carefully packed in protective tubes or rigid mailers to help keep them safe in transit. Visit our shipping and returns pages for delivery details and help with a damaged order.',
  },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <section className={[styles.container, styles.intro].join(' ')} aria-labelledby="about-heading">
        <div className={styles.topline}>
          <span className={styles.eyebrow}><span className={styles.dot} /> The world of DreamVault</span>
          <span className={styles.edition}>Art. Space. A little perspective.</span>
        </div>
        <div className={styles.introGrid}>
          <h1 id="about-heading" className={styles.title}>A little art.<br /><em>A lot of feeling.</em></h1>
          <div className={styles.introAside}>
            <p>For the walls you live with.<br />And the moments that make them yours.</p>
            <p className={styles.introDescription}>We bring thoughtful art and beautiful print together, so your space can tell a story only you could tell.</p>
            <a href="#our-story" className={styles.storyLink}><span className={styles.circleArrow}><ArrowDown size={18} aria-hidden="true" /></span>Get to know us</a>
          </div>
        </div>
        <figure className={styles.heroImage}>
          <Image src="/images/about/atelier.jpg" alt="A softly lit contemporary gallery filled with expressive abstract art" fill preload sizes="(max-width: 1350px) 94vw, 1280px" />
          <div className={styles.imageShade} />
          <div className={styles.heroImageTop}><span>A different point of view.</span><span>DreamVault / Our story</span></div>
          <figcaption className={styles.heroCaption}>
            <p>Good art changes a wall.<br /><em>Great art changes a feeling.</em></p>
            <span className={styles.imageIndex}>DV<span>001 — A sense of place</span></span>
          </figcaption>
        </figure>
        <div className={styles.signatureStrip} aria-label="Our approach">
          <span>Thoughtfully curated</span><span aria-hidden="true">✦</span><span>Beautifully printed</span><span aria-hidden="true">✦</span><span>Personally yours</span>
        </div>
      </section>

      <section id="our-story" className={[styles.container, styles.story].join(' ')} aria-labelledby="story-heading">
        <div className={styles.sectionLabel}><span>01 / Our beginnings</span><span className={styles.labelLine} /></div>
        <div className={styles.storyGrid}>
          <div className={styles.storyHeading}>
            <span className={styles.eyebrow}>A simple belief</span>
            <h2 id="story-heading">A space should<br />feel like <em>you.</em></h2>
            <div className={styles.brandSignature}>Dream<span>Vault</span><span className={styles.signatureNote}>Art for the everyday.</span></div>
          </div>
          <div className={styles.storyCopy}>
            <p className={styles.lead}>The print above your desk. The color that pulls a room together. The piece you stop to look at, every single day.</p>
            <p>We believe those little things matter. DreamVault began with the idea that surrounding yourself with art should be personal, approachable, and a pleasure from the very first print.</p>
            <p>So we focus on what makes a difference: art with character, paper you can feel, and pieces that fit naturally into the way you live. From a quiet abstract to a bold gallery wall, there is no right way to make a space yours.</p>
            <Link href="/collections" className={styles.textLink}>Find your point of view <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className={styles.craftSection} aria-labelledby="craft-heading">
        <div className={[styles.container, styles.craftGrid].join(' ')}>
          <figure className={styles.craftImage}>
            <Image src="/images/about/craftsmanship.jpg" alt="A close-up of the texture and careful finishing of an art print" fill sizes="(max-width: 800px) 92vw, 46vw" />
            <figcaption><span>The details make the difference.</span><span>Matte / Fine-Art</span></figcaption>
          </figure>
          <div className={styles.craftContent}>
            <span className={styles.eyebrow}>02 / Considered in every detail</span>
            <h2 id="craft-heading">Beautiful on your wall.<br /><em>Better in your hands.</em></h2>
            <p>Because the artwork is only half the story. The paper, the finish, the way it arrives — we care about the whole picture.</p>
            <div className={styles.materials}>
              {materials.map(({ number, icon: Icon, title, label, description, detail }) => (
                <details className={styles.material} key={number}>
                  <summary>
                    <Icon size={21} strokeWidth={1.4} aria-hidden="true" />
                    <span className={styles.materialSummary}><span className={styles.materialLabel}>{label}</span><span className={styles.materialTitle}>{title}</span></span>
                    <Plus size={19} className={styles.materialPlus} aria-hidden="true" />
                  </summary>
                  <div className={styles.materialDetail}><p>{description}</p><p>{detail}</p></div>
                </details>
              ))}
            </div>
            <Link href="/shipping-delivery" className={styles.textLink}>The journey to your door <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className={[styles.container, styles.philosophy].join(' ')} aria-labelledby="philosophy-heading">
        <div className={styles.sectionLabel}><span>03 / Room for self-expression</span><span className={styles.labelLine} /></div>
        <div className={styles.philosophyHeader}>
          <h2 id="philosophy-heading">Your walls.<br /><em>Your kind of wonderful.</em></h2>
          <p>A collected corner. A statement piece. A whole new mood. Start with something that speaks to you and let the rest follow.</p>
        </div>
        <figure className={styles.sanctuaryImage}>
          <Image src="/images/about/sanctuary.jpg" alt="A thoughtfully styled living space with a curated gallery wall and warm natural textures" fill sizes="(max-width: 1350px) 94vw, 1280px" />
          <figcaption className={styles.roomNote}><span className={styles.dot} /> A little inspiration for your everyday.</figcaption>
          <Link href="/collections" className={styles.galleryLink}><span>Find art for your space<span>Explore the collections</span></span><ArrowUpRight size={23} aria-hidden="true" /></Link>
        </figure>
        <div className={styles.values}>
          {[
            { number: '01', title: 'Follow your feeling.', text: 'Choose a piece because you love it. Your space, your taste, your rules.' },
            { number: '02', title: 'Make room for quality.', text: 'Thoughtful materials and a beautiful finish, right down to the details.' },
            { number: '03', title: 'Let your space evolve.', text: 'Start with one print. Add another chapter whenever inspiration finds you.' },
          ].map((value) => (
            <div className={styles.value} key={value.number}><span>{value.number}</span><h3>{value.title}</h3><p>{value.text}</p></div>
          ))}
        </div>
      </section>

      <section className={[styles.container, styles.closing].join(' ')} aria-labelledby="closing-heading">
        <div className={styles.closingInner}>
          <span className={styles.eyebrow}>Your next chapter starts here</span>
          <h2 id="closing-heading">Make yourself<br /><em>right at home.</em></h2>
          <p>Find a print that feels like it was always meant to be yours.</p>
          <Link href="/collections" className={styles.primaryLink} id="about-cta-shop-btn">Discover your next piece <ArrowUpRight size={19} aria-hidden="true" /></Link>
          <Link href="/contact" className={styles.contactLink}>A question, an idea, a hello? <span>Let’s talk <ArrowRight size={14} aria-hidden="true" /></span></Link>
          <span className={styles.closingWordmark} aria-hidden="true">DreamVault</span>
        </div>
      </section>
    </div>
  );
}
