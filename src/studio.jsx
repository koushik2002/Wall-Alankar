import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Minus,
  X,
  Heart,
  ShoppingBag,
  Search,
  Check,
  MessageCircle,
  SlidersHorizontal,
  Package,
  RefreshCw,
  LayoutDashboard,
  Download,
  Menu,
  ReceiptText,
  BarChart3,
  Printer,
} from "lucide-react";
import "./studio.css";
import { launchProducts } from "./data/products.js";
import { api } from "./lib/api.js";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
const appPath = () => {
  const path = location.pathname;
  if (BASE_PATH && path.startsWith(BASE_PATH))
    return path.slice(BASE_PATH.length) || "/";
  return path;
};
const routeUrl = (path) => `${BASE_PATH}${path}` || "/";
const assetUrl = (path) =>
  path?.startsWith("/images/") ? `${BASE_PATH}${path}` : path;

const INR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
const initial = launchProducts.map((product) => ({
  ...product,
  image: assetUrl(product.image),
}));
const storage = "wall-alankar-studio-v2";
const fresh = () => ({
  products: initial,
  cart: [],
  saved: [],
  orders: [],
  ledger: [],
  queue: 0,
});
function restore() {
  try {
    return JSON.parse(localStorage.getItem(storage)) || fresh();
  } catch {
    return fresh();
  }
}
const go = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
const STATIC_PAGES = {
  "/about": {
    eyebrow: "OUR STUDIO",
    title: "Objects that finish a room.",
    body: [
      "Wall Alankar is a Bengaluru home décor studio curating wall art, mirrors and collectible objects for considered interiors.",
      "We help customers choose scale, placement and finish through a personal WhatsApp conversation before a sale is confirmed.",
    ],
  },
  "/contact": {
    eyebrow: "VISIT OR WRITE",
    title: "Let’s talk about your wall.",
    body: [
      "Lal Sai Mansion, 134/1, Kengal Hanumanthaiah Road, Bengaluru — 560027.",
      "Call +91 91646 00045 or email info@wallalankar.com. Opening hours and visits are confirmed directly with the studio.",
    ],
  },
  "/privacy": {
    eyebrow: "PRIVACY",
    title: "Your details stay purposeful.",
    body: [
      "We collect the name, phone number, delivery location and selected products needed to answer an enquiry, confirm availability and fulfil a sale. A wall photo selected in the preview stays on your device unless you choose to share it separately.",
      "WhatsApp is a separate service with its own privacy terms. Contact info@wallalankar.com to request access, correction or deletion of your enquiry details, subject to accounting and legal retention requirements.",
    ],
  },
  "/terms": {
    eyebrow: "TERMS",
    title: "A request is not yet a sale.",
    body: [
      "Prices and availability shown on the website are revalidated by the studio. Submitting an enquiry or opening WhatsApp does not reserve stock, create a confirmed sale or take payment.",
      "A sale is confirmed only after Wall Alankar agrees the product, delivery, taxes and payment with you. Product colours and scale may vary by screen and setting.",
    ],
  },
  "/shipping-returns": {
    eyebrow: "DELIVERY & RETURNS",
    title: "Handled with the object in mind.",
    body: [
      "Delivery availability, charges, installation needs and timing are confirmed for each request before the sale. Please inspect an item at delivery and report transit damage immediately.",
      "Return eligibility depends on the confirmed item and whether it is custom-made. The final return window, exclusions and reverse-delivery terms must be agreed with the client before launch.",
    ],
  },
};

