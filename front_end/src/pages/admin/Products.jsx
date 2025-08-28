// src/pages/admin/Products.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { Checkbox } from "@/components/admin/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";
import { useAdminApi } from "@/contexts/AdminAPI";
import { toast } from "@/components/admin/ui/use-toast";
import ConfirmButton from "@/components/admin/ui/ConfirmButton";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  Loader2,
  BadgeCheck,
  CircleSlash,
} from "lucide-react";

export function Products() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all"); // <-- NEW
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockLoadingIds, setStockLoadingIds] = useState([]);

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category_id: "",
    is_in_stock: true,
  });

  const [specRows, setSpecRows] = useState([{ key: "", value: "" }]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const api = useAdminApi();

  useEffect(() => {
    loadProducts(1, searchTerm, categoryFilter);
    // Preload categories for the top filter once
    preloadCategoriesForFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizePath = (url) => {
    // Accept absolute URLs from DRF pagination too
    try {
      if (url?.startsWith("http")) {
        const u = new URL(url);
        let path = `${u.pathname}${u.search}`;
        if (path.startsWith("/api/")) path = path.substring(4); // strip leading /api if your api base already has it
        return path;
      }
    } catch {}
    return url;
  };

  const buildListUrl = (pageNum, search, category) => {
    let url = `/admin/products/?page=${pageNum}`;
    if (search && search.trim() !== "") {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    if (category && category !== "all") {
      url += `&category=${encodeURIComponent(category)}`; // <-- send category to backend
    }
    return url;
  };

  const loadProducts = async (
    pageNum = 1,
    search = searchTerm,
    category = categoryFilter
  ) => {
    setIsLoading(true);
    try {
      const url = buildListUrl(pageNum, search, category);
      const result = await api.get(url);
      const list =
        result?.data?.results ??
        (Array.isArray(result?.data) ? result.data : []);
      setProducts(list);
      setNextPage(result?.data?.next ?? null);
      setPrevPage(result?.data?.previous ?? null);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load products", err);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load categories (shared by dialogs + top filter)
  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const res = await api.get("/admin/categories/");
      const data = Array.isArray(res?.data?.results)
        ? res.data.results
        : res?.data ?? [];
      setCategories(data);
    } catch (e) {
      console.error("Failed to load categories", e);
      toast({
        title: "Error loading categories",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingCats(false);
    }
  };

  const preloadCategoriesForFilter = async () => {
    // lightweight preload for the top filter; reuse same endpoint
    try {
      const res = await api.get("/admin/categories/");
      const data = Array.isArray(res?.data?.results)
        ? res.data.results
        : res?.data ?? [];
      setCategories(data);
    } catch {
      /* non-blocking */
    }
  };

  const handleMarkOutOfStock = async (id) => {
    setStockLoadingIds((s) => [...s, id]);
    try {
      const res = await api.patch(`/admin/products/${id}/`, {
        is_in_stock: false,
      });
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_in_stock: false } : p))
        );
        toast({
          title: "Updated",
          description: "Product marked out of stock.",
        });
      } else {
        toast({
          title: "Failed",
          description: res.error || "Could not update stock status.",
          variant: "destructive",
        });
      }
    } finally {
      setStockLoadingIds((s) => s.filter((x) => x !== id));
    }
  };

  // When any dialog is open (add/edit), ensure categories are up-to-date for the selects
  useEffect(() => {
    if (isAddDialogOpen || isEditDialogOpen) loadCategories();
  }, [isAddDialogOpen, isEditDialogOpen]);

  const handleSearch = () => loadProducts(1, searchTerm, categoryFilter);

  const handleCategoryFilterChange = (val) => {
    setCategoryFilter(val);
    loadProducts(1, searchTerm, val); // refresh with backend call
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    loadProducts(1, "", "all");
  };

  const coerceSpecValue = (raw) => {
    const val = String(raw ?? "").trim();
    if (val === "") return "";
    const lower = val.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
    if (lower === "null") return null;
    if (!isNaN(Number(val))) return Number(val);
    return val;
  };

  const buildSpecObject = () => {
    const obj = {};
    specRows.forEach(({ key, value }) => {
      const k = (key || "").trim();
      if (!k || k.toLowerCase() === "updated_at") return;
      obj[k] = coerceSpecValue(value);
    });
    return obj;
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter a product name.",
        variant: "destructive",
      });
      return false;
    }
    const priceNum = Number(formData.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast({
        title: "Invalid price",
        description: "Price must be a non-negative number.",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.category_id || Number.isNaN(Number(formData.category_id))) {
      toast({
        title: "Missing category",
        description: "Please select a category.",
        variant: "destructive",
      });
      return false;
    }
    const keys = specRows
      .map((r) => (r.key || "").trim().toLowerCase())
      .filter((k) => k && k !== "updated_at");
    const hasDup = new Set(keys).size !== keys.length;
    if (hasDup) {
      toast({
        title: "Duplicate specification keys",
        description: "Please ensure each specification key is unique.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const saveProduct = async () => {
    if (!validateForm()) return;

    const productData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
      image_urls: formData.image_url ? [formData.image_url.trim()] : [],
      category: parseInt(formData.category_id, 10),
      specification: buildSpecObject(),
      is_in_stock: !!formData.is_in_stock,
    };

    setIsSaving(true);
    try {
      let result;
      if (editingProduct) {
        result = await api.put(
          `/admin/products/${editingProduct.id}/`,
          productData
        );
      } else {
        result = await api.post("/admin/products/", productData);
      }

      if (result.success) {
        toast({
          title: "Success",
          description: editingProduct
            ? "Product updated successfully."
            : "Product created successfully.",
        });
        // reload respecting current search + category filter + page 1
        await loadProducts(1, searchTerm, categoryFilter);
        resetForm();
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save product.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name ?? "",
      description: product.description ?? "",
      price: (product.price ?? "").toString(),
      image_url: product.image_urls?.[0] || "",
      category_id:
        typeof product.category === "number"
          ? String(product.category)
          : product.category?.id
          ? String(product.category.id)
          : "",
      is_in_stock: !!product.is_in_stock,
    });

    const specObj =
      product.specification &&
      typeof product.specification === "object" &&
      !Array.isArray(product.specification)
        ? product.specification
        : {};
    const rows = Object.entries(specObj)
      .filter(([k]) => String(k).toLowerCase() !== "updated_at")
      .map(([k, v]) => ({ key: String(k), value: String(v ?? "") }));
    setSpecRows(rows.length ? rows : [{ key: "", value: "" }]);
    setIsEditDialogOpen(true);
  };

  const deleteProduct = async (id) => {
    const result = await api.delete(`/admin/products/${id}/`);
    if (result.success) {
      toast({ title: "Deleted", description: "Product deleted." });
      await loadProducts(1, searchTerm, categoryFilter);
    } else {
      toast({
        title: "Error",
        description:
          result.error ||
          "Failed to delete product. It might be in an order or a cart.",
        variant: "destructive",
      });
    }
  };

  const addSpecRow = () => setSpecRows((r) => [...r, { key: "", value: "" }]);
  const removeSpecRow = (idx) =>
    setSpecRows((r) => r.filter((_, i) => i !== idx));
  const updateSpecRow = (idx, field, val) =>
    setSpecRows((r) =>
      r.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      image_url: "",
      category_id: "",
      is_in_stock: true,
    });
    setSpecRows([{ key: "", value: "" }]);
    setEditingProduct(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-transparent" />
        <span className="ml-4 text-lg text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Products - Admin Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600">Manage your product catalog</p>
          </div>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>

        {/* Search + Category Filter */}
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="w-full md:w-60">
              <Select
                value={categoryFilter}
                onValueChange={handleCategoryFilterChange}
              >
                <SelectTrigger className="bg-white border border-gray-300 text-gray-900">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 text-gray-900">
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                className="bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200"
              >
                <Search className="w-4 h-4 mr-1" /> Search
              </Button>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-gray-300 text-gray-800 hover:bg-gray-100"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-md p-4 shadow-sm"
            >
              <div className="aspect-square mb-4 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                {product.image_urls?.[0] ? (
                  <img
                    src={product.image_urls[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-green-700 font-semibold">
                    ${Number(product.price ?? 0).toFixed(2)}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
                      product.is_in_stock
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    <BadgeCheck className="w-3 h-3" />
                    {product.is_in_stock ? "In stock" : "Out of stock"}
                  </span>
                  {product.is_deleted && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border bg-gray-100 text-gray-600 border-gray-300">
                      Soft Deleted
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-300 text-gray-800 hover:bg-gray-100"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>

                  {/* Confirm: Mark out of stock */}
                  <ConfirmButton
                    title="Mark as out of stock?"
                    description={`Customers will not be able to purchase "${product.name}".`}
                    confirmText="Mark out of stock"
                    onConfirm={() => handleMarkOutOfStock(product.id)}
                    asChild
                    disabled={
                      !product.is_in_stock ||
                      stockLoadingIds.includes(product.id)
                    }
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      title={
                        !product.is_in_stock
                          ? "Already out of stock"
                          : "Mark as out of stock"
                      }
                      className={`border-yellow-300 text-yellow-700 ${
                        !product.is_in_stock
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-yellow-50"
                      }`}
                    >
                      {stockLoadingIds.includes(product.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CircleSlash className="w-4 h-4" />
                      )}
                    </Button>
                  </ConfirmButton>

                  {/* Confirm: Delete product */}
                  {product.is_deleted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="border-red-300 text-red-700 opacity-50 cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : (
                    <ConfirmButton
                      title="Delete product?"
                      description={`Are you sure you want to delete "${product.name}"? This cannot be undone.`}
                      confirmText="Delete"
                      onConfirm={() => deleteProduct(product.id)}
                      asChild
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </ConfirmButton>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {products.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-md p-12 text-center shadow-sm">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-900 font-semibold">No products found</p>
          </div>
        )}

        {/* Pagination */}
        {(prevPage || nextPage) && (
          <div className="flex justify-between mt-4">
            <Button
              onClick={() =>
                prevPage
                  ? loadProducts(page - 1, searchTerm, categoryFilter)
                  : null
              }
              disabled={!prevPage}
              className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                nextPage
                  ? loadProducts(page + 1, searchTerm, categoryFilter)
                  : null
              }
              disabled={!nextPage}
              className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* ADD PRODUCT DIALOG */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 sm:max-w-lg shadow-xl">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          {/* confirm via ConfirmButton */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className={`space-y-4 ${
              isSaving ? "opacity-70 pointer-events-none" : ""
            }`}
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={isSaving}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={isSaving}
              />
            </div>

            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                disabled={isSaving}
                required
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={formData.category_id || ""}
                onValueChange={(val) =>
                  setFormData({ ...formData, category_id: val })
                }
                disabled={loadingCats || isSaving}
              >
                <SelectTrigger className="bg-white border border-gray-300 text-gray-900">
                  <SelectValue
                    placeholder={
                      loadingCats ? "Loading..." : "Select a category"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 text-gray-900">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="https://…"
                disabled={isSaving}
              />
            </div>

            {/* Specifications */}
            <div className="space-y-2">
              <Label>Specifications</Label>
              {specRows.map((row, idx) => (
                <div className="grid grid-cols-12 gap-2" key={idx}>
                  <Input
                    className="col-span-5 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                    placeholder="key (e.g., color)"
                    value={row.key}
                    onChange={(e) => updateSpecRow(idx, "key", e.target.value)}
                    disabled={isSaving}
                  />
                  <Input
                    className="col-span-6 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                    placeholder="value (e.g., red)"
                    value={row.value}
                    onChange={(e) =>
                      updateSpecRow(idx, "value", e.target.value)
                    }
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="col-span-1 border-gray-300 text-gray-800 hover:bg-gray-100"
                    onClick={() => removeSpecRow(idx)}
                    title="Remove"
                    disabled={isSaving}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200"
                onClick={addSpecRow}
                disabled={isSaving}
              >
                <Plus className="w-4 h-4 mr-1" /> Add spec
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="in_stock"
                checked={formData.is_in_stock}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, is_in_stock: Boolean(v) })
                }
                disabled={isSaving}
              />
              <Label htmlFor="in_stock">In stock</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="border-gray-300 text-gray-800 hover:bg-gray-100"
                disabled={isSaving}
              >
                Cancel
              </Button>

              {/* Confirm: Create product */}
              <ConfirmButton
                title="Create product?"
                description={`This will create "${
                  formData.name || "(no name)"
                }".`}
                confirmText="Create"
                onConfirm={saveProduct}
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={loadingCats || !formData.category_id || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </ConfirmButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT PRODUCT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 sm:max-w-lg shadow-xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {/* confirm via ConfirmButton */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className={`space-y-4 ${
              isSaving ? "opacity-70 pointer-events-none" : ""
            }`}
          >
            <div>
              <Label htmlFor="name_edit">Name</Label>
              <Input
                id="name_edit"
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={isSaving}
                required
              />
            </div>

            <div>
              <Label htmlFor="description_edit">Description</Label>
              <Textarea
                id="description_edit"
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={isSaving}
              />
            </div>

            <div>
              <Label htmlFor="price_edit">Price</Label>
              <Input
                id="price_edit"
                type="number"
                step="0.01"
                min="0"
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                disabled={isSaving}
                required
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={formData.category_id || ""}
                onValueChange={(val) =>
                  setFormData({ ...formData, category_id: val })
                }
                disabled={loadingCats || isSaving}
              >
                <SelectTrigger className="bg-white border border-gray-300 text-gray-900">
                  <SelectValue
                    placeholder={
                      loadingCats ? "Loading..." : "Select a category"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 text-gray-900">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="image_url_edit">Image URL</Label>
              <Input
                id="image_url_edit"
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="https://…"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Specifications</Label>
              {specRows.map((row, idx) => (
                <div className="grid grid-cols-12 gap-2" key={idx}>
                  <Input
                    className="col-span-5 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                    placeholder="key (e.g., color)"
                    value={row.key}
                    onChange={(e) => updateSpecRow(idx, "key", e.target.value)}
                    disabled={isSaving}
                  />
                  <Input
                    className="col-span-6 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
                    placeholder="value (e.g., red)"
                    value={row.value}
                    onChange={(e) =>
                      updateSpecRow(idx, "value", e.target.value)
                    }
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="col-span-1 border-gray-300 text-gray-800 hover:bg-gray-100"
                    onClick={() => removeSpecRow(idx)}
                    title="Remove"
                    disabled={isSaving}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="in_stock_edit"
                checked={formData.is_in_stock}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, is_in_stock: Boolean(v) })
                }
                disabled={isSaving}
              />
              <Label htmlFor="in_stock_edit">In stock</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-gray-300 text-gray-800 hover:bg-gray-100"
                disabled={isSaving}
              >
                Cancel
              </Button>

              {/* Confirm: Save changes */}
              <ConfirmButton
                title="Save product changes?"
                description={`Apply updates to "${editingProduct?.name}"?`}
                confirmText="Save"
                onConfirm={saveProduct}
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={loadingCats || !formData.category_id || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </ConfirmButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
