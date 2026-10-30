# DreamVault support inbox setup

You answer customers inside **Admin → Messages**. Customers receive your answers by email and can reply normally. Their replies return to the same dashboard conversation.

The code alone does not activate email. Your database update, private settings, deployed website, and Resend webhook must all be connected. Do not paste API keys, webhook secrets, database URLs, or passwords into chat, screenshots, or GitHub.

Until both the Resend API key and webhook signing secret are valid, the dashboard shows that email setup is required. Contact requests still save, but their outgoing emails are marked **Sending blocked**, not silently delivered. Adding the settings later does not automatically send every previously blocked message; start with a fresh test and use **Retry delivery** only when offered and appropriate.

## 1. Understand the development addresses

| Purpose | Development value |
| --- | --- |
| Address that receives new support enquiries | `support@soliheleug.resend.app` |
| Address that sends test replies | `onboarding@resend.dev` |
| Only permitted customer/test recipient | `dreamvault01@gmail.com` |
| Notification inbox for the owner | `dreamvault01@gmail.com` |
| Website | `https://dream-vault-rho.vercel.app` |

These addresses are deliberately different. Resend's default sender can only email the address associated with your Resend account. Receiving on your account's `resend.app` domain does not give you permission to send from it. [Resend's testing restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

Keep `SUPPORT_EMAIL_MODE=development` until you verify your own sending domain. This setting is separate from Next.js production mode: a deployed Vercel website can still use safe development email mode.

In development, a real customer's form message is still saved, but their email address is not replaced with your test inbox. Replies to other recipients are blocked. This is not yet public, unrestricted customer email support.

The website also generates a private reply address such as `r+<random-token>@soliheleug.resend.app` for each conversation. You do not create those addresses manually. Clicking **Reply** in a test email uses its conversation-specific address automatically. [Resend accepts receiving usernames on your assigned subdomain](https://resend.com/docs/dashboard/receiving/introduction).

## 2. Create the private Resend API key

1. In Resend, open **API keys**.
2. Create a key named `DreamVault Development`.
3. Choose **Full access** because this integration retrieves incoming email content as well as sending email. A sending-only key is insufficient.
4. Save the key privately. Do not send it to anyone in chat.

Reference: [Resend API key permissions](https://resend.com/docs/api-reference/api-keys/create-api-key).

## 3. Add the website settings

### On your computer

Open `dreamvault/.env.local` in your editor, creating it if it does not exist. If it already exists, append the support settings listed below, filling in private secrets yourself. **Do not replace an existing file or remove your database, Clerk, payment, or other settings.**

```dotenv
SUPPORT_EMAIL_MODE=development
SUPPORT_FROM_EMAIL=onboarding@resend.dev
SUPPORT_FROM_NAME="DreamVault Support"
SUPPORT_EMAIL_ADDRESS=support@soliheleug.resend.app
SUPPORT_INBOUND_DOMAIN=soliheleug.resend.app
SUPPORT_TEST_RECIPIENT=dreamvault01@gmail.com
SUPPORT_NOTIFICATION_EMAIL=dreamvault01@gmail.com
SUPPORT_APP_URL=http://localhost:3000
RESEND_API_KEY=YOUR_PRIVATE_RESEND_API_KEY
RESEND_WEBHOOK_SECRET=YOUR_PRIVATE_WEBHOOK_SIGNING_SECRET
CRON_SECRET=YOUR_PRIVATE_RANDOM_SECRET
```

The values beginning `YOUR_PRIVATE_` are explanations, not working credentials. Replace them privately. You obtain the webhook signing secret in step 5. For `CRON_SECRET`, generate and save a random value of at least 32 characters in a password manager; it is not your Resend key.

Restart the local development server after changing `.env.local`.

### In Vercel

1. Open your DreamVault project in Vercel.
2. Open **Settings → Environment Variables**.
3. Add the same support settings for **Production**. Use this different website value:

   ```dotenv
   SUPPORT_APP_URL=https://dream-vault-rho.vercel.app
   ```

4. Keep `SUPPORT_EMAIL_MODE=development` even in the Production environment.
5. Keep all support secrets server-only. Do not add a `NEXT_PUBLIC_` prefix.
6. Redeploy after adding or changing settings. Existing deployments do not automatically receive new values. [Vercel environment-variable instructions](https://vercel.com/docs/environment-variables/managing-environment-variables).

Local settings do not automatically copy to Vercel. Preview environments should use development mode and an intentionally chosen test database; do not assume Preview is isolated from your Production data.

## 4. Update the intended database and deploy the code

The support system requires the additive SQL update in `prisma/sql/support-inbox.sql`.

From the `dreamvault` project folder, with `DATABASE_URL` pointing to the intended database, run:

```powershell
npm run db:support
```

Confirm which database the command will use before running it. Each separate local, Preview, or Production database needs its own update. The update adds support tables/columns and brings earlier contact messages into the conversation history; it does not require deleting existing business data.

This command uses the Prisma CLI's `DATABASE_URL` from its shell/environment or `.env`. Unlike the Next.js server, it does not automatically load `.env.local`. If your intended database URL exists only in `.env.local`, configure it privately for the Prisma command first; never print or paste the connection string publicly.

Deploy the updated project through your existing Vercel deployment process. The Resend webhook URL below must exist on that deployed version, not only on your computer.

## 5. Connect incoming emails and delivery updates

A webhook is how Resend tells your website that an email arrived or its delivery status changed.

1. In Resend, open **Webhooks → Add Webhook**.
2. Enter this endpoint URL:

   ```text
   https://dream-vault-rho.vercel.app/api/webhooks/resend
   ```

3. Subscribe to:

   - `email.received`
   - `email.sent`
   - `email.delivered`
   - `email.bounced`
   - `email.complained`
   - `email.failed`
   - `email.delivery_delayed`
   - `email.suppressed`, if available in your Resend event selector

4. Open that webhook's details and copy its **Signing secret** privately.
5. Set that value as `RESEND_WEBHOOK_SECRET` in Vercel, then redeploy. Add it locally only if you need the same webhook configuration there.
6. After redeployment, send a fresh test email. Check the webhook's delivery log for a successful response. If a real event failed while you were configuring the secret, replay it from Resend after fixing the settings.

The signing secret is different from the API key. Your public webhook endpoint checks this secret's signature before trusting an event. Do not disable signature checks to make a test pass. [Create a webhook](https://resend.com/docs/webhooks/create-webhook), [verify webhook signatures](https://resend.com/docs/webhooks/verify-webhooks-requests).

An ordinary browser visit to the webhook URL is not an email test: Resend sends signed POST requests. A `localhost` URL is not reachable by Resend without separate local forwarding. For the simplest setup, test against the deployed Vercel endpoint.

## 6. Test the complete conversation

Use `dreamvault01@gmail.com` as the customer address for this development test.

1. Open the deployed **Contact** page and submit a unique test message using that email address. Keep the reference number.
2. Sign in with your existing admin account and open `/admin/messages`.
3. Confirm the new request and original message appear. The page is restricted to users whose existing Clerk public metadata role is `admin`; do not make all accounts admins.
4. Check Gmail for the customer receipt and owner notification. These may both arrive in the same inbox during testing.
5. Open the conversation in admin, choose **Email reply**, write your answer, and click **Send reply**. Confirm Gmail receives it.
6. In Gmail, click **Reply** on the support reply. Send a short answer. Do not change the reply recipient.
7. Refresh the dashboard conversation and confirm the answer appears in the same request, not as a new ticket.
8. Mark the request resolved. Reply again from Gmail and confirm the conversation reopens.

Also send a new email directly to `support@soliheleug.resend.app`. It should create a separate email-origin request after the webhook is connected. Direct incoming emails do not get an automatic receipt, to reduce email autoresponse loops.

Incoming mail is accepted only when Resend's trusted receiving-server authentication verdict passes the configured security checks. The accepted results are `authentication.dmarc=pass`, or `authentication.dmarc=gray` together with `authentication.dkim=pass`. Resend's gray DMARC result can include a domain with no enforcement policy; its DKIM pass confirms a valid signature aligned with the From domain. These results come from Resend's API, never from sender-supplied message headers. A matching visible From address alone is not trusted. Failed, missing, or unknown authentication, automated mail, wrong recipients, and customer/reply-token mismatches are ignored rather than added to a conversation. A skipped email can therefore appear in Resend Receiving without appearing in the website inbox. [Resend's authentication response fields](https://resend.com/docs/api-reference/emails/retrieve-received-email).

For staff-only information, choose **Internal note → Save note**. Notes remain inside the admin dashboard and are never emailed. Conversation statuses are **New**, **In progress**, **Waiting for customer**, and **Resolved**. A successfully sent staff reply moves an in-progress request to Waiting for customer; a new customer reply reopens it.

The earlier manual Resend **Hello World** test only proved that Resend could send an email. This full test checks the website, database, email sending, signed webhook, and conversation matching together.

## 7. Understand saved, sent, and delivered

- **Saved/queued** means the database accepted the message. It does not mean the customer received an email.
- **Sent** means the email service accepted the outgoing message.
- **Delivered** means the recipient's email server accepted it. It does not prove the customer read it or that it reached the primary inbox.
- **Failed, bounced, or blocked** needs attention in the dashboard and Resend logs.

An email-service outage does not remove a successfully saved contact request. Outgoing messages are stored durably and can be processed again. Do not repeatedly compose the same answer just because delivery is pending.

## 8. Enable reliable background retries

The website attempts bounded queue processing immediately after accepting a contact submission or an admin reply. Deferred jobs still need a later processor run; Vercel does not keep an always-running worker alive for you.

Click **Process outbox** on the admin Messages screen to process jobs that are due. It does not bypass future retry times or automatically send blocked messages. For an eligible blocked/failed message, **Retry delivery** is a separate, explicit action. Automatic attempts stop at five attempts or the 23-hour safe-retry window; after that, check Resend before deciding whether to write a new reply.

For unattended retries, configure a scheduler to call:

```text
POST https://dream-vault-rho.vercel.app/api/cron/fulfillment
Authorization: Bearer YOUR_PRIVATE_CRON_SECRET
```

The combined endpoint also accepts GET with the same authentication. It handles expired order reservations, order email retries and support email retries independently. Keep the secret in the scheduler's protected header settings, not in the URL. Do not expose it to a public browser script. The existing `/api/support/process` endpoint remains available for support-only processing; do not configure a second recurring support schedule alongside the combined one.

The repository includes an opt-in five-minute GitHub Actions scheduler, with a manual run and safe processing summaries. Follow [the background-jobs setup guide](BACKGROUND_JOBS_SETUP.md) to deploy it, set the private GitHub/Vercel secret, verify a run, review runner usage and explicitly enable the schedule. No scheduler account, GitHub setting or Vercel plan change is created automatically. Vercel Hobby cron jobs are restricted to daily execution, so no incompatible five-minute native cron is added. [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Before promising customers a response time, choose a retry schedule, monitor failed jobs, and test recovery from a temporary provider failure.

## 9. Later: switch to your own domain

You do not rebuild the dashboard or delete existing conversations.

1. Buy/control your domain and add it in Resend.
2. Verify the sending DNS records provided by Resend.
3. Enable receiving and configure the required MX records. Do not replace MX records blindly if another email provider already uses that domain.
4. Update Vercel settings, for example:

   ```dotenv
   SUPPORT_EMAIL_MODE=live
   SUPPORT_FROM_EMAIL=support@yourdomain.com
   SUPPORT_EMAIL_ADDRESS=support@yourdomain.com
   SUPPORT_INBOUND_DOMAIN=yourdomain.com
   SUPPORT_PREVIOUS_INBOUND_DOMAINS=soliheleug.resend.app
   SUPPORT_NOTIFICATION_EMAIL=YOUR_REAL_MONITORED_OWNER_INBOX
   ```

5. Keep `SUPPORT_APP_URL` as the real website URL. Change it only if the website address also changes.
6. Keep the original Resend receiving domain/webhook active so replies to earlier emails still reach their old conversation addresses. `SUPPORT_PREVIOUS_INBOUND_DOMAINS` accepts the old inbound domains; it does not forward email by itself.
7. Redeploy and test a full conversation with a separate customer email address. Also test a reply to an old development conversation.
8. Review any blocked/queued development messages before sending them intentionally. Do not assume changing mode automatically delivered previous messages.

Owning a domain alone is not enough: sending verification, receiving DNS, environment settings, and a successful round-trip test are all needed.

## Current boundaries

- The admin inbox is for support email, not a replacement for every feature of Zendesk or Intercom.
- Incoming attachment metadata may be recorded, but attachment upload, safe download, virus scanning, and attachment sending are not implemented. Do not promise customers that photos can already be handled end to end.
- The integration does not import all historical email already in Resend. For setup tests, use new messages or replay a suitable webhook event after connecting the endpoint.
- Keep customer messages private, limit admin access, and establish a retention/backup policy before a public launch.
- Before unrestricted live email, add trusted IP/edge/global abuse protection or CAPTCHA and monitor outbound email quotas. The existing per-email contact throttle can be bypassed by rotating submitted addresses.
- Review and remediate the pre-existing critical/high dependency advisories currently reported by `npm audit` before public launch. The audit does not establish exploitability in this website; no dependency upgrades or automatic fixes were applied as part of this support setup.

## Optional developer checks

Run the local support test suite from the `dreamvault` folder:

```powershell
npm run test:support
```

The PostgreSQL integration test is a separate, explicit opt-in. First apply the support schema and verify that `.env` or your shell's `DATABASE_URL` targets the database you intend to test. Prefer a test database. An already-set shell variable takes precedence over `--env-file=.env`; do not assume the filename alone selects the database.

```powershell
$env:SUPPORT_DATABASE_TESTS = '1'
node --conditions=react-server --import tsx --env-file=.env --test src/lib/support-store.integration.test.ts
Remove-Item Env:SUPPORT_DATABASE_TESTS
```

The integration test creates its business records inside a transaction that is rolled back, including on assertion failures. It does not send real emails or retain test tickets/messages. Remove the opt-in flag afterward, or restore its previous value if you had already set one. This is not the database migration command and is not a substitute for the real email round-trip test in step 6.

## Quick troubleshooting

| Problem | Check |
| --- | --- |
| Form saves, but no email arrives | API key, explicit email mode, allowed development recipient, outgoing queue, Resend Sending logs, Spam folder |
| Email appears in Resend Receiving, but not the dashboard | Deployed webhook URL, subscribed `email.received` event, signing secret, latest deployment, webhook delivery log |
| Webhook succeeds, but an incoming message is not imported | Resend's trusted API verdict must be DMARC pass, or DMARC gray with aligned DKIM pass; automated messages, unknown recipients, and mismatched reply senders/tokens are intentionally ignored |
| Customer reply creates no update | Use Gmail's Reply button on the support message; sender must match the ticket customer and the private reply address must be unchanged |
| New settings seem ignored | Redeploy Vercel; restart the local server for local settings |
| Dashboard says database setup is missing | Apply `npm run db:support` to the same database used by that deployment |
| Test reply to another person is blocked | Expected in development mode; do not work around it by rewriting recipients |
| A queued message stays pending | Process due jobs from admin and verify your background retry scheduler is configured |
| Old messages remain Sending blocked after setup | Adding credentials does not requeue blocked jobs; use a fresh test or the explicit Retry delivery action when allowed |
| Webhook returns unauthorized/invalid signature | Use that endpoint's Resend signing secret, not the API key; redeploy after changing it |
