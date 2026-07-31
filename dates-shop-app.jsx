import { useState, useMemo, useRef } from "react";
import {
  ShoppingCart, Package, BarChart3, Search, Plus, Minus,
  Scan, Tag, TrendingUp, DollarSign, ShoppingBag, FileSpreadsheet,
  FileText, ChevronDown, AlertCircle, CheckCircle, X, RefreshCw,
  Trash2, Star, Boxes, Filter
} from "lucide-react";

// ── Initial Data ──────────────────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  { code: "AJWA-01",    name: "Premium Ajwa Dates",        category: "Dates",      cost: 600,  price: 900,  stock: 45, unit: "kg" },
  { code: "ALMOND-01",  name: "California Almonds",         category: "Dry Fruits", cost: 700,  price: 1000, stock: 12, unit: "kg" },
  { code: "HONEY-01",   name: "Raw Organic Honey",          category: "Honey",      cost: 250,  price: 400,  stock: 25, unit: "bottle" },
  { code: "OLIVE-01",   name: "Extra Virgin Olive Oil",     category: "Oil",        cost: 800,  price: 1200, stock: 8,  unit: "bottle" },
  { code: "MABROOM-01", name: "Mabroom Dates (Wholesale)",  category: "Dates",      cost: 450,  price: 650,  stock: 0,  unit: "kg" },
  { code: "CASHEW-01",  name: "Premium Cashews",            category: "Dry Fruits", cost: 650,  price: 950,  stock: 30, unit: "kg" },
];

