# Wall Alankar — approved visual baseline

Run `npm run dev` and open the localhost address it prints. Build with `npm run build`; preview the built site with `npm run preview`. Serve the site over HTTP, rather than opening `dist/index.html` directly.

The approved application composition is in `src/studio.jsx` and `src/studio.css`. Production architecture, setup and operating instructions are maintained in `README.md` and `docs/`.

## Implemented walkthrough

Collection/category/room/search/price filters; saved items; product detail modal; stock-limited cart; removal; customer details and pending WhatsApp request; explicit WhatsApp handoff; wall colour and size preview; local wall photo preview; consultation/custom-project/showroom/contact links; inventory export; pending/confirmed/cancelled/returned orders; printable sales invoices; built-in sample invoice; item-wise confirmed-sales report and CSV export; stock adjustment; movement ledger; simulated Tally queue; local state persistence; responsive layout.

Orders deduct inventory only when confirmed. Returning a confirmed order restores stock. Pending cancellation leaves stock unchanged. Adjusting inventory also limits existing cart quantities. Repeated confirmations and returns are guarded by order status.

When `VITE_API_BASE_URL` is absent this remains a disclosed local visual-review mode, stored under `wall-alankar-studio-v2`. With the Worker configured, catalogue, enquiries, administrative order actions, inventory movements, invoice snapshots and Tally batches use shared D1 data. Wall photos remain local and are not attached automatically to WhatsApp. The room preview is a mood/scale study, not AR or a precise installation measurement.

The invoice is a sample layout, not yet a legally complete GST tax invoice. Business GSTIN, legal name, HSN/SAC codes, tax treatment, bank/payment details, terms and numbering policy must be confirmed before launch. Item-wise sales include confirmed orders only; returned and cancelled orders are excluded.

## Design references

- Poliform: https://www.poliform.it/en/ — collection navigation and interior imagery.
- Viya: https://viyadesign.com/ — object discovery, wishlist and enquiry journey.
- WITHIN: https://within.net.in/ — showroom and material storytelling.

## Imagery

Web photographs were downloaded locally from Pexels. They illustrate interiors, not verified Wall Alankar inventory:

- `gallery-room.jpg`: https://www.pexels.com/photo/rectangular-white-wood-framed-wall-mirror-373578/ — page marks the image CC0.
- `gallery-mirror.jpg`: Max Vakhtbovych, https://www.pexels.com/photo/wooden-framed-mirror-on-the-wall-7749059/
- `gallery-canvas.jpg`: Aljona Ovtšinnikova, https://www.pexels.com/photo/mirror-and-couch-in-room-18601973/

Reused concept images: `wall-alankar-hero.webp`, `wall-alankar-craft.webp` (optimized from earlier built-in image-generation outputs). `foyer-2026.webp` was generated earlier and optimized for the web. The original PNG copies remain recoverable from the supplied source archive but are intentionally excluded from the deployable app.

Foyer prompt: Original architectural editorial photograph for a Bengaluru wall décor studio; landscape 16:9, round aged-brass mirror, pale terracotta lime plaster, walnut console, ivory vase, morning sun, realistic reflections, no text/branding. Tool: built-in image generation. Saved to `public/images/foyer-2026.png`.

All displayed products, quantities, prices and specifications are illustrative. Real catalogue assets still need to replace them before launch. The brand/contact information follows the supplied business card.

## Verification and video

`node scripts/check.mjs` runs Chrome interaction checks and captures desktop/mobile previews. `node scripts/walkthrough.mjs` records a fresh browser session with 12 chapters, generates synthetic narration with macOS Samantha, and encodes H.264 video with AAC audio. It does not open or send WhatsApp messages. Requires installed Chrome, macOS `say`, Playwright and FFmpeg (development dependencies).

Outputs: `deliverables/Wall-Alankar-Walkthrough.mp4`, `deliverables/narration.txt`, `deliverables/recording/chapters.json`, screenshots and a sample inventory export. Tally simulation and illustrative products are disclosed in the narration.
