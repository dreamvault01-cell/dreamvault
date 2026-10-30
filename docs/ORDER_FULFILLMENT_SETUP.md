# Order fulfilment setup

The application now treats a print as a real sellable configuration. It reserves
stock for an online checkout, permanently deducts it only after a captured
payment, tracks fulfilment separately from payment, and records every change.

## 1. Apply the database update

Run this once against the same database used by the running app:

```powershell
npm run db:order-fulfillment
npx prisma generate
```

The SQL is additive and safe to run again. It does not delete products, orders,
or support conversations.

## 2. Set private environment variables

Add these in `.env.local` for local development and in the Vercel project
environment settings for the deployed site. Never commit their values.

```dotenv
# Existing payment credentials
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Use the same private signing secret chosen in Razorpay's webhook configuration.
RAZORPAY_WEBHOOK_SECRET=

# Reuses your existing Resend key. Development mode always delivers order
# email only to the test recipient, which is safer while the domain is not set.
RESEND_API_KEY=
ORDER_EMAIL_MODE=development
ORDER_FROM_EMAIL=onboarding@resend.dev
ORDER_REPLY_TO_EMAIL=support@soliheleug.resend.app
ORDER_TEST_RECIPIENT=dreamvault01@gmail.com
ORDER_APP_URL=http://localhost:3000

# At least 32 random characters. This protects the scheduled retry endpoint.
CRON_SECRET=
```

For Vercel, set `ORDER_APP_URL` to the public `https://...vercel.app` URL.

When you buy a domain later, verify it in Resend and change only these values:

```dotenv
ORDER_EMAIL_MODE=live
ORDER_FROM_EMAIL=orders@your-domain.com
ORDER_REPLY_TO_EMAIL=support@your-domain.com
ORDER_APP_URL=https://your-domain.com
```

The customer-facing order and tracking URLs then use the new domain
automatically. Keep the Resend API key private; do not put it in a `NEXT_PUBLIC_`
variable.

## 3. Configure Razorpay webhooks

In Razorpay's webhook settings, create this endpoint:

```text
https://your-public-site/api/webhooks/razorpay
```

Subscribe to at least `payment.captured` and `order.paid`. Copy the webhook
secret into `RAZORPAY_WEBHOOK_SECRET`. The endpoint verifies the raw body HMAC,
records each provider event only once, and will not fulfil an order with a
mismatched amount or currency.

## 4. Configure the retry scheduler

The protected endpoint is:

```text
GET https://your-public-site/api/cron/fulfillment
Authorization: Bearer <CRON_SECRET>
```

The repository includes a five-minute GitHub Actions workflow for a development
deployment on Vercel Hobby. It is opt-in, supports a manual first run, and calls
this combined endpoint for expired reservations, due order mail and due support
mail. Configure the same private `CRON_SECRET` in Vercel and GitHub; no secret
belongs in a URL or in the committed workflow.

Follow [the background-jobs setup guide](BACKGROUND_JOBS_SETUP.md) to deploy,
configure, manually verify and then enable recurring runs. It covers private
repository runner usage, delayed schedules and the Vercel Hobby limitations.
Do not assume unattended processing is active merely because the file exists.

The worker releases abandoned 15-minute checkout holds and retries eligible due
emails. It does not automatically revive blocked/terminal support messages or
bypass development email restrictions. Checkout also makes a small cleanup pass,
but a scheduler is needed to perform cleanup and retries while the site is quiet.

## 5. Operational workflow

1. Customer chooses a real paper/frame configuration and checks out.
2. Online checkout holds stock for 15 minutes; COD commits stock immediately.
3. A verified captured payment commits the held stock. The browser callback and
   Razorpay webhook are both idempotent safeguards.
4. In **Admin → Orders**, staff starts preparation, adds courier + tracking to
   ship, and marks delivery. Each step creates an audit entry. For COD, confirm
   collection only after the courier settlement is known; that is what includes
   the delivered COD order in revenue reporting.
5. Customers see their private order history under **My Orders**, and can use
   **Track Your Order** with both order reference and checkout email.
6. Cancellation before dispatch returns committed stock. A paid online order
   is marked `refund pending`; issue the actual monetary refund in Razorpay,
   then paste its `rfnd_...` refund ID in Admin. The server fetches that refund
   from Razorpay and checks the original payment, full amount, currency, and
   processed status before recording it and queuing the customer email.
7. If stock changed after an admin opened the inventory or product editor,
   saving returns a refresh message. Reload the page and review the latest
   stock rather than overwriting units that another checkout just sold.

## Test checklist

1. Use Razorpay test mode and place one online payment plus one COD order.
2. Confirm the stock row changes from available → held → committed.
3. Confirm an email appears in Resend's Sending view (development mode sends
   only to `ORDER_TEST_RECIPIENT`).
4. Mark the order processing, shipped (with tracking), and delivered in Admin.
   For the COD test, then confirm the settlement with **Confirm COD collection**.
5. Verify both My Orders and the public tracking form show the update.
6. Cancel a separate paid, undispatched test order. Confirm its stock returns
   and its payment shows refund pending. Issue a full refund in Razorpay test
   mode, wait for processed status, then confirm the refund ID in Admin.
7. Repeat a captured-payment callback/webhook for that refunded order. Its
   refund state must remain unchanged and no duplicate email should appear.
8. Open the same stock row in two tabs. Save a change in the first, then try
   saving the stale second tab. It must ask you to refresh instead of restoring
   the old quantity.

The checkout confirmation page reads the signed-in customer's saved order. URL
query flags cannot create a payment confirmation. Each checkout also compares
the displayed item prices with current database prices before reserving stock;
if a price changed, the customer must review the product and add it again.

Immediate notification work is registered with Next.js `after()` so Vercel
keeps the invocation alive after responding. The scheduler remains necessary
for later retries and abandoned stock holds. Provider retries use a stable
idempotency key, stop after five actual attempts, and will not automatically
resend after the 23-hour safety window.
