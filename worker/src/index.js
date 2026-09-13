const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

const id = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const clean = (value) => String(value ?? "").trim();
const integer = (value) =>
  Number.isSafeInteger(Number(value)) ? Number(value) : NaN;
const csv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const TALLY_HEADERS = [
  "Voucher Type",
  "Invoice #",
  "Invoice Date",
  "Reference",
  "Party Code",
  "Party Name",
  "SUPPLEMNETARY NAME",
  "GST #",
  "Address 1",
  "Address 2",
  "Address 3",
  "Address 4",
  "Country",
  "State",
  "Blank 1",
  "Blank 2",
  "Blank 3",
  "Blank 4",
  "Blank 5",
  "Narration",
  "Voucher Amount",
  "Sales @ 5%",
  "SGST @ 2.5%",
  "CGST @ 2.5%",
  "Sales @ 12%",
  "SGST @ 6%",
  "CGST @ 6%",
  "Sales @ 18%",
  "SGST @ 9%",
  "CGST @ 9%",
  "IGST Sales @ 5%",
  "IGST @ 5%",
  "IGST Sales @ 18%",
  "IGST @ 18%",
  "Transportation",
  "Discount",
  "Round Off",
];

function cors(request, env) {
  const origin = request.headers.get("origin");
  return origin && origin === env.PUBLIC_SITE_URL
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        vary: "origin",
      }
    : {};
}

function adminEmail(request, env) {
  const email = clean(
    request.headers.get("Cf-Access-Authenticated-User-Email"),
  ).toLowerCase();
  const allowed = clean(env.ADMIN_EMAILS)
    .toLowerCase()
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return email && allowed.includes(email) ? email : null;
}

async function catalogue(request, env) {
  const url = new URL(request.url);
  const page = Math.max(1, integer(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    24,
    Math.max(1, integer(url.searchParams.get("pageSize")) || 12),
  );
  const search = `%${clean(url.searchParams.get("search"))}%`;
  const category = clean(url.searchParams.get("category"));
  const room = clean(url.searchParams.get("room"));
  const filters = [
    "p.status IN ('active','coming_soon')",
    "(p.name LIKE ? OR COALESCE(p.sku,'') LIKE ?)",
  ];
  const binds = [search, search];
  if (category) {
    filters.push("c.slug = ?");
    binds.push(category);
  }
  if (room) {
    filters.push("p.room = ?");
    binds.push(room);
  }
  const where = filters.join(" AND ");
  const base = `FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN product_variants v ON v.product_id=p.id AND v.active=1 LEFT JOIN inventory_balances i ON i.variant_id=v.id WHERE ${where}`;
  const total = await env.DB.prepare(
    `SELECT COUNT(DISTINCT p.id) total ${base}`,
  )
    .bind(...binds)
    .first("total");
  const rows = await env.DB.prepare(
    `SELECT p.id,p.slug,p.sku,p.name,c.name category,p.room,p.style,p.material,p.dimensions,p.primary_image_url image,p.status,v.price_minor,COALESCE(i.quantity,0) stock ${base} ORDER BY c.sort_order,p.id LIMIT ? OFFSET ?`,
  )
    .bind(...binds, pageSize, (page - 1) * pageSize)
    .all();
  return { items: rows.results, page, pageSize, total };
}

async function createEnquiry(request, env) {
  const body = await request.json().catch(() => null);
  const customer = body?.customer || {};
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (
    !clean(customer.name) ||
    !/^[-+() 0-9]{10,18}$/.test(clean(customer.phone)) ||
    !clean(customer.cityPin)
  ) {
    return json(
      {
        error: "Name, a valid phone number and city or PIN code are required.",
      },
      400,
    );
  }
  if (!rawItems.length || rawItems.length > 25)
    return json({ error: "Choose at least one available product." }, 400);
  const items = [];
  for (const raw of rawItems) {
    const quantity = integer(raw.quantity);
    if (!clean(raw.sku) || quantity < 1 || quantity > 20)
      return json({ error: "Every item needs a valid SKU and quantity." }, 400);
    const row = await env.DB.prepare(
      `SELECT v.id variant_id,v.sku,v.price_minor,p.name,COALESCE(i.quantity,0) stock FROM product_variants v JOIN products p ON p.id=v.product_id LEFT JOIN inventory_balances i ON i.variant_id=v.id WHERE v.sku=? AND v.active=1 AND p.status='active'`,
    )
      .bind(clean(raw.sku))
      .first();
    if (!row || row.stock < quantity)
      return json(
        { error: `${clean(raw.sku)} is no longer available in that quantity.` },
        409,
      );
    if (integer(raw.displayedUnitPriceMinor) !== row.price_minor)
      return json(
        {
          error: `The price of ${row.name} changed. Please review your selection.`,
        },
        409,
      );
    items.push({ ...row, quantity });
  }
  const enquiryId = `WA-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const total = items.reduce(
    (sum, item) => sum + item.price_minor * item.quantity,
    0,
  );
  const statements = [
    env.DB.prepare(
      "INSERT INTO enquiries (id,customer_name,phone,city_pin,displayed_total_minor) VALUES (?,?,?,?,?)",
    ).bind(
      enquiryId,
      clean(customer.name),
      clean(customer.phone),
      clean(customer.cityPin),
      total,
    ),
    env.DB.prepare("INSERT INTO orders (id,enquiry_id) VALUES (?,?)").bind(
      enquiryId,
      enquiryId,
    ),
    ...items.map((item) =>
      env.DB.prepare(
        "INSERT INTO order_items (order_id,variant_id,sku,product_name,quantity,displayed_unit_price_minor) VALUES (?,?,?,?,?,?)",
      ).bind(
        enquiryId,
        item.variant_id,
        item.sku,
        item.name,
        item.quantity,
        item.price_minor,
      ),
    ),
    env.DB.prepare(
      "INSERT INTO audit_events (id,action,entity_type,entity_id,detail_json) VALUES (?,?,?,?,?)",
    ).bind(
      id("audit"),
      "enquiry.created",
      "enquiry",
      enquiryId,
      JSON.stringify({ itemCount: items.length, total }),
    ),
  ];
  await env.DB.batch(statements);
  const productUrl = `${env.PUBLIC_SITE_URL}/products/${body.items[0]?.slug || ""}`;
  const lines = items.map(
    (item) =>
      `${item.quantity} x ${item.sku} - ${item.name} - ₹${(item.price_minor / 100).toLocaleString("en-IN")}`,
  );
  const message = [
    `Hello Wall Alankar, I would like to check availability for request ${enquiryId}.`,
    ...lines,
    `Estimated product total: ₹${(total / 100).toLocaleString("en-IN")}`,
    `Customer: ${clean(customer.name)}`,
    `Delivery location: ${clean(customer.cityPin)}`,
    `Product link: ${productUrl}`,
    "Please confirm stock, delivery charges and the next steps.",
  ].join("\n");
  return json(
    {
      id: enquiryId,
      totalMinor: total,
      whatsappUrl: `https://wa.me/${env.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    },
    201,
  );
}

