# Architecture

## Launch topology

- Cloudflare Pages serves the public React/Vite storefront and optimized static imagery.
- A Cloudflare Worker owns validation, authorization and business rules under `/api`.
- D1 is the shared source of truth for products, enquiries, orders, stock, immutable invoices, Tally batches and audit events.
- Guest cart, saved objects and local wall-photo preview may remain in the browser. A wall photo is not uploaded by the current launch flow.
- R2 and direct Tally/WhatsApp Business Platform integrations remain later seams.

## Invariants

- Enquiry creation revalidates SKU, price and availability, commits the enquiry and order, and only then returns a WhatsApp URL.
- Enquiries do not deduct or reserve stock.
- Confirmation is idempotent by order status and movement keys. A D1 atomic batch and `quantity >= 0` database constraint prevent negative inventory under contention.
- Pending cancellation does not touch inventory. A confirmed return restores it once.
- Invoice customer, line and amount data are copied into snapshot tables. Later catalogue edits cannot change history.
- Missing HSN/GST data leaves the printable document in demo/non-tax state and blocks Tally preparation with an actionable error.
- Tally payloads and SHA-256 hashes are stored on the batch so re-downloads can return identical bytes.

## Administrative boundary

Protect `/admin/*` in Cloudflare Access and allow only named staff emails. The Worker separately requires the trusted `Cf-Access-Authenticated-User-Email` header and checks it against the secret `ADMIN_EMAILS` allowlist. A public client-side flag never authorizes API access.

