# 🏛️ DreamVault — Premium Art Prints & Posters

A premium e-commerce website for art prints and posters, built with Next.js 16. Featuring a stunning dark-mode design with gold accents, full cart system, live search, and responsive layouts.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- 🎨 **Premium Dark Theme** — Elegant dark mode with gold accents, glassmorphism, and micro-animations
- 🛒 **Full Cart System** — Add/remove/update items with localStorage persistence
- 🔍 **Live Search** — Instant product search across names, categories, and tags
- 📱 **Fully Responsive** — Mobile-first design with hamburger menu
- 📦 **Delivery Tracker** — Dynamic delivery date calculation
- 🖼️ **6 Product Categories** — Abstract Art, Nature, Minimalist, Movies, Anime, Wall Setup Packs
- 📷 **Custom Poster Builder** — Upload your photo and customize size/paper
- 💰 **Pricing with Discounts** — Original price, sale price, discount badges

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/RishuJaiz/DreamVault.git
cd DreamVault

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
dreamvault/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Homepage
│   │   ├── globals.css         # Complete design system
│   │   ├── collections/        # Collections & category pages
│   │   ├── product/[slug]/     # Product detail page
│   │   ├── custom/             # Custom poster builder
│   │   ├── checkout/           # Checkout flow
│   │   └── about/              # About page
│   ├── components/             # Reusable UI components
│   │   ├── Navbar.tsx          # Fixed glassmorphism header
│   │   ├── Footer.tsx          # Site footer
│   │   ├── ProductCard.tsx     # Product card with hover effects
│   │   ├── CartDrawer.tsx      # Slide-in cart drawer
│   │   └── SearchModal.tsx     # Full-screen search modal
│   ├── context/
│   │   └── CartContext.tsx      # Cart state management
│   └── data/
│       └── products.ts         # Product & category data
└── public/
    └── images/                 # Product and banner images
```

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- **Styling**: Vanilla CSS with CSS Custom Properties
- **State Management**: React Context API
- **Fonts**: [Outfit](https://fonts.google.com/specimen/Outfit) + [Playfair Display](https://fonts.google.com/specimen/Playfair+Display)
- **Storage**: localStorage for cart persistence

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run lint` | Run ESLint |

## Product room preview

Apply the additive image update to the intended database before running the updated app:

```bash
npm run db:product-media
```

The script adds a dedicated `ProductImage.isRoomPreview` flag and enforces one
preview image per product. It preserves the existing catalog and is safe to run
again. Apply it to the Vercel database too if it is different from the local one.

In **Admin > Products > Edit > Media**:

1. Upload an artwork-only JPG, PNG or WebP: the final poster design without a
   frame, room, furniture or mockup shadows. Use the print's actual proportions.
2. Select **Use for room preview** on that image. The cover image is independent.
3. Use **Preview room** to check sizes and wall colours before saving.
4. Save the product. Its public product page now offers **Room preview**.

Selecting another image replaces the previous choice. Select it again to disable
room preview; removing the selected image also disables it. Reordering or removing
other images preserves the choice. Image descriptions remain accessibility text,
not a hidden setting. Room scenes are illustrative, not augmented reality or a
promise of an exact photographic match.

Run `npm run test:product` for product-size and media validation tests.

## Contact form

The contact page posts to `POST /api/contact`. Messages are stored in PostgreSQL
in `ContactMessage`, with a reference ID shown only after a successful save.
It supports guest submissions, field validation, a honeypot, request-size limits,
three submissions per email per ten minutes, and duplicate-safe retries.

The protected `/admin/messages` support inbox lets administrators read
conversations, write email replies and private notes, manage statuses, and review
delivery problems. When Resend is connected, customer email replies return to
the same conversation through a verified webhook. Outgoing messages use a
durable queue with bounded retries; a saved request does not guarantee delivery.

With `DATABASE_URL` configured for the intended database, apply the additive
support schema and preserve existing contact requests:

```bash
npm run db:support
```

Email is not activated by installing the code. Add the private Resend API key,
webhook signing secret, and support settings locally and in Vercel when ready.
Development mode allows outgoing email only to the configured test inbox; other
customers' requests still save without redirecting their emails. No domain is
needed for development. Do not commit or share real credentials.

Run the support validation, HTTP, email, webhook, and queue checks with:

```bash
npm run test:support
```

See [the support setup guide](docs/SUPPORT_SETUP.md) for the required settings,
step-by-step configuration, full email testing, optional rollback-only database
tests, background retries, and moving to a branded domain later.

## 🎨 Design Inspiration

Inspired by [Posterized.in](https://www.posterized.in/) and other premium poster e-commerce stores like Displate, Society6, and Redbubble.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Made with ❤️ by [RishuJaiz](https://github.com/RishuJaiz)