async function listOrders(env) {
  const rows = await env.DB.prepare(
    `SELECT o.id,o.status,o.created_at,e.customer_name,e.phone,e.city_pin,e.displayed_total_minor FROM orders o JOIN enquiries e ON e.id=o.enquiry_id ORDER BY o.created_at DESC LIMIT 100`,
  ).all();
  const items = [];
  for (const order of rows.results) {
    const lines = await env.DB.prepare(
      "SELECT variant_id id,sku,product_name name,quantity qty,displayed_unit_price_minor price_minor FROM order_items WHERE order_id=? ORDER BY id",
    )
      .bind(order.id)
      .all();
    items.push({ ...order, items: lines.results });
  }
  return { items };
}

async function confirmOrder(orderId, actor, env) {
  const order = await env.DB.prepare(
    "SELECT id FROM orders WHERE id=? AND status='pending'",
  )
    .bind(orderId)
    .first();
  if (!order)
    return json({ error: "Only a pending order can be confirmed." }, 409);
  const detail = await env.DB.prepare(
    `SELECT oi.id,oi.order_id,oi.variant_id,oi.sku,oi.product_name,oi.quantity AS ordered_quantity,oi.displayed_unit_price_minor,i.quantity AS available_quantity,p.hsn_code,p.gst_rate_bps FROM order_items oi JOIN inventory_balances i ON i.variant_id=oi.variant_id JOIN product_variants v ON v.id=oi.variant_id JOIN products p ON p.id=v.product_id WHERE oi.order_id=?`,
  )
    .bind(orderId)
    .all();
  if (!detail.results.length)
    return json({ error: "Order has no items." }, 409);
  for (const item of detail.results) {
    if (item.available_quantity < item.ordered_quantity)
      return json({ error: `Insufficient stock for ${item.sku}.` }, 409);
  }
  const enquiry = await env.DB.prepare("SELECT * FROM enquiries WHERE id=?")
    .bind(orderId)
    .first();
  const invoiceId = id("invoice");
  const invoiceNumber = `WA-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-8)}`;
  const subtotal = detail.results.reduce(
    (sum, item) =>
      sum + item.displayed_unit_price_minor * item.ordered_quantity,
    0,
  );
  const statements = [];
  for (const item of detail.results) {
    statements.push(
      env.DB.prepare(
        "UPDATE inventory_balances SET quantity=quantity-?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE variant_id=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='pending')",
      ).bind(item.ordered_quantity, item.variant_id, orderId),
    );
    statements.push(
      env.DB.prepare(
        "INSERT INTO stock_movements (id,variant_id,order_id,movement_type,quantity_delta,idempotency_key,actor_email) SELECT ?,?,?,'sale',?,?,? WHERE EXISTS (SELECT 1 FROM orders WHERE id=? AND status='pending')",
      ).bind(
        id("movement"),
        item.variant_id,
        orderId,
        -item.ordered_quantity,
        `confirm:${orderId}:${item.variant_id}`,
        actor,
        orderId,
      ),
    );
  }
  statements.push(
    env.DB.prepare(
      "INSERT INTO invoice_snapshots (id,invoice_number,order_id,customer_json,subtotal_minor,taxable_minor,total_minor) VALUES (?,?,?,?,?,?,?)",
    ).bind(
      invoiceId,
      invoiceNumber,
      orderId,
      JSON.stringify({
        name: enquiry.customer_name,
        phone: enquiry.phone,
        cityPin: enquiry.city_pin,
      }),
      subtotal,
      subtotal,
      subtotal,
    ),
  );
  for (const item of detail.results)
    statements.push(
      env.DB.prepare(
        "INSERT INTO invoice_lines (invoice_id,sku,product_name,hsn_code,quantity,unit_price_minor,taxable_minor,gst_rate_bps,line_total_minor) VALUES (?,?,?,?,?,?,?,?,?)",
      ).bind(
        invoiceId,
        item.sku,
        item.product_name,
        item.hsn_code,
        item.ordered_quantity,
        item.displayed_unit_price_minor,
        item.displayed_unit_price_minor * item.ordered_quantity,
        item.gst_rate_bps,
        item.displayed_unit_price_minor * item.ordered_quantity,
      ),
    );
  statements.push(
    env.DB.prepare(
      "UPDATE orders SET status='confirmed',confirmed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'",
    ).bind(orderId),
  );
  statements.push(
    env.DB.prepare(
      "UPDATE enquiries SET status='confirmed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'",
    ).bind(orderId),
  );
  statements.push(
    env.DB.prepare(
      "INSERT INTO audit_events (id,actor_email,action,entity_type,entity_id) VALUES (?,?,?,?,?)",
    ).bind(id("audit"), actor, "order.confirmed", "order", orderId),
  );
  try {
    await env.DB.batch(statements);
  } catch (error) {
    return json(
      {
        error: error.message.includes("CHECK constraint")
          ? "Stock changed during confirmation. Nothing was deducted."
          : "Confirmation failed safely. Nothing was changed.",
      },
      409,
    );
  }
  return json({ id: orderId, status: "confirmed", invoiceNumber });
}

