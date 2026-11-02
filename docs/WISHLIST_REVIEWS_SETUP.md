# Wishlist and verified reviews

This feature adds:

- signed-in customer wishlists at `/wishlist`;
- one verified review per customer and product;
- optional customer wall photos stored in the `dreamvault/reviews` Cloudinary folder;
- pending moderation before reviews appear publicly;
- an admin moderation screen at `/admin/reviews`.

## Database setup

Run the additive migration against the same database used by the deployed app:

```bash
npm run db:wishlist-reviews
npx prisma generate
```

The migration is repeatable and does not reset existing orders or products.

## Review workflow

1. A signed-in customer must have a paid/refunded order containing the product.
2. The customer submits a rating, text, and optional photos.
3. The review is stored as `PENDING` and is not public yet.
4. An admin opens **Admin → Reviews** and approves or rejects it.
5. Approved reviews and wall photos appear on the product page with a verified-buyer label.

Cloudinary must be configured for customer photo uploads using the existing Cloudinary environment variables. Photos are limited to five files per review and 5 MB per file.
