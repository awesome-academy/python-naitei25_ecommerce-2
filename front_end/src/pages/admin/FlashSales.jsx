import React, { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { toast } from "@/components/admin/ui/use-toast";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/admin/ui/alert-dialog";
import { useAdminApi } from "@/contexts/AdminAPI";
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Percent,
  ShoppingBag,
  Loader2,
  Eye,
  RefreshCw,
  Search,
} from "lucide-react";

/* ===================== Helpers ===================== */
const fmtDateTimeLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};
const toISOStringZ = (localStr) =>
  localStr ? new Date(localStr).toISOString() : null;
const badgeClasses = (status) => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-50 text-green-800 border border-green-200";
    case "UPCOMING":
      return "bg-blue-50 text-blue-800 border border-blue-200";
    case "EXPIRED":
      return "bg-gray-100 text-gray-700 border border-gray-200";
    case "INACTIVE":
      return "bg-red-50 text-red-800 border border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border border-gray-200";
  }
};
const fmtCountdown = (seconds) => {
  if (!seconds || seconds <= 0) return "00:00:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

/* ===================== Product Multi Picker (with categories, in-stock only, hover preview) ===================== */
function ProductMultiPicker({ value = [], onChange }) {
  const api = useAdminApi();
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  // categories
  const [categories, setCategories] = useState([]);
  const [catId, setCatId] = useState("");

  // search + results
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState([]);

  // hover preview cache & state
  const [hoveredId, setHoveredId] = useState(null);
  const [hoverData, setHoverData] = useState({}); // id -> { first_image, description }
  const hoverTimerRef = useRef(null);

  // fetch categories
  useEffect(() => {
    (async () => {
      const res = await apiRef.current.get(`/categories/`);
      if (res?.success) {
        const rows = res.data?.results || res.data || [];
        setCategories(rows);
      }
    })();
  }, []);

  const fetchProducts = useCallback(async (searchTerm = "", category = "") => {
    setIsLoading(true);
    const qs = new URLSearchParams();
    if (searchTerm) qs.set("search", searchTerm);
    if (category) qs.set("category", category);
    // Use public products list which already filters is_in_stock=True
    // and supports search + category. (Server view does this.)
    const path = `/products/${qs.toString() ? `?${qs.toString()}` : ""}`;
    const res = await apiRef.current.get(path);
    if (res?.success) {
      const rows = res.data?.results || res.data || [];
      setOptions(rows);
    } else {
      toast({ variant: "destructive", title: "Failed to load products" });
    }
    setIsLoading(false);
  }, []);
  useEffect(() => {
    fetchProducts("", "");
  }, [fetchProducts]);

  const doSearch = () => fetchProducts(q, catId);

  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  // hover handlers (fetch detail once per product for description)
  const onEnter = (p) => {
    setHoveredId(p.id);
    clearTimeout(hoverTimerRef.current);
    // already cached?
    if (hoverData[p.id]) return;
    hoverTimerRef.current = setTimeout(async () => {
      const res = await apiRef.current.get(`/products/${p.id}/`);
      if (res?.success) {
        setHoverData((prev) => ({
          ...prev,
          [p.id]: {
            first_image:
              res.data?.first_image ||
              res.data?.image_urls?.[0] ||
              p.first_image,
            description: res.data?.description || "",
          },
        }));
      }
    }, 180); // gentle delay
  };
  const onLeave = () => {
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    setHoveredId(null);
  };

  return (
    <div className="space-y-3">
      {/* search + category row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            className="pl-10"
          />
        </div>
        <select
          className="border rounded-md p-2 text-sm bg-white"
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={doSearch}
          className="bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          {isLoading ? "Searching…" : "Search"}
        </Button>
      </div>

      <div className="max-h-60 overflow-auto border border-gray-200 rounded-md divide-y">
        {isLoading ? (
          <div className="p-4 text-sm text-gray-600">Loading…</div>
        ) : options.length ? (
          options.map((p) => (
            <div
              key={p.id}
              className="relative"
              onMouseEnter={() => onEnter(p)}
              onMouseLeave={onLeave}
            >
              <label className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={value.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="text-sm text-gray-900">
                    #{p.id} — {p.name}
                  </span>
                </div>
                <span className="text-xs text-gray-600">In stock</span>
              </label>

              {/* hover preview */}
              {hoveredId === p.id && (
                <div className="absolute left-3 right-3 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-xl p-3 animate-in fade-in zoom-in duration-150">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 flex-shrink-0 rounded bg-gray-100 overflow-hidden">
                      {/* Use first_image from list; fallback to fetched detail when available */}
                      {hoverData[p.id]?.first_image || p.first_image ? (
                        <img
                          alt={p.name}
                          src={hoverData[p.id]?.first_image || p.first_image}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-3">
                        {hoverData[p.id]?.description || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-4 text-sm text-gray-600">No products found.</div>
        )}
      </div>

      {value.length > 0 && (
        <div className="text-xs text-gray-600">
          Selected: {value.length} product{value.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

/* ===================== Products Viewer Dialog ===================== */
function ProductsInSaleDialog({ open, onOpenChange, flashSaleId }) {
  const api = useAdminApi();
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const [isLoading, setIsLoading] = useState(false);
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!open || !flashSaleId) return;
    (async () => {
      setIsLoading(true);
      const res = await apiRef.current.get(
        `/flash-sales/${flashSaleId}/products/`
      );
      if (res?.success) {
        setSale(res.data?.flash_sale || null);
        setItems(res.data?.products || []);
      } else {
        toast({ variant: "destructive", title: "Failed to load products" });
      }
      setIsLoading(false);
    })();
  }, [open, flashSaleId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Products in Flash Sale</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-600">Loading…</div>
        ) : sale ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{sale.name}</div>
                <div className="text-sm text-gray-600">
                  {sale.discount_percent}% • Remaining:{" "}
                  {fmtCountdown(Math.floor(sale.remaining_time || 0))}
                </div>
              </div>
            </div>

            {items.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="border border-gray-200 rounded-md p-3 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      {p.first_image ? (
                        <img
                          alt={p.name}
                          src={p.first_image}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-sm text-gray-600">
                          #{p.id} •{" "}
                          {p.is_in_stock ? "In stock" : "Out of stock"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No products.</div>
            )}
          </div>
        ) : (
          <div className="p-6 text-sm text-gray-600">No data.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ===================== Create/Edit Dialog ===================== */
function FlashSaleEditor({ open, onOpenChange, initial, onSaved }) {
  const api = useAdminApi();
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const isEditing = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name || "");
  const [discount, setDiscount] = useState(
    initial?.discount_percent != null ? String(initial.discount_percent) : ""
  );
  const [startLocal, setStartLocal] = useState(
    initial?.start_date ? fmtDateTimeLocal(initial.start_date) : ""
  );
  const [endLocal, setEndLocal] = useState(
    initial?.end_date ? fmtDateTimeLocal(initial.end_date) : ""
  );
  const [products, setProducts] = useState(
    Array.isArray(initial?.products) ? initial.products : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setDiscount(
        initial?.discount_percent != null
          ? String(initial.discount_percent)
          : ""
      );
      setStartLocal(
        initial?.start_date ? fmtDateTimeLocal(initial.start_date) : ""
      );
      setEndLocal(initial?.end_date ? fmtDateTimeLocal(initial.end_date) : "");
      setProducts(Array.isArray(initial?.products) ? initial.products : []);
    }
  }, [open, initial]);

  const submit = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    const d = Number(discount);
    if (Number.isNaN(d) || d <= 0 || d > 100) {
      toast({
        variant: "destructive",
        title: "Discount must be between 1 and 100",
      });
      return;
    }
    if (!startLocal || !endLocal) {
      toast({ variant: "destructive", title: "Start and End are required" });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      name: name.trim(),
      discount_percent: Number(discount),
      start_date: toISOStringZ(startLocal),
      end_date: toISOStringZ(endLocal),
      is_active: true,
      products,
    };

    const res = isEditing
      ? await apiRef.current.patch(`/admin/flash-sales/${initial.id}/`, payload)
      : await apiRef.current.post(`/admin/flash-sales/`, payload);

    if (res?.success) {
      toast({ title: isEditing ? "Flash sale updated" : "Flash sale created" });
      onSaved?.();
      onOpenChange(false);
    } else {
      const msg =
        res?.data?.detail ||
        res?.error ||
        "Failed to save flash sale. Please check your inputs.";
      toast({ variant: "destructive", title: msg });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Flash Sale" : "Create Flash Sale"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="9.9 Mega Sale"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Discount Percent
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="100"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="25"
              />
              <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                <Percent className="w-4 h-4" /> %
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start (local)
              </label>
              <Input
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                End (local)
              </label>
              <Input
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Products (multi-select)
            </label>
            <ProductMultiPicker value={products} onChange={setProducts} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== Main Page ===================== */
export function FlashSales() {
  const api = useAdminApi();
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const [sales, setSales] = useState([]);
  const [openEditor, setOpenEditor] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openViewProducts, setOpenViewProducts] = useState(false);
  const [viewId, setViewId] = useState(null);

  // countdown ticker
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    const res = await apiRef.current.get("/admin/flash-sales/");
    if (res?.success) setSales(res.data?.results || res.data || []);
    else toast({ variant: "destructive", title: "Failed to load flash sales" });
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setOpenEditor(true);
  };
  const openEdit = (row) => {
    setEditing({
      id: row.id,
      name: row.name,
      discount_percent: row.discount_percent,
      start_date: row.start_date,
      end_date: row.end_date,
      products: row.products || [],
    });
    setOpenEditor(true);
  };
  const remove = async (id) => {
    const res = await apiRef.current.delete(`/admin/flash-sales/${id}/`);
    if (res?.success) {
      toast({ title: "Flash sale deleted" });
      load();
    } else toast({ variant: "destructive", title: "Failed to delete" });
  };
  const handleViewProducts = (id) => {
    setViewId(id);
    setOpenViewProducts(true);
  };

  return (
    <>
      <Helmet>
        <title>Flash Sales - Admin Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-7 h-7" />
              Flash Sales
            </h1>
            <p className="text-gray-600">
              Create time-limited discounts with real-time countdowns.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={load}
              className="bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Flash Sale
            </Button>
          </div>
        </div>

        {/* list */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sales.map((s) => {
            const remainingSeconds = Math.max(
              0,
              Math.floor((s.remaining_time ?? 0) - tick)
            );
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white text-gray-900 p-5 rounded-md shadow-sm border border-gray-200 flex flex-col"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold">{s.name}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1 mr-3">
                        <Percent className="w-4 h-4" />
                        {s.discount_percent}%
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(s.start_date).toLocaleString()} →{" "}
                        {new Date(s.end_date).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${badgeClasses(
                      s.status
                    )}`}
                    title={s.status}
                  >
                    {s.status || "—"}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Remaining:{" "}
                    <span className="font-mono">
                      {fmtCountdown(remainingSeconds)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 inline-flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4" />
                    {Array.isArray(s.products)
                      ? s.products.length
                      : s.product_count ?? 0}{" "}
                    products
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="bg-white border-gray-300 text-gray-900 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900 transition-colors focus-visible:ring-2 focus-visible:ring-gray-300"
                    onClick={() => handleViewProducts(s.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Products
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{s.name}”?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <div className="text-sm text-gray-600">
                        This action cannot be undone.
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(s.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            );
          })}
        </div>

        {!sales.length && (
          <div className="bg-white text-center p-8 rounded-md border border-gray-200 shadow-sm">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-900 font-semibold">No flash sales found</p>
          </div>
        )}
      </div>

      {/* create/edit */}
      <FlashSaleEditor
        open={openEditor}
        onOpenChange={setOpenEditor}
        initial={editing}
        onSaved={load}
      />

      {/* products quick view */}
      <ProductsInSaleDialog
        open={openViewProducts}
        onOpenChange={setOpenViewProducts}
        flashSaleId={viewId}
      />
    </>
  );
}

export default FlashSales;