function StaticPage({ page }) {
  return (
    <main className="static-page">
      <a className="wordmark" href={routeUrl("/")}>
        wall alankar<span>OBJECTS & SPACES</span>
      </a>
      <section>
        <span className="overline">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        {page.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <a className="underlined" href={routeUrl("/")}>
          Back to the collection <ArrowUpRight />
        </a>
      </section>
    </main>
  );
}
const mapServerOrder = (order) => ({
  id: order.id,
  status: order.status[0].toUpperCase() + order.status.slice(1),
  createdAt: order.created_at,
  customer: {
    name: order.customer_name,
    phone: order.phone,
    city: order.city_pin,
  },
  total: order.displayed_total_minor / 100,
  items: order.items.map((item) => ({
    ...item,
    price: item.price_minor / 100,
  })),
});
function App() {
  const initialSlug = appPath().match(/^\/products\/([^/]+)\/?$/)?.[1];
  const [db, setDb] = useState(restore),
    [admin, setAdmin] = useState(() => appPath().startsWith("/admin")),
    [panel, setPanel] = useState(null),
    [detail, setDetail] = useState(
      () => initial.find((p) => p.slug === initialSlug)?.id || null,
    ),
    [category, setCategory] = useState("All objects"),
    [room, setRoom] = useState("Every room"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("Curated"),
    [priceBand, setPriceBand] = useState("Any price"),
    [availability, setAvailability] = useState("All availability"),
    [onlySaved, setOnlySaved] = useState(false),
    [notice, setNotice] = useState(""),
    [customer, setCustomer] = useState({ name: "", phone: "", city: "" }),
    [request, setRequest] = useState(null),
    [tab, setTab] = useState("Overview"),
    [adjust, setAdjust] = useState(null),
    [invoice, setInvoice] = useState(null),
    [delta, setDelta] = useState(1),
    [adjustReason, setAdjustReason] = useState(""),
    [syncing, setSyncing] = useState(false),
    [wall, setWall] = useState("#d6c5b2"),
    [width, setWidth] = useState(240),
    [artWidth, setArtWidth] = useState(100),
    [preview, setPreview] = useState(null),
    [plannerProduct, setPlannerProduct] = useState(1),
    [serverOrders, setServerOrders] = useState(null),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    localStorage.setItem(storage, JSON.stringify(db));
  }, [db]);
  useEffect(() => {
    if (!api.configured) return;
    api
      .products({ pageSize: 24 })
      .then(({ items }) =>
        setDb((state) => {
          const products = items.map((product) => ({
            id: product.id,
            slug: product.slug,
            sku: product.sku,
            name: product.name,
            type: product.category,
            room: product.room,
            style: product.style,
            material: product.material,
            size: product.dimensions,
            image: assetUrl(product.image),
            price:
              product.price_minor == null ? null : product.price_minor / 100,
            stock: product.stock,
            comingSoon: product.status === "coming_soon",
          }));
          const ids = new Set(products.map((product) => product.id));
          return {
            ...state,
            products,
            cart: state.cart.filter((line) => ids.has(line.id)),
          };
        }),
      )
      .catch((error) => setNotice(error.message));
  }, []);
  useEffect(() => {
    if (!api.configured || !admin) return;
    api
      .admin("/orders")
      .then(({ items }) => setServerOrders(items.map(mapServerOrder)))
      .catch((error) => setNotice(error.message));
  }, [admin]);
  useEffect(() => {
    if (admin || STATIC_PAGES[appPath()]) return;
    const product = db.products.find((p) => p.id === detail);
    if (!product && appPath() === "/shop") return;
    const next = product ? `/products/${product.slug}` : "/";
    if (appPath() !== next) history.pushState({}, "", routeUrl(next));
  }, [detail, db.products, admin]);
  useEffect(() => {
    if (appPath() === "/shop") setTimeout(() => go("collection"), 30);
  }, []);
  useEffect(() => {
    const pop = () => {
      const slug = appPath().match(/^\/products\/([^/]+)\/?$/)?.[1];
      setDetail(db.products.find((p) => p.slug === slug)?.id || null);
    };
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, [db.products]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    document.body.style.overflow =
      panel || detail || adjust || invoice ? "hidden" : "";
    const key = (e) => {
      if (e.key === "Escape") {
        setPanel(null);
        setDetail(null);
        setAdjust(null);
        setInvoice(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [panel, detail, adjust, invoice]);
  const inform = (msg) => setNotice(msg);
  const setQty = (id, d) =>
    setDb((s) => {
      const p = s.products.find((p) => p.id === id),
        old = s.cart.find((c) => c.id === id)?.qty || 0;
      if (!p || p.comingSoon) return s;
      const qty = Math.min(p.stock, Math.max(0, old + d));
      return {
        ...s,
        cart: [
          ...s.cart.filter((c) => c.id !== id),
          ...(qty ? [{ id, qty }] : []),
        ],
      };
    });
  const add = (id) => {
    setQty(id, 1);
    inform("Added to your selection");
  };
  const save = (id) =>
    setDb((s) => ({
      ...s,
      saved: s.saved.includes(id)
        ? s.saved.filter((x) => x !== id)
        : [...s.saved, id],
    }));
  const lines = db.cart.map((c) => ({
    ...c,
    p: db.products.find((p) => p.id === c.id),
  }));
  const count = lines.reduce((a, c) => a + c.qty, 0),
    total = lines.reduce((a, c) => a + c.p.price * c.qty, 0);
  const filtered = db.products
    .filter(
      (p) =>
        (category === "All objects" || p.type === category) &&
        (room === "Every room" || p.room === room) &&
        (!onlySaved || db.saved.includes(p.id)) &&
        (availability === "All availability" ||
          (availability === "Available now"
            ? !p.comingSoon && p.stock > 0
            : p.comingSoon)) &&
        (priceBand === "Any price" ||
          (!p.comingSoon &&
            (priceBand === "Under ₹10,000"
              ? p.price < 10000
              : priceBand === "₹10,000–₹15,000"
                ? p.price >= 10000 && p.price <= 15000
                : p.price > 15000))) &&
        `${p.name} ${p.type} ${p.style || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      if (a.comingSoon !== b.comingSoon) return a.comingSoon ? 1 : -1;
      if (sort === "Price: low to high") return a.price - b.price;
      if (sort === "Price: high to low") return b.price - a.price;
      return String(a.id).localeCompare(String(b.id), undefined, {
        numeric: true,
      });
    });
  const newMovement = (text, change) => ({
    id: crypto.randomUUID(),
    text,
    change,
    time: new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  const submit = async (e) => {
    e.preventDefault();
    if (
      !lines.length ||
      lines.some((c) => c.p.comingSoon || c.qty > c.p.stock)
    ) {
      inform("Stock changed. Please review your quantities.");
      return;
    }
    const order = {
      id: `WA-${Date.now().toString().slice(-6)}`,
      customer: { ...customer },
      items: lines.map((c) => ({
        id: c.id,
        slug: c.p.slug,
        sku: c.p.sku,
        qty: c.qty,
        quantity: c.qty,
        name: c.p.name,
        price: c.p.price,
        displayedUnitPriceMinor: c.p.price * 100,
      })),
      total,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    try {
      if (api.configured) {
        const saved = await api.createEnquiry({
          customer: {
            name: customer.name,
            phone: customer.phone,
            cityPin: customer.city,
          },
          items: order.items,
        });
        order.id = saved.id;
        order.whatsappUrl = saved.whatsappUrl;
      } else {
        order.demo = true;
      }
      setDb((s) => ({ ...s, cart: [], orders: [order, ...s.orders] }));
      setRequest(order);
      setPanel("request");
    } catch (error) {
      inform(error.message);
    }
  };
  const confirmLocal = (id) =>
    setDb((s) => {
      const o = s.orders.find((o) => o.id === id);
      if (!o || o.status !== "Pending") return s;
      if (
        o.items.some((c) => c.qty > s.products.find((p) => p.id === c.id).stock)
      ) {
        inform("Insufficient stock. Restock before confirming.");
        return s;
      }
      return {
        ...s,
        products: s.products.map((p) => ({
          ...p,
          stock: p.stock - (o.items.find((c) => c.id === p.id)?.qty || 0),
        })),
        orders: s.orders.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "Confirmed",
                confirmedAt: new Date().toISOString(),
              }
            : x,
        ),
        queue: s.queue + 1,
        ledger: [
          newMovement(
            `${id} · confirmed sale`,
            -o.items.reduce((n, c) => n + c.qty, 0),
          ),
          ...s.ledger,
        ],
      };
    });
  const reverseLocal = (id) =>
    setDb((s) => {
      const o = s.orders.find((o) => o.id === id);
      if (!o || !["Pending", "Confirmed"].includes(o.status)) return s;
      const returned = o.status === "Confirmed";
      return {
        ...s,
        products: s.products.map((p) => ({
          ...p,
          stock:
            p.stock +
            (returned ? o.items.find((c) => c.id === p.id)?.qty || 0 : 0),
        })),
        orders: s.orders.map((x) =>
          x.id === id
            ? { ...x, status: returned ? "Returned" : "Cancelled" }
            : x,
        ),
        queue: s.queue + (returned ? 1 : 0),
        ledger: [
          newMovement(
            `${id} · ${returned ? "returned and restocked" : "cancelled"}`,
            returned ? o.items.reduce((n, c) => n + c.qty, 0) : 0,
          ),
          ...s.ledger,
        ],
      };
    });
  const refreshServerState = async () => {
    const [{ items: orders }, { items: products }] = await Promise.all([
      api.admin("/orders"),
      api.products({ pageSize: 24 }),
    ]);
    setServerOrders(orders.map(mapServerOrder));
    setDb((state) => ({
      ...state,
      products: state.products.map((product) => {
        const current = products.find((row) => row.id === product.id);
        return current ? { ...product, stock: current.stock } : product;
      }),
    }));
  };
  const confirm = async (orderId) => {
    if (!api.configured) return confirmLocal(orderId);
    try {
      await api.adminAction(
        `/orders/${encodeURIComponent(orderId)}/confirm`,
        {},
      );
      await refreshServerState();
      inform("Sale confirmed and invoice snapshot created");
    } catch (error) {
      inform(error.message);
    }
  };
  const reverse = async (orderId) => {
    if (!api.configured) return reverseLocal(orderId);
    const order = serverOrders?.find((item) => item.id === orderId);
    const action = order?.status === "Confirmed" ? "return" : "cancel";
    try {
      await api.adminAction(
        `/orders/${encodeURIComponent(orderId)}/${action}`,
        {},
      );
      await refreshServerState();
      inform(
        action === "return"
          ? "Return recorded and stock restored"
          : "Pending request cancelled",
      );
    } catch (error) {
      inform(error.message);
    }
  };
  const updateStock = async (e) => {
    e.preventDefault();
    const product = db.products.find((p) => p.id === adjust);
    if (!adjustReason.trim()) {
      inform("Add a reason for the audit trail.");
      return;
    }
    if (api.configured) {
      try {
        await api.adminAction(
          `/inventory/${encodeURIComponent(product.sku)}/adjust`,
          { delta: Number(delta), reason: adjustReason.trim() },
        );
        await refreshServerState();
        setAdjust(null);
        setAdjustReason("");
        inform("Stock movement recorded");
      } catch (error) {
        inform(error.message);
      }
      return;
    }
    setDb((s) => {
      const p = s.products.find((p) => p.id === adjust),
        next = p.stock + Number(delta);
      if (!Number.isInteger(next) || next < 0) {
        inform("Stock cannot be negative.");
        return s;
      }
      return {
        ...s,
        products: s.products.map((x) =>
          x.id === p.id ? { ...x, stock: next } : x,
        ),
        cart: s.cart
          .map((c) =>
            c.id === p.id ? { ...c, qty: Math.min(c.qty, next) } : c,
          )
          .filter((c) => c.qty > 0),
        queue: s.queue + 1,
        ledger: [
          newMovement(`${p.name} · stock adjustment`, Number(delta)),
          ...s.ledger,
        ],
      };
    });
    setAdjust(null);
    setAdjustReason("");
  };
  const sync = async () => {
    if (api.configured) {
      setSyncing(true);
      try {
        const batch = await api.adminAction("/tally-batches", {});
        inform(
          `${batch.batchNumber} prepared with ${batch.invoiceCount} invoice(s)`,
        );
      } catch (error) {
        inform(error.message);
      } finally {
        setSyncing(false);
      }
      return;
    }
    setSyncing(true);
    setTimeout(() => {
      setDb((s) => ({
        ...s,
        queue: 0,
        ledger: [newMovement("Demo Tally queue synchronized", 0), ...s.ledger],
      }));
      setSyncing(false);
      inform("Demo sync complete");
    }, 1200);
  };
  const exportCSV = () => {
    const blob = new Blob(
        [
          "SKU,Product,Stock,Price\n" +
            db.products
              .filter((p) => !p.comingSoon)
              .map((p) => `${p.sku},${p.name},${p.stock},${p.price}`)
              .join("\n"),
        ],
        { type: "text/csv" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "wall-alankar-inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const operationalOrders = api.configured ? serverOrders || [] : db.orders;
  const sold = operationalOrders.filter((o) => o.status === "Confirmed");
  const salesRows = db.products
    .filter((p) => !p.comingSoon)
    .map((p) => {
      const orderLines = sold.flatMap((o) =>
        o.items.filter((i) => i.id === p.id),
      );
      return {
        sku: p.sku,
        name: p.name,
        qty: orderLines.reduce((n, i) => n + i.qty, 0),
        sales: orderLines.reduce((n, i) => n + i.qty * i.price, 0),
      };
    })
    .filter((r) => r.qty);
  const exportSales = () => {
    const blob = new Blob(
        [
          "SKU,Item,Quantity sold,Sales value\n" +
            salesRows
              .map(
                (r) =>
                  `${r.sku},"${r.name.replaceAll('"', '""')}",${r.qty},${r.sales}`,
              )
              .join("\n"),
        ],
        { type: "text/csv" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "wall-alankar-itemwise-sales.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const sampleOrder = {
    id: "WA-SAMPLE",
    customer: {
      name: "Sample Customer",
      phone: "+91 98765 43210",
      city: "Bengaluru · 560001",
    },
    items: [
      { id: 1, qty: 1, name: initial[0].name, price: initial[0].price },
      { id: 2, qty: 2, name: initial[1].name, price: initial[1].price },
    ],
    total: 44300,
    status: "Sample",
    confirmedAt: new Date().toISOString(),
  };
  const wa = (text) =>
    `https://wa.me/919164600045?text=${encodeURIComponent(text)}`;
  const nav = (id) => {
    setAdmin(false);
    const nextPath = id === "collection" ? "/shop" : "/";
    if (appPath() !== nextPath) history.pushState({}, "", routeUrl(nextPath));
    setMobile(false);
    setTimeout(() => go(id), 30);
  };
  const openAdmin = (orders = false) => {
    if (api.configured && !appPath().startsWith("/admin")) {
      location.assign(routeUrl(orders ? "/admin/?tab=orders" : "/admin/"));
      return;
    }
    setPanel(null);
    setAdmin(true);
    if (orders) setTab("Orders");
    window.scrollTo(0, 0);
  };
  const Qty = ({ p }) => {
    if (p.comingSoon)
      return (
        <a
          className="notify-small"
          href={wa(
            `Hello Wall Alankar, please notify me when ${p.name} is available.`,
          )}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          Notify on WhatsApp
        </a>
      );
    const q = db.cart.find((c) => c.id === p.id)?.qty || 0;
    return q ? (
      <div className="quantity">
        <button
          aria-label={`Remove one ${p.name}`}
          onClick={() => setQty(p.id, -1)}
        >
          <Minus size={15} />
        </button>
        <span>{q}</span>
        <button
          aria-label={`Add one ${p.name}`}
          disabled={q >= p.stock}
          onClick={() => setQty(p.id, 1)}
        >
          <Plus size={15} />
        </button>
      </div>
    ) : (
      <button
        className="add-circle"
        disabled={!p.stock}
        aria-label={`Add ${p.name} to cart`}
        onClick={() => add(p.id)}
      >
        <Plus size={19} />
      </button>
    );
  };
  const staticPage = STATIC_PAGES[appPath()];
  if (staticPage) return <StaticPage page={staticPage} />;
  return (
    <>
      <header className="navigation">
        <button className="wordmark" onClick={() => nav("home")}>
          wall alankar<span>OBJECTS & SPACES</span>
        </button>
        <nav className={mobile ? "is-open" : ""}>
          <button onClick={() => nav("collection")}>The collection</button>
          <button onClick={() => nav("planner")}>
            Style your wall <span className="new">NEW</span>
          </button>
          <button onClick={() => nav("story")}>Our approach</button>
        </nav>
        <div className="nav-tools">
          <button
            aria-label="Search collection"
            onClick={() => {
              nav("collection");
              setTimeout(() => document.getElementById("search")?.focus(), 100);
            }}
          >
            <Search />
          </button>
          <button
            aria-label="Saved objects"
            onClick={() => {
              setOnlySaved(!onlySaved);
              nav("collection");
            }}
          >
            <Heart fill={onlySaved ? "currentColor" : "none"} />
            <sup>{db.saved.length || ""}</sup>
          </button>
          <button aria-label="Open cart" onClick={() => setPanel("cart")}>
            <ShoppingBag />
            <sup>{count}</sup>
          </button>
          <button
            className="menu"
            aria-label="Menu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
        </div>
      </header>
      {!admin ? (
        <main id="home">
          <section className="opening">
            <div className="opening-top">
              <span>BENGALURU, INDIA</span>
              <span>A CONSIDERED COLLECTION / 2026</span>
            </div>
            <h1>
              Space, with <em>soul.</em>
              <span>↗</span>
            </h1>
            <div className="opening-photo">
              <img
                src={assetUrl("/images/foyer-2026.webp")}
                alt="Brass mirror above a walnut console in a warm sunlit interior"
                fetchPriority="high"
              />
              <div className="photo-note">
                <span>THE WARMTH EDIT — 01</span>
                <p>
                  A little less ordinary.
                  <br />A little more you.
                </p>
                <button onClick={() => nav("collection")}>
                  Find your finishing touch <ArrowUpRight />
                </button>
              </div>
              <button
                className="hotspot"
                aria-label="Explore Surya mirror"
                onClick={() => setDetail(2)}
              >
                <Plus /> <span>Surya brass mirror</span>
              </button>
              <span className="image-credit">CONCEPT INTERIOR</span>
            </div>
            <div className="opening-bottom">
              <span>WALL ART · MIRRORS · COLLECTIBLE OBJECTS</span>
              <p>
                Considered pieces. Personal conversations.
                <br />A home that feels unmistakably yours.
              </p>
              <button onClick={() => nav("collection")}>
                <span>EXPLORE</span>
                <ArrowRight />
              </button>
            </div>
          </section>
          <section id="collection" className="collection-section">
            <div className="section-top">
              <div>
                <span className="overline">01 / THE COLLECTION</span>
                <h2>
                  Good rooms start
                  <br />
                  with great <em>objects.</em>
                </h2>
              </div>
              <p>
                Find the piece that changes everything.
                <br />
                Choose it here. Make it yours on WhatsApp.
              </p>
            </div>
            <div className="catalogue-tools">
              <div className="tabs">
                {["All objects", "Metal art", "Mirrors", "Paintings"].map(
                  (c) => (
                    <button
                      key={c}
                      className={c === category ? "active" : ""}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ),
                )}
              </div>
              <div className="filter-controls">
                <label className="search">
                  <Search size={16} />
                  <input
                    id="search"
                    placeholder="Find an object"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Sort products"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option>Curated</option>
                  <option>Price: low to high</option>
                  <option>Price: high to low</option>
                </select>
                <select
                  aria-label="Filter by price"
                  value={priceBand}
                  onChange={(e) => setPriceBand(e.target.value)}
                >
                  <option>Any price</option>
                  <option>Under ₹10,000</option>
                  <option>₹10,000–₹15,000</option>
                  <option>Above ₹15,000</option>
                </select>
                <select
                  aria-label="Filter by availability"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                >
                  <option>All availability</option>
                  <option>Available now</option>
                  <option>Coming soon</option>
                </select>
              </div>
            </div>
            <div className="room-filter">
              <span>
                <SlidersHorizontal size={13} /> FOR YOUR
              </span>
              {["Every room", "Living", "Entryway", "Bedroom"].map((r) => (
                <button
                  className={room === r ? "active" : ""}
                  key={r}
                  onClick={() => setRoom(r)}
                >
                  {r}
                </button>
              ))}
              <button
                className={onlySaved ? "active" : ""}
                onClick={() => setOnlySaved(!onlySaved)}
              >
                ♡ Saved ({db.saved.length})
              </button>
            </div>
            <div className="objects">
              {filtered.map((p) => (
                <article
                  key={p.id}
                  className={`object-card ${p.comingSoon ? "coming-soon" : ""}`}
                >
                  <div className="object-photo">
                    <button
                      className="view-object"
                      onClick={() => setDetail(p.id)}
                      aria-label={`View ${p.name}`}
                    >
                      <img loading="lazy" src={p.image} alt={p.name} />
                    </button>
                    <span className="object-tag">
                      {p.comingSoon
                        ? "COMING SOON"
                        : p.stock
                          ? `SELECTED OBJECT / ${p.sku}`
                          : "OUT OF STOCK"}
                    </span>
                    <button
                      className="heart"
                      aria-label={`Save ${p.name}`}
                      aria-pressed={db.saved.includes(p.id)}
                      onClick={() => save(p.id)}
                    >
                      <Heart
                        size={18}
                        fill={db.saved.includes(p.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                  <div className="object-info">
                    <div>
                      <span>
                        {p.type}
                        {p.size ? ` · ${p.size}` : " · NEXT COLLECTION"}
                      </span>
                      <button onClick={() => setDetail(p.id)}>{p.name}</button>
                      <p>
                        {p.comingSoon ? (
                          <small>Preview only · no SKU or price</small>
                        ) : (
                          <>
                            {INR(p.price)}{" "}
                            <small>
                              {p.stock
                                ? `${p.stock} available`
                                : "Enquire for restock"}
                            </small>
                          </>
                        )}
                      </p>
                    </div>
                    <Qty p={p} />
                  </div>
                </article>
              ))}
            </div>
            {!filtered.length && (
              <div className="empty">
                <h3>No objects match just yet.</h3>
                <button
                  onClick={() => {
                    setCategory("All objects");
                    setRoom("Every room");
                    setQuery("");
                    setPriceBand("Any price");
                    setAvailability("All availability");
                    setOnlySaved(false);
                  }}
                >
                  Reset filters
                </button>
              </div>
            )}
            <p className="catalogue-note">
              Illustrative catalogue · final products, specifications and prices
              to be confirmed.
            </p>
          </section>
          <section id="planner" className="planner-section">
            <div className="planner-copy">
              <span className="overline">02 / WALL MATCH</span>
              <h2>
                Meet your wall’s
                <br />
                <em>better half.</em>
              </h2>
              <p>
                Try a colour. Find the right scale. Bring a little imagination
                to your space before you make a decision.
              </p>
              <label>
                Choose your object
                <select
                  aria-label="Planner object"
                  value={plannerProduct}
                  onChange={(e) => setPlannerProduct(Number(e.target.value))}
                >
                  {db.products.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="swatches">
                {["#d6c5b2", "#c49175", "#bcc3b6", "#e5dfd1"].map((c) => (
                  <button
                    aria-label={`Wall colour ${c}`}
                    aria-pressed={wall === c}
                    style={{ background: c }}
                    key={c}
                    onClick={() => setWall(c)}
                  />
                ))}
              </div>
              <label>
                Wall width <b>{width} cm</b>
                <input
                  aria-label="Wall width"
                  type="range"
                  min="160"
                  max="400"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </label>
              <label>
                Artwork width <b>{artWidth} cm</b>
                <input
                  aria-label="Artwork width"
                  type="range"
                  min="40"
                  max="150"
                  value={artWidth}
                  onChange={(e) => setArtWidth(Number(e.target.value))}
                />
              </label>
              <label className="upload">
                {preview
                  ? "✓ Your wall photo loaded"
                  : "＋ Try your own wall photo"}
                <input
                  aria-label="Upload wall photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    if (preview) URL.revokeObjectURL(preview);
                    setPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
              {preview && (
                <button
                  onClick={() => {
                    URL.revokeObjectURL(preview);
                    setPreview(null);
                  }}
                >
                  Remove photo
                </button>
              )}
              <a
                className="dark-button"
                href={wa(
                  `Hello Wall Alankar, please advise on ${db.products.find((p) => p.id === plannerProduct).name} for a ${width} cm wall. My preferred artwork width is ${artWidth} cm.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Get a personal recommendation <ArrowUpRight />
              </a>
              <small>
                Approximate layout preview. Attach your photo separately in
                WhatsApp.
              </small>
            </div>
            <div
              className="wall-preview"
              style={{
                backgroundColor: wall,
                backgroundImage: preview ? `url(${preview})` : undefined,
              }}
            >
              <span className="preview-label">YOUR SPACE, REIMAGINED</span>
              <img
                className="preview-art"
                style={{ width: `${(artWidth / width) * 100}%` }}
                src={db.products.find((p) => p.id === plannerProduct).image}
                alt="Selected object preview"
              />
              {!preview && (
                <div className="preview-console">
                  <i />
                  <i />
                </div>
              )}
              <span className="dimension">← {width} cm →</span>
              <span className="preview-disclaimer">
                Mood & scale study / illustrative
              </span>
            </div>
          </section>
          <section id="story" className="story-section">
            <img
              src={assetUrl("/images/gallery-room.jpg")}
              alt="Light-filled interior with artwork and a mirror"
              loading="lazy"
            />
            <div>
              <span className="overline">03 / OUR APPROACH</span>
              <h2>
                A home is never
                <br />
                <em>just a space.</em>
              </h2>
              <p>
                It is what you collect. What you keep. What catches the light at
                four in the afternoon. Wall Alankar brings a personal eye to
                those final, meaningful details.
              </p>
              <a
                href={wa(
                  "Hello Wall Alankar, I would like to discuss a custom or bulk decor project.",
                )}
                target="_blank"
                rel="noreferrer"
                className="underlined"
              >
                Let’s talk about your project <ArrowUpRight />
              </a>
            </div>
          </section>
          <footer>
            <div>
              <span className="overline">COME FIND YOUR FINISHING TOUCH</span>
              <h2>
                Let’s make
                <br />
                <em>room for you.</em>
              </h2>
              <a
                href={wa(
                  "Hello Wall Alankar, I would like to visit the showroom.",
                )}
                target="_blank"
                rel="noreferrer"
              >
                Plan a showroom visit <ArrowUpRight />
              </a>
            </div>
            <div>
              <h4>WALL ALANKAR</h4>
              <p>
                Lal Sai Mansion, 134/1
                <br />
                Kengal Hanumanthaiah Road
                <br />
                Bengaluru — 560027
              </p>
              <a href="tel:+919164600045">+91 91646 00045</a>
              <a href="mailto:info@wallalankar.com">info@wallalankar.com</a>
              <div className="footer-links">
                <a href={routeUrl("/about")}>About</a>
                <a href={routeUrl("/contact")}>Contact</a>
                <a href={routeUrl("/privacy")}>Privacy</a>
                <a href={routeUrl("/terms")}>Terms</a>
                <a href={routeUrl("/shipping-returns")}>Delivery & returns</a>
              </div>
              <button data-testid="admin" onClick={() => openAdmin()}>
                Store management <ArrowUpRight size={15} />
              </button>
            </div>
            <div className="footer-bottom">
              <span>WALL ALANKAR © 2026</span>
              <span>CURATED WITH FEELING.</span>
              <span>Prototype · imagery credits in project notes</span>
            </div>
          </footer>
        </main>
      ) : (
        <main className="admin-shell">
          <aside>
            <h3>WA / workspace</h3>
            {[
              "Overview",
              "Orders",
              "Inventory",
              "Invoices",
              "Sales report",
              "Tally sync",
            ].map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t === "Overview" ? (
                  <LayoutDashboard />
                ) : t === "Inventory" ? (
                  <Package />
                ) : t === "Orders" ? (
                  <ShoppingBag />
                ) : t === "Invoices" ? (
                  <ReceiptText />
                ) : t === "Sales report" ? (
                  <BarChart3 />
                ) : (
                  <RefreshCw />
                )}
                {t}
              </button>
            ))}
            <button
              onClick={() => {
                setAdmin(false);
                history.pushState({}, "", routeUrl("/"));
                window.scrollTo(0, 0);
              }}
            >
              ← Back to storefront
            </button>
            <small>LOCAL DEMO WORKSPACE</small>
          </aside>
          <div className="admin-page">
            <div className="admin-heading">
              <div>
                <span className="overline">WALL ALANKAR / OPERATIONS</span>
                <h1>{tab}</h1>
              </div>
              {tab === "Sales report" ? (
                <button onClick={exportSales}>
                  <Download size={16} /> Export sales CSV
                </button>
              ) : tab === "Invoices" ? (
                <button onClick={() => setInvoice(sampleOrder)}>
                  <ReceiptText size={16} /> View sample invoice
                </button>
              ) : (
                <button onClick={exportCSV}>
                  <Download size={16} /> Export inventory
                </button>
              )}
            </div>
            <div className="stats">
              <div>
                <span>Available units</span>
                <b data-testid="stock-total">
                  {db.products.reduce((a, p) => a + (p.stock || 0), 0)}
                </b>
              </div>
              <div>
                <span>Confirmed sales</span>
                <b>{sold.length}</b>
              </div>
              <div>
                <span>Sales value</span>
                <b>{INR(sold.reduce((n, o) => n + o.total, 0))}</b>
              </div>
              <div>
                <span>Awaiting Tally sync</span>
                <b>{db.queue}</b>
              </div>
            </div>
            {["Overview", "Orders"].includes(tab) && (
              <section className="admin-box">
                <h2>WhatsApp order desk</h2>
                <p>
                  A request does not deduct stock. Confirm the sale once agreed
                  with the customer.
                </p>
                {!operationalOrders.length ? (
                  <div className="empty">
                    No requests yet. Add a product and submit your selection.
                  </div>
                ) : (
                  operationalOrders.map((o) => (
                    <div className="order-row" key={o.id}>
                      <div>
                        <b>{o.id}</b>
                        <small>
                          {o.customer.name} · {o.customer.city}
                        </small>
                        <small>
                          {o.items
                            .map((c) => `${c.qty} × ${c.name}`)
                            .join(", ")}
                        </small>
                      </div>
                      <b>{INR(o.total)}</b>
                      <span className={`status ${o.status}`}>{o.status}</span>
                      <div className="row-actions">
                        {o.status === "Pending" && (
                          <button onClick={() => confirm(o.id)}>
                            Confirm sale
                          </button>
                        )}
                        {o.status === "Confirmed" && (
                          <button onClick={() => setInvoice(o)}>Invoice</button>
                        )}
                        {["Pending", "Confirmed"].includes(o.status) && (
                          <button onClick={() => reverse(o.id)}>
                            {o.status === "Confirmed"
                              ? "Return & restock"
                              : "Cancel request"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}
            {["Overview", "Inventory"].includes(tab) && (
              <section className="admin-box">
                <h2>Inventory control</h2>
                <div className="inventory-table">
                  {db.products
                    .filter((p) => !p.comingSoon)
                    .map((p) => (
                      <div key={p.id}>
                        <img src={p.image} alt="" />
                        <span>
                          <b>{p.name}</b>
                          <small>
                            {p.sku} · {p.type}
                          </small>
                        </span>
                        <span className={!p.stock ? "stock-out" : ""}>
                          {p.stock} units
                        </span>
                        <button
                          aria-label={`Adjust ${p.name}`}
                          onClick={() => {
                            setAdjust(p.id);
                            setDelta(1);
                            setAdjustReason("");
                          }}
                        >
                          Adjust stock
                        </button>
                      </div>
                    ))}
                </div>
              </section>
            )}
            {tab === "Invoices" && (
              <section className="admin-box">
                <h2>Sales invoices</h2>
                <p>
                  Open a confirmed sale to print it or save it as a PDF from
                  your browser.
                </p>
                {!sold.length ? (
                  <div className="empty">
                    No confirmed invoices yet.
                    <br />
                    <button onClick={() => setInvoice(sampleOrder)}>
                      Open sample invoice
                    </button>
                  </div>
                ) : (
                  sold.map((o) => (
                    <div className="invoice-list-row" key={o.id}>
                      <span>
                        <b>INV-{o.id.replace("WA-", "")}</b>
                        <small>
                          {o.customer.name} ·{" "}
                          {new Date(
                            o.confirmedAt || o.createdAt || Date.now(),
                          ).toLocaleDateString("en-IN")}
                        </small>
                      </span>
                      <b>{INR(o.total)}</b>
                      <button onClick={() => setInvoice(o)}>
                        View invoice
                      </button>
                    </div>
                  ))
                )}
              </section>
            )}
            {tab === "Sales report" && (
              <section className="admin-box">
                <div className="report-heading">
                  <div>
                    <h2>Item-wise sales report</h2>
                    <p>
                      Confirmed sales only. Returned and cancelled orders are
                      excluded.
                    </p>
                  </div>
                  <b>
                    {salesRows.reduce((n, r) => n + r.qty, 0)} units ·{" "}
                    {INR(salesRows.reduce((n, r) => n + r.sales, 0))}
                  </b>
                </div>
                {!salesRows.length ? (
                  <div className="empty">
                    No confirmed sales yet. Confirm an order to populate this
                    report.
                  </div>
                ) : (
                  <div className="sales-table">
                    <div>
                      <b>SKU</b>
                      <b>Item</b>
                      <b>Qty sold</b>
                      <b>Sales value</b>
                    </div>
                    {salesRows.map((r) => (
                      <div key={r.sku}>
                        <span>{r.sku}</span>
                        <span>{r.name}</span>
                        <b>{r.qty}</b>
                        <b>{INR(r.sales)}</b>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            {["Overview", "Tally sync"].includes(tab) && (
              <section className="admin-box tally">
                <div>
                  <h2>Tally connection simulator</h2>
                  <p>
                    {db.queue} stock movements queued. Demo only; no live Tally
                    connection.
                  </p>
                  <button
                    className="dark-button"
                    onClick={sync}
                    disabled={syncing}
                  >
                    {syncing ? "Synchronizing…" : "Run demo sync"}{" "}
                    <RefreshCw size={16} />
                  </button>
                </div>
                <span className="sync-emblem">↻</span>
              </section>
            )}
            {tab === "Overview" && (
              <section className="admin-box">
                <h2>Activity ledger</h2>
                {db.ledger.length ? (
                  db.ledger.slice(0, 8).map((l) => (
                    <div className="ledger" key={l.id}>
                      <span>{l.text}</span>
                      <b>
                        {l.change > 0 ? "+" : ""}
                        {l.change} units
                      </b>
                      <small>{l.time}</small>
                    </div>
                  ))
                ) : (
                  <p>Stock movements will appear here.</p>
                )}
              </section>
            )}
          </div>
        </main>
      )}
      {detail &&
        (() => {
          const p = db.products.find((p) => p.id === detail);
          return (
            <div className="overlay">
              <button
                className="backdrop"
                aria-label="Close product"
                onClick={() => setDetail(null)}
              />
              <section
                role="dialog"
                aria-modal="true"
                aria-label="Product details"
                className="product-dialog"
              >
                <button
                  className="close"
                  aria-label="Close details"
                  onClick={() => setDetail(null)}
                >
                  <X />
                </button>
                <img src={p.image} alt={p.name} />
                <div>
                  <span className="overline">WALL ALANKAR / {p.type}</span>
                  <h2>{p.name}</h2>
                  <p className="detail-price">
                    {p.comingSoon ? "Coming soon" : INR(p.price)}
                  </p>
                  <p>
                    A considered finishing touch for your {p.room.toLowerCase()}
                    . Ask us about placement, delivery and available finishes.
                  </p>
                  <dl>
                    <dt>Dimensions</dt>
                    <dd>{p.size || "To be announced"}</dd>
                    <dt>Material</dt>
                    <dd>{p.material || "To be announced"}</dd>
                    <dt>Availability</dt>
                    <dd>
                      {p.comingSoon
                        ? "Collection preview"
                        : p.stock
                          ? `${p.stock} units available`
                          : "Out of stock"}
                    </dd>
                    <dt>Product code</dt>
                    <dd>{p.sku || "Not assigned"}</dd>
                  </dl>
                  <div className="detail-actions">
                    <Qty p={p} />
                    {!p.comingSoon && (
                      <button
                        className="dark-button"
                        onClick={() => {
                          setDetail(null);
                          setPanel("cart");
                        }}
                      >
                        View cart <ShoppingBag size={17} />
                      </button>
                    )}
                  </div>
                  <a
                    className="underlined"
                    href={wa(
                      p.comingSoon
                        ? `Hello Wall Alankar, please notify me when ${p.name} is available.`
                        : `Hello Wall Alankar, please advise on ${p.name}, code ${p.sku}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ask about size, finish or restock <ArrowUpRight size={16} />
                  </a>
                </div>
              </section>
            </div>
          );
        })()}
      {panel && (
        <div className="overlay">
          <button
            className="backdrop"
            aria-label="Close cart"
            onClick={() => setPanel(null)}
          />
          <section
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your selection"
          >
            <button
              className="close"
              aria-label="Close selection"
              onClick={() => setPanel(null)}
            >
              <X />
            </button>
            <span className="overline">WALL ALANKAR / YOUR SELECTION</span>
            <h2>
              {panel === "request"
                ? "A good beginning."
                : "Make room for these."}
            </h2>
            {panel === "request" ? (
              <div className="request-success">
                <Check />
                <h3>Request {request.id} created</h3>
                <p>
                  Your selection is pending confirmation. Stock remains
                  unchanged until the team confirms your sale.
                </p>
                <a
                  className="dark-button"
                  href={
                    request.whatsappUrl ||
                    wa(
                      `Hello Wall Alankar, request ${request.id}.\n${request.items.map((c) => `${c.qty} × ${c.name}: ${INR(c.price * c.qty)}`).join("\n")}\nEstimate: ${INR(request.total)}\n${request.customer.name}, ${request.customer.city}. Please confirm stock and delivery.`,
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Open WhatsApp message <ArrowUpRight />
                </a>
                <button onClick={() => openAdmin(true)}>
                  View request in store management
                </button>
              </div>
            ) : (
              <>
                <div className="cart-lines">
                  {!lines.length ? (
                    <div className="empty">
                      <ShoppingBag />
                      <p>Your selection is waiting.</p>
                      <button
                        onClick={() => {
                          setPanel(null);
                          nav("collection");
                        }}
                      >
                        Explore the collection
                      </button>
                    </div>
                  ) : (
                    lines.map((c) => (
                      <div className="cart-line" key={c.id}>
                        <img src={c.p.image} alt={c.p.name} />
                        <div>
                          <h4>{c.p.name}</h4>
                          <p>{INR(c.p.price * c.qty)}</p>
                          <Qty p={c.p} />
                        </div>
                        <button
                          aria-label={`Remove ${c.p.name}`}
                          onClick={() => setQty(c.id, -c.qty)}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {!!lines.length && (
                  <form onSubmit={submit} className="checkout">
                    <div className="subtotal">
                      <span>Estimated total</span>
                      <b>{INR(total)}</b>
                    </div>
                    <p>
                      Delivery and payment are confirmed personally on WhatsApp.
                    </p>
                    <label>
                      Your name
                      <input
                        required
                        value={customer.name}
                        onChange={(e) =>
                          setCustomer({ ...customer, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Phone number
                      <input
                        required
                        type="tel"
                        pattern="[+0-9 ()-]{10,18}"
                        value={customer.phone}
                        onChange={(e) =>
                          setCustomer({ ...customer, phone: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      City / PIN code
                      <input
                        required
                        value={customer.city}
                        onChange={(e) =>
                          setCustomer({ ...customer, city: e.target.value })
                        }
                      />
                    </label>
                    <button className="dark-button" type="submit">
                      Create WhatsApp request <MessageCircle size={18} />
                    </button>
                    <small>
                      No online payment. Availability reconfirmed before sale.
                    </small>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {invoice && (
        <div className="overlay invoice-overlay">
          <button
            className="backdrop"
            aria-label="Close invoice"
            onClick={() => setInvoice(null)}
          />
          <section
            className="invoice-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Sales invoice"
          >
            <div className="invoice-actions">
              <button onClick={() => setInvoice(null)}>
                <X size={16} /> Close
              </button>
              <button className="dark-button" onClick={() => window.print()}>
                <Printer size={16} /> Print / Save PDF
              </button>
            </div>
            <div className="invoice-brand">
              <div>
                <span>WALL ALANKAR</span>
                <small>OBJECTS & SPACES</small>
              </div>
              <strong>
                {invoice.legalDetailsVerified
                  ? "TAX INVOICE"
                  : "DEMO — NOT A TAX INVOICE"}
              </strong>
            </div>
            <div className="invoice-meta">
              <div>
                <small>FROM</small>
                <b>Wall Alankar</b>
                <span>
                  Lal Sai Mansion, 134/1
                  <br />
                  Kengal Hanumanthaiah Road
                  <br />
                  Bengaluru — 560027
                  <br />
                  +91 91646 00045
                </span>
              </div>
              <div>
                <small>BILL TO</small>
                <b>{invoice.customer.name}</b>
                <span>
                  {invoice.customer.phone}
                  <br />
                  {invoice.customer.city}
                </span>
              </div>
              <div>
                <small>INVOICE DETAILS</small>
                <b>INV-{invoice.id.replace("WA-", "")}</b>
                <span>
                  Date:{" "}
                  {new Date(
                    invoice.confirmedAt || invoice.createdAt || Date.now(),
                  ).toLocaleDateString("en-IN")}
                  <br />
                  Order: {invoice.id}
                </span>
              </div>
            </div>
            <div className="invoice-lines">
              <div>
                <b>#</b>
                <b>Item / SKU</b>
                <b>Qty</b>
                <b>Rate</b>
                <b>Amount</b>
              </div>
              {invoice.items.map((item, i) => (
                <div key={`${item.id}-${i}`}>
                  <span>{i + 1}</span>
                  <span>
                    <b>{item.name}</b>
                    <small>{item.sku || `WA-00${item.id}`}</small>
                  </span>
                  <span>{item.qty}</span>
                  <span>{INR(item.price)}</span>
                  <b>{INR(item.price * item.qty)}</b>
                </div>
              ))}
            </div>
            <div className="invoice-total">
              <span>Total</span>
              <b>{INR(invoice.total)}</b>
            </div>
            <div className="invoice-note">
              <b>Thank you for choosing Wall Alankar.</b>
              <span>
                Sample format — GSTIN, HSN/SAC, tax breakup, payment details and
                invoice terms will be added after business confirmation.
              </span>
            </div>
          </section>
        </div>
      )}
      {adjust && (
        <div className="overlay">
          <button
            className="backdrop"
            aria-label="Close adjustment"
            onClick={() => setAdjust(null)}
          />
          <form
            onSubmit={updateStock}
            className="adjust-dialog"
            role="dialog"
            aria-label="Stock adjustment"
            aria-modal="true"
          >
            <button
              type="button"
              className="close"
              aria-label="Close adjustment dialog"
              onClick={() => setAdjust(null)}
            >
              <X />
            </button>
            <span className="overline">INVENTORY CONTROL</span>
            <h2>Make an adjustment.</h2>
            <p>{db.products.find((p) => p.id === adjust).name}</p>
            <label>
              Quantity change (+ restock / − reduce)
              <input
                aria-label="Quantity change"
                type="number"
                required
                step="1"
                min={-db.products.find((p) => p.id === adjust).stock}
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
            </label>
            <label>
              Reason for audit trail
              <input
                aria-label="Adjustment reason"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. showroom stock count"
              />
            </label>
            <p>
              New balance:{" "}
              <b>
                {db.products.find((p) => p.id === adjust).stock + Number(delta)}{" "}
                units
              </b>
            </p>
            <button className="dark-button" type="submit">
              Save stock movement <Check />
            </button>
          </form>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
