# Wall Alankar

Production foundation for the approved Wall Alankar editorial storefront. The frontend is React/Vite on Cloudflare Pages; shared catalogue, enquiry, order, inventory, invoice and Tally-batch data live behind a Cloudflare Worker and D1.

## Local setup

Requirements: Node.js 22+ and npm.

```bash
npm ci
cp .env.example .env.local
npm run db:migrate:local
npm run dev:api
```

In another terminal:

```bash
npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:8787` in `.env.local` to use shared D1 data. Without it, the storefront deliberately runs in disclosed local-demo mode for visual review.

## Verification

```bash
npm test
npm run build
# with npm run dev already running
npm run check
npm run preview
```

The browser check writes the desktop and mobile visual baselines to `deliverables/` and exercises stock limits, enquiry flow, order states, saved items, filters, Coming Soon safeguards, product routes and responsive overflow.

## D1

Create the production database once, copy its ID into `wrangler.toml`, then apply migrations:

```bash
npx wrangler d1 create wall-alankar-production
npm run db:migrate:remote
```

`0002_seed.sql` supplies four illustrative review products and eleven category-level Coming Soon entries. Replace seed rows with client-approved product data; Coming Soon rows have no SKU, price, stock or transaction effect.

See [Architecture](docs/ARCHITECTURE.md), [Deployment](docs/DEPLOYMENT.md), [Operations](docs/OPERATIONS.md), and [release gaps](docs/RELEASE-GAPS.md).

## Public GitHub Pages preview

The `deploy-pages.yml` workflow publishes the `production` branch at:

```text
https://koushik2002.github.io/Wall-Alankar/
```

In GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**. Every later push to `production` will verify and redeploy the public preview. GitHub Pages hosts the storefront in local-demo mode; the shared Worker/D1 production backend is deployed separately as described in `docs/DEPLOYMENT.md`.
