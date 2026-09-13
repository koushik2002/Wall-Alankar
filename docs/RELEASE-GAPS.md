# Release gaps and client dependencies

## Implemented foundation

- Approved desktop/mobile composition retained with Wall Alankar design tokens.
- Fifteen launch slots; Coming Soon entries cannot enter cart, invoice or Tally flows.
- Search, category/room filters, sorting, saved items, wall preview and shareable product paths.
- Branded About, Contact, Privacy, Terms and Delivery/Returns routes.
- Worker API, D1 migrations/seeds, central enquiry persistence, protected admin boundary, atomic stock lifecycle, immutable invoice schema, audit records and idempotent Tally-batch model.
- CI, reproducible local commands and Pages/Worker deployment instructions.

## Required before a production launch

- Client-approved product workbook and images for up to 15 real products. Current names, prices and imagery are illustrative.
- Accountant-approved GST inclusion method, HSN codes, rates, legal entity/GSTIN, invoice numbering, ledgers and Tally import acceptance.
- Confirmed authoritative inventory direction and named Tally operator.
- Client-owned Cloudflare access, D1 database ID, allowed staff emails and Pages project.
- Confirmed WhatsApp Business number/catalogue ownership and final canonical domain.
- Legal review of policy text, delivery/return rules and data-retention period.
- Complete admin product-import UI and binary XLSX generation/download. The Worker currently preserves and tests the exact A–AK data contract and immutable batch payloads, but production Tally enablement remains blocked until accountant mapping approval.
- Full shared-data browser suite, 100-user contention/load run, accessibility pass and launch smoke test against the deployed candidate.
