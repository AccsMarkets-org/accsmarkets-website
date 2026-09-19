# AccsMarkets — Cron / Scheduled Tasks

All periodic maintenance tasks are implemented as Next.js API route handlers
called by an external scheduler (e.g. cron, Render cron jobs, GitHub Actions
scheduled workflow, or a server cron with `curl`).

## Endpoint authentication

Every sweep endpoint accepts a bearer token in the `Authorization` header:

```
Authorization: Bearer <SWEEP_SECRET>
```

Set `SWEEP_SECRET` in your environment. The handler returns `403` if the token
is missing or wrong.

---

## Registered sweeps — `POST /api/sweep`

| Frequency | `task` body value | What it does |
|-----------|-------------------|--------------|
| Every 5 min | `expire_offers` | Sets PENDING Offer rows past `expiresAt` → EXPIRED |
| Every 15 min | `expire_promotions` | Clears `isFeatured`/`isPinned` on Listings past `featuredUntil`/`pinnedUntil` |
| Hourly | `expire_escrow_deadlines` | Cancels FUNDED/SUBMITTED Escrows past `transferDeadline` |
| Hourly | `expire_listings` | Moves ACTIVE Listings unsold for > 90 days → EXPIRED |
| Daily | `expire_subscriptions` | Removes plan from Users with `subscriptionExpiresAt` in the past |
| Daily | `prune_rate_limits` | Deletes RateLimitEvent rows older than 24 hours |
| Daily | `prune_sessions` | Deletes ActiveSession rows not seen in 30 days |

### Example crontab (server)

```cron
*/5  *  *  *  *  curl -s -X POST https://accsmarkets.com/api/sweep -H "Authorization: Bearer $SWEEP_SECRET" -H "Content-Type: application/json" -d '{"task":"expire_offers"}'
*/15 *  *  *  *  curl -s -X POST https://accsmarkets.com/api/sweep -H "Authorization: Bearer $SWEEP_SECRET" -H "Content-Type: application/json" -d '{"task":"expire_promotions"}'
0    *  *  *  *  curl -s -X POST https://accsmarkets.com/api/sweep -H "Authorization: Bearer $SWEEP_SECRET" -H "Content-Type: application/json" -d '{"task":"expire_escrow_deadlines"}'
0    *  *  *  *  curl -s -X POST https://accsmarkets.com/api/sweep -H "Authorization: Bearer $SWEEP_SECRET" -H "Content-Type: application/json" -d '{"task":"expire_listings"}'
0    2  *  *  *  curl -s -X POST https://accsmarkets.com/api/sweep -H "Authorization: Bearer $SWEEP_SECRET" -H "Content-Type: application/json" -d '{"task":"expire_subscriptions"}'
30   2  *  *  *  curl -s -X POST https://accsmarkets.com/api/sweep -H "Authorization: Bearer $SWEEP_SECRET" -H "Content-Type: application/json" -d '{"task":"prune_rate_limits"}'
30   3  *  *  *  curl -s -X POST https://accsmarkets.com/api/sweep -H "Authorization: Bearer $SWEEP_SECRET" -H "Content-Type: application/json" -d '{"task":"prune_sessions"}'
```

### Example GitHub Actions scheduled workflow

```yaml
name: Sweeps
on:
  schedule:
    - cron: "*/15 * * * *"   # expire_offers + expire_promotions
    - cron: "0 * * * *"      # expire_escrow_deadlines + expire_listings
    - cron: "0 2 * * *"      # expire_subscriptions
    - cron: "30 3 * * *"     # prune_rate_limits + prune_sessions
jobs:
  sweep:
    runs-on: ubuntu-latest
    steps:
      - name: Run sweep
        run: |
          curl -s -X POST ${{ secrets.APP_URL }}/api/sweep \
            -H "Authorization: Bearer ${{ secrets.SWEEP_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{"task":"expire_offers"}'
```

---

## Blog AI generation (optional)

Automated blog drafts can be queued by POSTing to `POST /api/admin/blog/generate`
with an admin session. This is not a sweep endpoint — trigger it manually or via
an admin script.

---

## Database migrations

Run migrations before each deployment:

```bash
npx prisma migrate deploy
```

The `docker-compose.yml` runs this automatically as part of the app container
start command.