async function reverseOrder(orderId, action, actor, env) {
  const expected = action === "return" ? "confirmed" : "pending";
  const final = action === "return" ? "returned" : "cancelled";
  const order = await env.DB.prepare(
    "SELECT id FROM orders WHERE id=? AND status=?",
  )
    .bind(orderId, expected)
    .first();
  if (!order)
    return json({ error: `Only a ${expected} order can be ${final}.` }, 409);
  const items = await env.DB.prepare(
    "SELECT variant_id,quantity FROM order_items WHERE order_id=?",
  )
    .bind(orderId)
    .all();
  const statements = [];
  if (action === "return")
    for (const item of items.results) {
      statements.push(
        env.DB.prepare(
          "UPDATE inventory_balances SET quantity=quantity+?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE variant_id=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='confirmed')",
        ).bind(item.quantity, item.variant_id, orderId),
      );
      statements.push(
        env.DB.prepare(
          "INSERT INTO stock_movements (id,variant_id,order_id,movement_type,quantity_delta,idempotency_key,actor_email) SELECT ?,?,?,'return',?,?,? WHERE EXISTS (SELECT 1 FROM orders WHERE id=? AND status='confirmed')",
        ).bind(
          id("movement"),
          item.variant_id,
          orderId,
          item.quantity,
          `return:${orderId}:${item.variant_id}`,
          actor,
          orderId,
        ),
      );
    }
  statements.push(
    env.DB.prepare(
      `UPDATE orders SET status=?,${action === "return" ? "returned_at" : "cancelled_at"}=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?`,
    ).bind(final, orderId, expected),
  );
  statements.push(
    env.DB.prepare(
      "UPDATE enquiries SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?",
    ).bind(final, orderId, expected),
  );
  statements.push(
    env.DB.prepare(
      "INSERT INTO audit_events (id,actor_email,action,entity_type,entity_id) VALUES (?,?,?,?,?)",
    ).bind(id("audit"), actor, `order.${final}`, "order", orderId),
  );
  await env.DB.batch(statements);
  return json({ id: orderId, status: final });
}

