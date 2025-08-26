// src/pages/admin/Coupons.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { useAdminApi } from "@/contexts/AdminAPI";
import { toast } from "@/components/admin/ui/use-toast";
import {
  BadgePercent,
  Search,
  Calendar,
  Hash,
  Percent,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";
import ConfirmButton from "@/components/admin/ui/ConfirmButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";
import { Label } from "@/components/admin/ui/label";

export function Coupons() {
  const api = useAdminApi();
  const [coupons, setCoupons] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCouponIds, setLoadingCouponIds] = useState([]);

  // Create coupon modal state
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_percent: "",
    max_discount_amount: "",
    expires_at: "", // datetime-local string
    usage_limit: "",
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setIsLoading(true);
    const res = await api.get("/admin/coupons/", {
      params: searchTerm ? { search: searchTerm } : {},
    });
    if (res.success) {
      const data = res.data?.results || res.data || [];
      setCoupons(data);
    } else {
      toast({ variant: "destructive", title: "Failed to load coupons" });
    }
    setIsLoading(false);
  };

  const deleteCoupon = async (id) => {
    setLoadingCouponIds((prev) => [...prev, id]);
    const res = await api.delete(`/admin/coupons/${id}/`);
    if (res.success) {
      toast({ title: "Coupon deleted" });
      loadCoupons();
    } else {
      toast({ variant: "destructive", title: "Failed to delete coupon" });
    }
    setLoadingCouponIds((prev) => prev.filter((cid) => cid !== id));
  };

  const filtered = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ---------- Create Coupon Handlers ----------
  const openCreateModal = () => {
    setFormErrors({});
    setForm({
      code: "",
      discount_percent: "",
      max_discount_amount: "",
      expires_at: "",
      usage_limit: "",
    });
    setOpenCreate(true);
  };

  const closeCreateModal = () => {
    if (!creating) setOpenCreate(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Keep code uppercase for consistency
    if (name === "code") {
      setForm((f) => ({ ...f, [name]: value.toUpperCase() }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const toIsoIfPresent = (dtLocal) => {
    if (!dtLocal) return null;
    // dtLocal format: "YYYY-MM-DDTHH:mm"
    const iso = new Date(dtLocal).toISOString();
    return iso;
  };

  const submitCreate = async () => {
    setFormErrors({});

    // Frontend sanity checks (DRF will revalidate on server)
    const errs = {};
    if (!form.code?.trim()) errs.code = "Required";
    if (!form.discount_percent) errs.discount_percent = "Required";
    if (!form.max_discount_amount) errs.max_discount_amount = "Required";
    // usage_limit can be empty (treated as unlimited)
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }

    setCreating(true);
    // Send decimals as strings to please DRF DecimalFields
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_percent: String(form.discount_percent),
      max_discount_amount: String(form.max_discount_amount),
      expires_at: toIsoIfPresent(form.expires_at), // or null if empty
      usage_limit:
        form.usage_limit === "" || form.usage_limit === null
          ? null
          : Number(form.usage_limit),
    };

    const res = await api.post("/admin/coupons/", payload);
    setCreating(false);

    if (res.success) {
      toast({ title: "Coupon created" });
      setOpenCreate(false);
      // Reload to get consistent server times/ids
      loadCoupons();
    } else {
      // Show server-side errors
      const serverErrs = res.data || {};
      setFormErrors(serverErrs);
      toast({
        variant: "destructive",
        title: "Failed to create coupon",
        description:
          typeof serverErrs === "string"
            ? serverErrs
            : "Please check the form fields.",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Coupons - Admin Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coupons</h1>
            <p className="text-gray-600">Manage discount coupons</p>
          </div>
          <Button
            onClick={openCreateModal}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Coupon
          </Button>
        </div>

        {/* Search bar */}
        <div className="bg-white border border-gray-200 p-4 rounded-md shadow-sm">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search coupons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadCoupons()}
              className="pl-10 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="mt-3">
            <Button
              onClick={loadCoupons}
              disabled={isLoading}
              className="bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200"
            >
              {isLoading ? "Loading..." : "Search"}
            </Button>
          </div>
        </div>

        {/* Coupons grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((coupon) => {
              const isCouponLoading = loadingCouponIds.includes(coupon.id);
              return (
                <motion.div
                  key={coupon.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white text-gray-900 p-6 rounded-md shadow-sm border border-gray-200"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <BadgePercent className="w-6 h-6 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Code: {coupon.code}</h3>
                      <p className="text-sm text-gray-600">
                        Status: {coupon.status}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Percent className="w-4 h-4 text-gray-500" />
                      <span>{coupon.discount_percent}% off</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span>
                        Used {coupon.times_used} / {coupon.usage_limit || "∞"}
                      </span>
                    </div>
                    {coupon.expires_at && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>
                          Expires:{" "}
                          {new Date(coupon.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <ConfirmButton
                      title="Delete coupon?"
                      description={`Are you sure you want to delete "${coupon.code}"?`}
                      confirmText="Delete"
                      onConfirm={() => deleteCoupon(coupon.id)}
                      disabled={isCouponLoading}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isCouponLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </>
                      )}
                    </ConfirmButton>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white text-center p-8 rounded-md border border-gray-200 shadow-sm">
            <BadgePercent className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-900 font-semibold">
              {isLoading ? "Loading..." : "No coupons found"}
            </p>
          </div>
        )}
      </div>

      {/* ---------- Create Coupon Modal ---------- */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Code */}
            <div>
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                name="code"
                placeholder="SUMMER25"
                value={form.code}
                onChange={handleChange}
                className="bg-white border border-gray-300 text-gray-900"
              />
              {formErrors.code && (
                <p className="text-sm text-red-600 mt-1">
                  {String(formErrors.code)}
                </p>
              )}
            </div>

            {/* Discount percent */}
            <div>
              <Label htmlFor="discount_percent">
                Discount Percent (0–100) *
              </Label>
              <Input
                id="discount_percent"
                name="discount_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="15.00"
                value={form.discount_percent}
                onChange={handleChange}
                className="bg-white border border-gray-300 text-gray-900"
              />
              {formErrors.discount_percent && (
                <p className="text-sm text-red-600 mt-1">
                  {String(formErrors.discount_percent)}
                </p>
              )}
            </div>

            {/* Max discount amount */}
            <div>
              <Label htmlFor="max_discount_amount">Max Discount Amount *</Label>
              <Input
                id="max_discount_amount"
                name="max_discount_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="250.00"
                value={form.max_discount_amount}
                onChange={handleChange}
                className="bg-white border border-gray-300 text-gray-900"
              />
              {formErrors.max_discount_amount && (
                <p className="text-sm text-red-600 mt-1">
                  {String(formErrors.max_discount_amount)}
                </p>
              )}
            </div>

            {/* Expires at */}
            <div>
              <Label htmlFor="expires_at">Expires At (optional)</Label>
              <Input
                id="expires_at"
                name="expires_at"
                type="datetime-local"
                value={form.expires_at}
                onChange={handleChange}
                className="bg-white border border-gray-300 text-gray-900"
              />
              {formErrors.expires_at && (
                <p className="text-sm text-red-600 mt-1">
                  {String(formErrors.expires_at)}
                </p>
              )}
            </div>

            {/* Usage limit */}
            <div>
              <Label htmlFor="usage_limit">
                Usage Limit (blank = unlimited)
              </Label>
              <Input
                id="usage_limit"
                name="usage_limit"
                type="number"
                min="0"
                placeholder="e.g. 100"
                value={form.usage_limit}
                onChange={handleChange}
                className="bg-white border border-gray-300 text-gray-900"
              />
              {formErrors.usage_limit && (
                <p className="text-sm text-red-600 mt-1">
                  {String(formErrors.usage_limit)}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={closeCreateModal}
                disabled={creating}
                className="border-gray-300 text-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={submitCreate}
                disabled={creating}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
