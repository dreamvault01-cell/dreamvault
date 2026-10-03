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

## 🎨 Design Inspiration

Inspired by [Posterized.in](https://www.posterized.in/) and other premium poster e-commerce stores like Displate, Society6, and Redbubble.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Made with ❤️ by [RishuJaiz](https://github.com/RishuJaiz)