async function adjustInventory(sku, request, actor, env) {
  const body = await request.json().catch(() => null);
  const delta = integer(body?.delta);
  const reason = clean(body?.reason);
  if (
    !Number.isInteger(delta) ||
    delta === 0 ||
    Math.abs(delta) > 10000 ||
    reason.length < 3
  )
    return json(
      {
        error: "A non-zero whole quantity and adjustment reason are required.",
      },
      400,
    );
  const variant = await env.DB.prepare(
    "SELECT v.id,i.quantity FROM product_variants v JOIN inventory_balances i ON i.variant_id=v.id WHERE v.sku=? AND v.active=1",
  )
    .bind(sku)
    .first();
  if (!variant) return json({ error: "Active SKU not found." }, 404);
  try {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE inventory_balances SET quantity=quantity+?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE variant_id=?",
      ).bind(delta, variant.id),
      env.DB.prepare(
        "INSERT INTO stock_movements (id,variant_id,movement_type,quantity_delta,reason,idempotency_key,actor_email) VALUES (?,?,'adjustment',?,?,?,?)",
      ).bind(
        id("movement"),
        variant.id,
        delta,
        reason,
        id("adjustment"),
        actor,
      ),
      env.DB.prepare(
        "INSERT INTO audit_events (id,actor_email,action,entity_type,entity_id,detail_json) VALUES (?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "inventory.adjusted",
        "variant",
        String(variant.id),
        JSON.stringify({
          sku,
          delta,
          reason,
          previousQuantity: variant.quantity,
        }),
      ),
    ]);
  } catch (error) {
    return json(
      {
        error: error.message.includes("CHECK constraint")
          ? "Stock cannot be adjusted below zero."
          : "Adjustment failed safely.",
      },
      409,
    );
  }
  return json({ sku, quantity: variant.quantity + delta });
}

function validateTallyInvoice(invoice, lines) {
  const unsupported = lines.find(
    (line) =>
      line.gst_rate_bps == null ||
      !line.hsn_code ||
      ![500, 1200, 1800].includes(line.gst_rate_bps),
  );
  if (unsupported)
    return `Invoice ${invoice.invoice_number}: ${unsupported.sku} needs an accountant-approved HSN and supported GST rate.`;
  return null;
}

