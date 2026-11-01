# RareDaze brand assets

- `raredaze-wordmark.png`: transparent, theme-adaptive wordmark used by the storefront, admin and authentication UI.
- `raredaze-mark.svg`: compact code-native R/lightning mark for browser and home-screen icons.
- `raredaze-apple-icon.png` and `src/app/favicon.ico`: exported from the SVG with `npm run brand:icons`.

The wordmark was adapted from the supplied RareDaze reference using the built-in image-generation tool, not the API/CLI fallback. CSS uses its alpha channel as a mask so it works in both website themes.

Generation prompt: Adapt the supplied RAREDAZE logo into a premium, responsive-site wordmark, preserving forward-slanted angular letterforms. Render exact text “RAREDAZE” in near-black monochrome with one restrained lightning underline, transparent background and counterspaces; no grunge, halftone, enclosing border, shadows, gradients, or extra text.

The rebrand intentionally preserves existing order-reference formats, cart-storage keys, hosting URLs, repository identifiers, payment metadata keys and service email addresses. These are operational identifiers, not display branding.

Existing attempted support emails retain their original HTML wrapper. Custom support sender names also retain that wrapper because the current records do not store a template version; the default RareDaze senders use the new branding. This avoids changing provider retry payloads and does not require a database migration.
