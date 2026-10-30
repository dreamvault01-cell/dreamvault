# Automatic background processing

The stock and email workers are implemented. The repository includes a GitHub
Actions scheduler suitable for a development deployment on Vercel Hobby. It is
**not active merely because the code exists**: deploy it, configure the private
secret, run a manual check, then explicitly enable the recurring schedule.

## What runs

The protected `POST /api/cron/fulfillment` endpoint starts three independent,
bounded jobs and waits for all three:

- Release expired, unpaid checkout reservations. Paid/committed orders are not
  cancelled. The reservation and inventory updates remain one transaction.
- Process due order-notification emails using the existing leased outbox.
- Process due support emails using the existing leased outbox.

Both email workers retain stable provider idempotency keys, the five-attempt
limit, backoff, development-recipient restrictions and the 23-hour retry window.
The scheduler does **not** revive blocked/terminal support messages, bypass email
restrictions, charge payments, issue refunds, or promise email delivery.

The existing order-fulfilment and support database updates must already be applied
to the database used by Vercel. There is no new schema migration for this change.

## 1. Keep the processor secret private

Use `CRON_SECRET` in `.env.local`. During this implementation session a valid
secret was saved privately in the local workspace, without printing its value.
It is not included in Git. For a fresh clone, generate a random secret of at
least 32 characters privately, for example with a password manager, and save it
there yourself. The server never generates or rotates deployment secrets at
startup. Preserve a previously configured valid secret rather than replacing
it unnecessarily.

Copy **only its value**, not `CRON_SECRET=`, into the two dashboards below.
It must have at least 32 characters. It is a different secret from Razorpay's
webhook secret, the Resend API key, and Resend's webhook signing secret.

Never put it in a public variable, URL query parameter, screenshot, chat, workflow
file, or committed file. Keep `.env.local` Git-ignored. Deselect secret values in
your editor before sharing IDE context.

## 2. Configure and deploy Vercel

1. Open the DreamVault project in Vercel.
2. Open **Settings > Environment Variables**.
3. Add `CRON_SECRET`, paste the private value, and select **Production**.
4. Deploy the updated code with that variable. Wait for the production deployment
   serving your public domain to show **Ready**.

Changing a local `.env.local` file does not change Vercel. Changing a Vercel
variable does not change an existing deployment; redeploy afterward.
[Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables).

Restart your development server if you also want to use the local processor.

## 3. Add GitHub repository settings

In the GitHub repository that contains this code:

1. Open **Settings > Secrets and variables > Actions**.
2. Under **Secrets**, choose **New repository secret**:
   - Name: `CRON_SECRET`
   - Value: the same private value used in Vercel.
3. Under **Variables**, add `BACKGROUND_APP_URL`:
   - Value: `https://dream-vault-rho.vercel.app`
   - Use the HTTPS origin only: no `/api/...`, credentials, query or fragment.
   - This origin is not a secret. If omitted, the workflow uses the URL above.
4. Leave `BACKGROUND_JOBS_ENABLED` unset until the manual check succeeds.