const CATEGORY_COLORS = {
  "Dates":      "bg-amber-100 text-amber-800",
  "Dry Fruits": "bg-emerald-100 text-emerald-800",
  "Honey":      "bg-yellow-100 text-yellow-800",
  "Oil":        "bg-teal-100 text-teal-800",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function stockBadge(stock) {
  if (stock === 0)  return "bg-red-100 text-red-700 border border-red-200";
  if (stock <= 20)  return "bg-orange-100 text-orange-700 border border-orange-200";
  return "bg-emerald-100 text-emerald-700 border border-emerald-200";
}
function stockLabel(stock) {
  if (stock === 0)  return "Out of Stock";
  if (stock <= 20)  return "Low Stock";
  return "In Stock";
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  const bg = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-red-600" : "bg-amber-600";
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${bg} max-w-xs w-full`}>
      {type === "success" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
      <span className="flex-1">{msg}</span>
      <button onClick={onClose}><X size={14}/></button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("checkout");
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [scanInput, setScanInput] = useState("");
  const [discountType, setDiscountType] = useState(null); // null | "10%" | "20%" | "round" | "custom"
  const [customDiscount, setCustomDiscount] = useState("");
  const [toast, setToast] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [analyticsFilter, setAnalyticsFilter] = useState("all");
  const [quickAddMap, setQuickAddMap] = useState({});
  const scanRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Cart Logic ──────────────────────────────────────────────────────────────
  const handleScan = () => {
    const code = scanInput.trim().toUpperCase();
    if (!code) return;
    const prod = products.find(p => p.code.toUpperCase() === code);
    if (!prod) { showToast(`Code "${code}" not found in inventory`, "error"); return; }
    if (prod.stock === 0) { showToast(`${prod.name} is out of stock`, "error"); return; }
    setCart(prev => {
      const existing = prev.find(c => c.code === prod.code);
      if (existing) {
        return prev.map(c => c.code === prod.code ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...prod, qty: 1 }];
    });
    setScanInput("");
    showToast(`${prod.name} added to cart`);
    scanRef.current?.focus();
  };

  const updateQty = (code, val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) { setCart(prev => prev.filter(c => c.code !== code)); return; }
    setCart(prev => prev.map(c => c.code === code ? { ...c, qty: num } : c));
  };

  const removeFromCart = (code) => setCart(prev => prev.filter(c => c.code !== code));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const costTotal = cart.reduce((s, c) => s + c.cost * c.qty, 0);

  const roundChipAmount = useMemo(() => {
    const rem = subtotal % 100;
    return rem > 0 ? rem : null;
  }, [subtotal]);

  const discountAmount = useMemo(() => {
    if (!discountType) return 0;
    if (discountType === "10%") return Math.round(subtotal * 0.1);
    if (discountType === "20%") return Math.round(subtotal * 0.2);
    if (discountType === "round") return roundChipAmount || 0;
    if (discountType === "custom") return parseFloat(customDiscount) || 0;
    return 0;
  }, [discountType, subtotal, roundChipAmount, customDiscount]);

  const grandTotal = Math.max(0, subtotal - discountAmount);

  const checkout = () => {
    if (cart.length === 0) { showToast("Cart is empty", "error"); return; }
    // Check stock
    for (const item of cart) {
      const prod = products.find(p => p.code === item.code);
      if (prod.stock < item.qty) { showToast(`Not enough stock for ${item.name}`, "error"); return; }
    }
    // Deduct stock
    setProducts(prev => prev.map(p => {
      const ci = cart.find(c => c.code === p.code);
      return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p;
    }));
    // Log order
    const order = {
      id: Date.now(),
      date: new Date().toISOString(),
      items: cart.map(c => ({ ...c })),
      subtotal, discount: discountAmount, total: grandTotal,
      cost: costTotal, profit: grandTotal - costTotal,
    };
    setOrders(prev => [order, ...prev]);
    setCart([]);
    setDiscountType(null);
    setCustomDiscount("");
    showToast(`Checkout complete! ${fmt(grandTotal)} collected`);
  };

  // ── Inventory Logic ─────────────────────────────────────────────────────────
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQ.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQ.toLowerCase())
  );

  const quickAddStock = (code) => {
    const val = parseInt(quickAddMap[code]) || 0;
    if (val <= 0) return;
    setProducts(prev => prev.map(p => p.code === code ? { ...p, stock: p.stock + val } : p));
    setQuickAddMap(prev => ({ ...prev, [code]: "" }));
    showToast("Stock updated");
  };

  // ── Analytics Logic ─────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const now = new Date();
    if (analyticsFilter === "today") {
      return orders.filter(o => new Date(o.date).toDateString() === now.toDateString());
    }
    if (analyticsFilter === "month") {
      return orders.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    return orders;
  }, [orders, analyticsFilter]);

  const totalRevenue = filteredOrders.reduce((s, o) => s + o.total, 0);
  const totalCost    = filteredOrders.reduce((s, o) => s + o.cost, 0);
  const netProfit    = filteredOrders.reduce((s, o) => s + o.profit, 0);
  const totalOrders  = filteredOrders.length;
  const margin       = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => o.items.forEach(i => {
      if (!map[i.category]) map[i.category] = 0;
      map[i.category] += i.price * i.qty;
    }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredOrders]);

  const exportAlert = (type) => {
    const lines = [
      `📊 ${type} Export Summary`,
      `Period: ${analyticsFilter === "all" ? "All Time" : analyticsFilter === "today" ? "Today" : "This Month"}`,
      `Orders: ${totalOrders}`,
      `Revenue: ${fmt(totalRevenue)}`,
      `Cost: ${fmt(totalCost)}`,
      `Net Profit: ${fmt(netProfit)}`,
      `Margin: ${margin}%`,
      `\n✅ File ready for download.`,
    ];
    alert(lines.join("\n"));
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50 font-sans flex flex-col max-w-md mx-auto relative">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 to-amber-500 px-4 pt-10 pb-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <Star size={22} className="text-white" fill="white"/>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Al-Baraka Dates & Dry Fruits</h1>
            <p className="text-amber-100 text-xs">Inventory & Checkout System</p>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="bg-white border-b border-stone-200 px-2 flex sticky top-0 z-30 shadow-sm">
        {[
          { id: "checkout",  icon: ShoppingCart, label: "Checkout" },
          { id: "inventory", icon: Boxes,        label: "Inventory" },
          { id: "analytics", icon: BarChart3,    label: "Analytics" },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-all ${
              tab === id
                ? "text-amber-700 border-b-2 border-amber-600"
                : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-6">

        {/* ══ CHECKOUT VIEW ══════════════════════════════════════════════════ */}
        {tab === "checkout" && (
          <div className="p-4 space-y-4">
            {/* Scanner */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <Scan size={18} className="text-amber-600" />
                <span className="font-semibold text-stone-700 text-sm">Scan / Enter Item Code</span>
              </div>
              <div className="flex gap-2">
                <input
                  ref={scanRef}
                  type="text"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleScan()}
                  placeholder="e.g. AJWA-01"
                  className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50 uppercase tracking-wide"
                />
                <button
                  onClick={handleScan}
                  className="bg-amber-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-amber-700 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Scan size={14}/> Scan
                </button>
              </div>
              <p className="text-xs text-stone-400 mt-2">Try: AJWA-01, ALMOND-01, HONEY-01, OLIVE-01, CASHEW-01</p>
            </div>

            {/* Cart */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-amber-600" />
                  <span className="font-semibold text-stone-700 text-sm">Cart</span>
                  {cart.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
                  )}
                </div>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                    <Trash2 size={12}/> Clear
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-10 text-center">
                  <ShoppingBag size={36} className="mx-auto text-stone-200 mb-2"/>
                  <p className="text-stone-400 text-sm">Cart is empty — scan an item to begin</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-50">
                  {cart.map(item => (
                    <div key={item.code} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-stone-800 text-sm truncate">{item.name}</p>
                          <p className="text-xs text-stone-400">{fmt(item.price)} / {item.unit}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.code)} className="text-stone-300 hover:text-red-400 mt-0.5 flex-shrink-0">
                          <X size={14}/>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 bg-stone-50 rounded-xl p-1">
                          <button
                            onClick={() => updateQty(item.code, item.qty - (item.unit === "kg" ? 0.5 : 1))}
                            className="w-7 h-7 rounded-lg bg-white shadow-sm text-stone-600 flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all"
                          >
                            <Minus size={12}/>
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={e => updateQty(item.code, e.target.value)}
                            step={item.unit === "kg" ? "0.5" : "1"}
                            min="0"
                            className="w-14 text-center text-sm font-semibold text-stone-700 bg-transparent focus:outline-none"
                          />
                          <button
                            onClick={() => updateQty(item.code, item.qty + (item.unit === "kg" ? 0.5 : 1))}
                            className="w-7 h-7 rounded-lg bg-white shadow-sm text-stone-600 flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all"
                          >
                            <Plus size={12}/>
                          </button>
                        </div>
                        <span className="font-bold text-amber-700 text-sm">{fmt(item.price * item.qty)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount & Summary */}
            {cart.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Tag size={15} className="text-emerald-600"/>
                  <span className="font-semibold text-stone-700 text-sm">Smart Discount</span>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "10%", label: "10% Off" },
                    { id: "20%", label: "20% Off" },
                    ...(roundChipAmount ? [{ id: "round", label: `−₹${roundChipAmount} Round` }] : []),
                    { id: "custom", label: "Custom ₹" },
                  ].map(chip => (
                    <button
                      key={chip.id}
                      onClick={() => setDiscountType(discountType === chip.id ? null : chip.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        discountType === chip.id
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-stone-50 text-stone-600 border-stone-200 hover:border-emerald-400"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {discountType === "custom" && (
                  <input
                    type="number"
                    value={customDiscount}
                    onChange={e => setCustomDiscount(e.target.value)}
                    placeholder="Enter discount amount (₹)"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-stone-50"
                  />
                )}

                {/* Totals */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="flex justify-between text-sm text-stone-500">
                    <span>Subtotal</span><span className="font-medium text-stone-700">{fmt(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Discount</span><span className="font-medium">−{fmt(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-stone-800 pt-1 border-t border-stone-100">
                    <span>Total</span><span className="text-amber-700 text-lg">{fmt(grandTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={checkout}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl py-3.5 font-bold text-sm shadow-md hover:shadow-amber-200 hover:from-amber-700 hover:to-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18}/> Complete Checkout — {fmt(grandTotal)}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ INVENTORY VIEW ═════════════════════════════════════════════════ */}
        {tab === "inventory" && (
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"/>
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by name, code, or category…"
                className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total SKUs", val: products.length, color: "text-amber-700" },
                { label: "Low Stock", val: products.filter(p => p.stock > 0 && p.stock <= 20).length, color: "text-orange-600" },
                { label: "Out of Stock", val: products.filter(p => p.stock === 0).length, color: "text-red-600" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border border-stone-100 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Product Cards */}
            <div className="space-y-3">
              {filteredProducts.map(prod => (
                <div key={prod.code} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-stone-800 text-sm">{prod.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-stone-400 font-mono">{prod.code}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[prod.category] || "bg-stone-100 text-stone-600"}`}>
                            {prod.category}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${stockBadge(prod.stock)}`}>
                        {prod.stock} {prod.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-stone-50">
                      <div>
                        <p className="text-xs text-stone-400">Cost</p>
                        <p className="text-sm font-semibold text-stone-600">{fmt(prod.cost)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-400">Selling</p>
                        <p className="text-sm font-bold text-amber-700">{fmt(prod.price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-400">Margin</p>
                        <p className="text-sm font-semibold text-emerald-600">
                          {(((prod.price - prod.cost) / prod.price) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Add Stock */}
                  <div className="bg-stone-50 border-t border-stone-100 px-4 py-2.5 flex items-center gap-2">
                    <RefreshCw size={13} className="text-stone-400"/>
                    <span className="text-xs text-stone-500 flex-1">Add stock:</span>
                    <input
                      type="number"
                      value={quickAddMap[prod.code] || ""}
                      onChange={e => setQuickAddMap(prev => ({ ...prev, [prod.code]: e.target.value }))}
                      placeholder="Qty"
                      min="1"
                      className="w-16 border border-stone-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                    />
                    <button
                      onClick={() => quickAddStock(prod.code)}
                      className="bg-emerald-600 text-white rounded-lg px-3 py-1 text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <Package size={36} className="mx-auto text-stone-200 mb-2"/>
                  <p className="text-stone-400 text-sm">No items match your search</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ANALYTICS VIEW ═════════════════════════════════════════════════ */}
        {tab === "analytics" && (
          <div className="p-4 space-y-4">
            {/* Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-1 flex gap-1">
              {[
                { id: "all",   label: "All Time" },
                { id: "today", label: "Today" },
                { id: "month", label: "This Month" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setAnalyticsFilter(f.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    analyticsFilter === f.id
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-stone-500 hover:bg-stone-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Revenue",  val: fmt(totalRevenue), icon: DollarSign, color: "text-amber-700", bg: "bg-amber-50"  },
                { label: "Total Cost",     val: fmt(totalCost),    icon: ShoppingBag, color: "text-stone-600", bg: "bg-stone-50" },
                { label: "Net Profit",     val: fmt(netProfit),    icon: TrendingUp,  color: "text-emerald-700", bg: "bg-emerald-50" },
                { label: "Total Orders",   val: totalOrders,       icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50"  },
              ].map(({ label, val, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon size={18} className={color}/>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>{val}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Profit Margin */}
            {totalRevenue > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-stone-700">Profit Margin</span>
                  <span className="text-sm font-bold text-emerald-700">{margin}%</span>
                </div>
                <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, margin)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                  <Filter size={14} className="text-amber-600"/> Revenue by Category
                </h3>
                <div className="space-y-2.5">
                  {categoryBreakdown.map(([cat, rev]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-stone-600">{cat}</span>
                        <span className="font-semibold text-stone-700">{fmt(rev)}</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                          style={{ width: `${(rev / totalRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            {filteredOrders.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-stone-100">
                <div className="px-4 pt-4 pb-3 border-b border-stone-100">
                  <h3 className="text-sm font-semibold text-stone-700">Recent Orders</h3>
                </div>
                <div className="divide-y divide-stone-50">
                  {filteredOrders.slice(0, 5).map(order => (
                    <div key={order.id} className="px-4 py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-stone-700">{fmt(order.total)}</p>
                          <p className="text-xs text-stone-400">{order.items.length} item(s) · {new Date(order.date).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-emerald-600">+{fmt(order.profit)}</p>
                          <p className="text-xs text-stone-400">profit</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-10 shadow-sm border border-stone-100 text-center">
                <BarChart3 size={36} className="mx-auto text-stone-200 mb-2"/>
                <p className="text-stone-400 text-sm">No sales data yet</p>
                <p className="text-stone-300 text-xs mt-1">Complete a checkout to see analytics</p>
              </div>
            )}

            {/* Export Center */}
            <div className="bg-gradient-to-br from-amber-50 to-emerald-50 rounded-2xl p-4 border border-amber-100">
              <h3 className="text-sm font-semibold text-stone-700 mb-1 flex items-center gap-2">
                <FileText size={14} className="text-amber-600"/> Export Center
              </h3>
              <p className="text-xs text-stone-400 mb-3">Download your sales report</p>
              <div className="flex gap-2">
                <button
                  onClick={() => exportAlert("Excel")}
                  className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <FileSpreadsheet size={14}/> Export Excel
                </button>
                <button
                  onClick={() => exportAlert("PDF Statement")}
                  className="flex-1 bg-amber-600 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-700 active:scale-95 transition-all"
                >
                  <FileText size={14}/> Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
