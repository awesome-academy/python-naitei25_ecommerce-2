// ✅ Products.jsx — create with category + specifications, search, list, edit/delete dialogs
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/admin/ui/alert-dialog";
import { useAdminApi } from "@/contexts/AdminAPI";
import { toast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2, Search, Package, Loader2 } from "lucide-react";

export function Products() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category_id: "", // REQUIRED by serializer
    is_in_stock: true,
  });

  // specs as editable rows, then converted to object on submit
  const [specRows, setSpecRows] = useState([{ key: "", value: "" }]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // ⬅️ spinner for POST/PUT

  const api = useAdminApi();

  useEffect(() => {
    loadProducts(1);
  }, []);

  const loadProducts = async (pageNum = 1, search = searchTerm) => {
    setIsLoading(true);
    try {
      let url = `/admin/products/?page=${pageNum}`;
      if (search && search.trim() !== "") {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const result = await api.get(url);
      const list = result?.data?.results ?? [];
      setProducts(list);
      setNextPage(result?.data?.next);
      setPrevPage(result?.data?.previous);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load products", err);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Load categories whenever an Add/Edit dialog opens
  useEffect(() => {
    if (isAddDialogOpen || isEditDialogOpen) loadCategories();
  }, [isAddDialogOpen, isEditDialogOpen]);

  const handleSearch = () => loadProducts(1, searchTerm);

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
      if (!k || k.toLowerCase() === "updated_at") return; // ignore empty/reserved
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
    // spec keys duplicate check (excluding empty and 'updated_at')
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const productData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
      image_urls: formData.image_url ? [formData.image_url.trim()] : [],
      category: parseInt(formData.category_id, 10),
      specification: buildSpecObject(), // dict
      is_in_stock: !!formData.is_in_stock,
    };

    setIsSaving(true); // start spinner
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
        toast({ title: "Success", description: "Product saved successfully." });
        await loadProducts(page);
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
      setIsSaving(false); // stop spinner
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name ?? "",
      description: product.description ?? "",
      price: (product.price ?? "").toString(),
      image_url: product.image_urls?.[0] || "",
      category_id: product.category ? String(product.category) : "",
      is_in_stock: !!product.is_in_stock,
    });
    // prefill spec rows from object (ignore 'updated_at')
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

  // ❗ WIP: Delete stub (toast only)
  const handleDelete = async (_id) => {
    toast({
      title: "Work in progress",
      description:
        "Deleting is still at phase work in progress, please check again.",
    });
    // when ready, swap to:
    // const result = await api.delete(`/admin/products/${id}/`);
    // ...
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
        <span className="ml-4 text-lg text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Products - Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Products</h1>
            <p className="text-gray-400 mt-1">Manage your product catalog</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm text-black"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} className="text-white">
            <Search className="w-4 h-4 mr-1" /> Search
          </Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <motion.div
              key={product.id}
              className="p-4 border rounded-lg bg-gray-800 text-white"
            >
              <div className="aspect-square mb-4">
                {product.image_urls?.[0] ? (
                  <img
                    src={product.image_urls[0]}
                    alt={product.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-700 rounded">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-xl">{product.name}</h3>
                <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                  {product.description}
                </p>
                <p className="text-lg font-bold mt-2">${product.price}</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Product</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{product.name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(product.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <Package className="w-12 h-12 mx-auto mb-2" />
            <p>No products found.</p>
          </div>
        )}

        <div className="flex justify-between mt-4">
          <Button onClick={() => loadProducts(page - 1)} disabled={!prevPage}>
            Previous
          </Button>
          <Button onClick={() => loadProducts(page + 1)} disabled={!nextPage}>
            Next
          </Button>
        </div>
      </div>

      {/* ADD PRODUCT DIALOG (POST) */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className={`space-y-4 ${
              isSaving ? "opacity-70 pointer-events-none" : ""
            }`}
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                className="text-black"
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
                className="text-black"
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
                className="text-black"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                disabled={isSaving}
                required
              />
            </div>

            {/* Category Select (required) */}
            <div>
              <Label>Category</Label>
              <Select
                value={formData.category_id || ""}
                onValueChange={(val) =>
                  setFormData({ ...formData, category_id: val })
                }
                disabled={loadingCats || isSaving}
              >
                <SelectTrigger className="text-left">
                  <SelectValue
                    placeholder={
                      loadingCats ? "Loading..." : "Select a category"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
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
                className="text-black"
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
                    className="col-span-5 text-black"
                    placeholder="key (e.g., color)"
                    value={row.key}
                    onChange={(e) => updateSpecRow(idx, "key", e.target.value)}
                    disabled={isSaving}
                  />
                  <Input
                    className="col-span-6 text-black"
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
                    className="col-span-1"
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
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
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
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT PRODUCT DIALOG (PUT) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className={`space-y-4 ${
              isSaving ? "opacity-70 pointer-events-none" : ""
            }`}
          >
            <div>
              <Label htmlFor="name_edit">Name</Label>
              <Input
                id="name_edit"
                className="text-black"
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
                className="text-black"
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
                className="text-black"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                disabled={isSaving}
                required
              />
            </div>

            {/* Category Select (required for PUT) */}
            <div>
              <Label>Category</Label>
              <Select
                value={formData.category_id || ""}
                onValueChange={(val) =>
                  setFormData({ ...formData, category_id: val })
                }
                disabled={loadingCats || isSaving}
              >
                <SelectTrigger className="text-left">
                  <SelectValue
                    placeholder={
                      loadingCats ? "Loading..." : "Select a category"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
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
                className="text-black"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="https://…"
                disabled={isSaving}
              />
            </div>

            {/* Specifications (Edit) */}
            <div className="space-y-2">
              <Label>Specifications</Label>
              {specRows.map((row, idx) => (
                <div className="grid grid-cols-12 gap-2" key={idx}>
                  <Input
                    className="col-span-5 text-black"
                    placeholder="key (e.g., color)"
                    value={row.key}
                    onChange={(e) => updateSpecRow(idx, "key", e.target.value)}
                    disabled={isSaving}
                  />
                  <Input
                    className="col-span-6 text-black"
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
                    className="col-span-1"
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
                onClick={addSpecRow}
                disabled={isSaving}
              >
                <Plus className="w-4 h-4 mr-1" /> Add spec
              </Button>
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
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
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
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