The runner only receives this processor secret. Do not give GitHub your database
URL, payment credentials, or Resend key. The checkout action has read-only
repository access, is pinned to a verified commit, does not retain credentials,
and only checks out the scheduler files.
[GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

## 4. Publish and run once manually

The files need to be committed and pushed to the repository's **default branch**
(normally `main`), and the new endpoint code must be deployed on Vercel. Local
changes alone do not install a GitHub workflow. Do not run the scheduler against
an old deployment: the client deliberately rejects an outdated response format.

1. Open **GitHub > Actions > DreamVault background jobs**.
2. If prompted, enable Actions for the repository after reviewing usage limits.
3. Click **Run workflow**, choose the default branch and run it once.
4. Open the run. The job must be green and its summary must contain the three
   workers, their statuses and counters. Zero counters are normal for empty queues.

Manual runs work without `BACKGROUND_JOBS_ENABLED`. Non-default branches cannot
run this production processor. Pull requests do not trigger it.
[Manual workflow runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## 5. Enable recurring runs

After the manual check succeeds, return to **Settings > Secrets and variables >
Actions > Variables** and add:

| Name | Value |
| --- | --- |
| `BACKGROUND_JOBS_ENABLED` | `true` |

The schedule is `2-59/5 * * * *`: every five minutes, offset from minute zero,
in UTC. Check GitHub Actions again after a scheduled run. To stop recurring
runs, set this variable to `false` or disable the workflow in GitHub. This does
not disable the normal immediate checkout/support email attempts.

Important service limits:

- GitHub schedules are best-effort: they may be delayed or skipped. An expired
  hold is released on a successful later sweep, not at an exact promised second.
- Scheduled workflows run on the default branch. Public-repository schedules can
  be disabled after 60 days without repository activity; monitor and re-enable
  them as necessary. Enable workflow-failure notifications too.
- Standard runners are free for public repositories. Private-repository runs
  consume GitHub's included compute allowance and can incur charges or stop when
  the allowance is exhausted. A five-minute schedule is roughly 8,640 runs in a
  30-day month. Review your repository visibility, usage and spending controls
  **before** opting in; this implementation does not change billing settings.
- Vercel Hobby's native cron only permits daily runs; no incompatible five-minute
  `vercel.json` is added. Hobby is for personal, noncommercial use. Review Vercel's
  plan requirements before opening a real commercial store. On a suitable paid
  plan, the same endpoint can use native cron instead of this GitHub schedule.

[GitHub scheduling limits](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
[Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing),
[Vercel Hobby terms](https://vercel.com/docs/plans/hobby).

## 6. Verify the actual work

Use test orders and the configured development email recipient. Do not force
provider failures or change email restrictions on a live customer order.

1. **Stock:** start a test checkout, leave it unpaid and confirm its inventory
   is reserved. After the 15-minute payment window and a successful scheduled
   sweep, check its state is Expired and its reservation is released. Available
   stock returns; the physical stock count is not increased a second time. A
   captured/committed order must remain unchanged.
2. **Safe repetition:** run the workflow again. The same reservation must not
   release stock again, and a sent notification must not send again.
3. **Order mail:** an eligible due queued notification should be attempted and
   show the saved delivery result in Admin/Resend. Future retry times, exhausted
   attempts and development-recipient restrictions remain enforced.
4. **Support mail:** an eligible due queued reply should be attempted in the same
   way. A blocked or terminal failed reply must remain for staff review.
5. **Logs:** GitHub's run summary reports only counts, timings and fixed error
   codes. Vercel **Logs**, filtered to `/api/cron/fulfillment`, contains a matching
   `background_jobs` summary and run ID. No mail body or customer address is logged.

The endpoint returns HTTP 200 when all three workers finish, or HTTP 503 if a
worker throws or a reservation needs review. A terminal/blocked email can be
counted by a completed worker; HTTP 200 is not a promise that every email arrived.
Check the failed/blocked counters and the Admin delivery state.

Requests have a 70-second timeout, reject redirects and login HTML, validate the
response schema, and retry transient failures at most twice after the first
attempt. Runner concurrency avoids cancelling a running sweep. Existing database
locks and email leases protect against replay or overlapping external requests.

| Problem | Check |
| --- | --- |
| Workflow missing | Commit it to `.github/workflows/background-jobs.yml` on the default branch |
| Scheduled job skipped | `BACKGROUND_JOBS_ENABLED` is exactly `true`; default branch; Actions enabled |
| HTTP 401/403 | Matching private `CRON_SECRET` in Vercel and GitHub; production redeployed; deployment protection |
| Redirect/login/invalid response | Use the direct public production origin and deploy the updated code |
| `DATABASE_NOT_READY` | Existing order/support SQL updates applied to this deployment's database |
| `RESERVATION_REVIEW_REQUIRED` | Inspect inventory and expired orders in Admin; never force stock to increase |
| `JOB_FAILED` | Check Vercel infrastructure/DB availability; independent jobs still attempt their work |
| Queued/blocked mail | Review delivery status and development mode; do not repeatedly send a replacement |
| Green run with zero work | Normal when no holds are expired and no queued message is due |

## Local verification

```powershell
npm run test:background
npm run test:orders
npm run test:support
npm run lint
```

Background unit tests use fake jobs and mocked HTTP; they do not mutate a
database, release real stock, send email, or enable a GitHub workflow. The actual
scheduled deployment must still be checked using the activation steps above.