async function prepareTally(actor, env) {
  const invoices = await env.DB.prepare(
    `SELECT i.* FROM invoice_snapshots i WHERE NOT EXISTS (SELECT 1 FROM tally_export_invoices x JOIN tally_export_batches b ON b.id=x.batch_id WHERE x.invoice_id=i.id AND b.status IN ('prepared','downloaded','confirmed_imported')) ORDER BY i.created_at`,
  ).all();
  const sales = [TALLY_HEADERS.map(csv).join(",")];
  for (const invoice of invoices.results) {
    const lines = await env.DB.prepare(
      "SELECT * FROM invoice_lines WHERE invoice_id=?",
    )
      .bind(invoice.id)
      .all();
    const error = validateTallyInvoice(invoice, lines.results);
    if (error) return json({ error }, 422);
    // One reconciled voucher row; tax-ledger columns are populated from frozen snapshots.
    const customer = JSON.parse(invoice.customer_json);
    const values = Array(37).fill("");
    Object.assign(values, {
      0: "Sales",
      1: invoice.invoice_number,
      2: invoice.created_at.slice(0, 10),
      3: invoice.order_id,
      5: customer.name,
      11: "India",
      12: "Karnataka",
      19: `Website order ${invoice.order_id}`,
      20: invoice.total_minor / 100,
      34: invoice.delivery_minor / 100,
      35: -(invoice.discount_minor / 100),
      36: invoice.rounding_minor / 100,
    });
    for (const line of lines.results) {
      const interstate = line.igst_minor > 0;
      const map =
        line.gst_rate_bps === 500
          ? interstate
            ? [30, 31]
            : [21, 22, 23]
          : line.gst_rate_bps === 1200
            ? [24, 25, 26]
            : interstate
              ? [32, 33]
              : [27, 28, 29];
      values[map[0]] = Number(values[map[0]] || 0) + line.taxable_minor / 100;
      if (interstate)
        values[map[1]] = Number(values[map[1]] || 0) + line.igst_minor / 100;
      else {
        values[map[1]] = Number(values[map[1]] || 0) + line.sgst_minor / 100;
        values[map[2]] = Number(values[map[2]] || 0) + line.cgst_minor / 100;
      }
    }
    sales.push(values.map(csv).join(","));
  }
  const inventory = await env.DB.prepare(
    `SELECT v.sku,p.name,i.quantity FROM inventory_balances i JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id ORDER BY v.sku`,
  ).all();
  const inventoryCsv = [
    "SKU,Product,Quantity",
    ...inventory.results.map((row) =>
      [row.sku, row.name, row.quantity].map(csv).join(","),
    ),
  ].join("\n");
  const salesCsv = sales.join("\n");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(inventoryCsv + "\n" + salesCsv),
  );
  const hash = [...new Uint8Array(digest)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  const batchId = id("batch");
  const batchNumber = `TALLY-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}`;
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO tally_export_batches (id,batch_number,inventory_payload,sales_payload,content_sha256,prepared_by) VALUES (?,?,?,?,?,?)",
    ).bind(batchId, batchNumber, inventoryCsv, salesCsv, hash, actor),
    ...invoices.results.map((invoice) =>
      env.DB.prepare(
        "INSERT INTO tally_export_invoices (batch_id,invoice_id) VALUES (?,?)",
      ).bind(batchId, invoice.id),
    ),
    env.DB.prepare(
      "INSERT INTO audit_events (id,actor_email,action,entity_type,entity_id,detail_json) VALUES (?,?,?,?,?,?)",
    ).bind(
      id("audit"),
      actor,
      "tally.prepared",
      "tally_batch",
      batchId,
      JSON.stringify({ invoiceCount: invoices.results.length, hash }),
    ),
  ]);
  return json({
    id: batchId,
    batchNumber,
    invoiceCount: invoices.results.length,
    hash,
  });
}

export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    let response;
    try {
      if (request.method === "GET" && url.pathname === "/api/products")
        response = json(await catalogue(request, env));
      else if (request.method === "POST" && url.pathname === "/api/enquiries")
        response = await createEnquiry(request, env);
      else if (url.pathname.startsWith("/api/admin/")) {
        const actor = adminEmail(request, env);
        if (!actor)
          response = json(
            {
              error:
                "Administrative access requires an approved Cloudflare Access identity.",
            },
            401,
          );
        else if (
          request.method === "GET" &&
          url.pathname === "/api/admin/orders"
        )
          response = json(await listOrders(env));
        else if (
          request.method === "POST" &&
          /^\/api\/admin\/orders\/[^/]+\/confirm$/.test(url.pathname)
        )
          response = await confirmOrder(
            decodeURIComponent(url.pathname.split("/")[4]),
            actor,
            env,
          );
        else if (
          request.method === "POST" &&
          /^\/api\/admin\/orders\/[^/]+\/(cancel|return)$/.test(url.pathname)
        )
          response = await reverseOrder(
            decodeURIComponent(url.pathname.split("/")[4]),
            url.pathname.split("/")[5],
            actor,
            env,
          );
        else if (
          request.method === "POST" &&
          /^\/api\/admin\/inventory\/[^/]+\/adjust$/.test(url.pathname)
        )
          response = await adjustInventory(
            decodeURIComponent(url.pathname.split("/")[4]),
            request,
            actor,
            env,
          );
        else if (
          request.method === "POST" &&
          url.pathname === "/api/admin/tally-batches"
        )
          response = await prepareTally(actor, env);
        else response = json({ error: "Not found" }, 404);
      } else response = json({ error: "Not found" }, 404);
    } catch (error) {
      response = json(
        {
          error: "Unexpected server error",
          requestId: request.headers.get("cf-ray") || crypto.randomUUID(),
        },
        500,
      );
    }
    const next = new Response(response.body, response);
    Object.entries(headers).forEach(([key, value]) =>
      next.headers.set(key, value),
    );
    return next;
  },
};

export { TALLY_HEADERS };
