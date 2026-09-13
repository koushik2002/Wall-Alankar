# Deployment and rollback

## Pages

1. In the client-owned Cloudflare account, create a Pages project connected only to the client-owned GitHub repository.
2. Production branch: `production`; build command: `npm run build`; output directory: `dist`.
3. Add `VITE_API_BASE_URL` as a Pages environment variable. Do not commit credentials.
4. Enable pull-request preview deployments. The included `_redirects` file keeps product and policy routes shareable.
5. Use the generated `pages.dev` HTTPS URL for acceptance, then attach the client-owned custom domain without changing code.

## Worker and D1

1. Run `npx wrangler login` in the client-owned Cloudflare account.
2. Run `npx wrangler d1 create wall-alankar-production` and replace the placeholder database ID in `wrangler.toml`.
3. Store `ADMIN_EMAILS` as a Worker secret. Configure the public Pages origin and business-owned WhatsApp number as environment variables.
4. Run `npm run db:migrate:remote`, then `npm run deploy:worker`.
5. Create a Cloudflare Access self-hosted application for `/admin/*`, restricted to the approved staff identities.

## Rollback

- Pages: choose the last accepted production deployment and select **Rollback to this deployment**.
- Worker: deploy the last accepted Git commit. Never reverse a D1 migration destructively; add a forward corrective migration.
- Before schema changes, create a D1 backup/bookmark and record it in the release log.

