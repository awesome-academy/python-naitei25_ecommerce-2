// src/pages/admin/Categories.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "@/components/admin/ui/use-toast";
import { Plus, Trash2, Tag, Edit, Loader2, FolderOpen } from "lucide-react";

export function Categories() {
  const api = useAdminApi();

  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

  const [formData, setFormData] = useState({ name: "" });
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    loadCategories(1);
  }, []);

  const normalizeList = (data) =>
    Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
      ? data
      : [];

  const loadCategories = async (pageNum = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/categories/?page=${pageNum}`);
      const list = normalizeList(res?.data);
      setCategories(list);
      setNextPage(res?.data?.next ?? null);
      setPrevPage(res?.data?.previous ?? null);
      setPage(pageNum);
    } catch (e) {
      console.error("Failed to load categories", e);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "" });
    setEditingCategory(null);
  };

  const handleAddOpen = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEditOpen = (cat) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name ?? "" });
    setIsEditDialogOpen(true);
  };

  const validate = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter a category name.",
        variant: "destructive",
      });
    }
    return !!formData.name.trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      let result;
      if (editingCategory) {
        result = await api.put(`/admin/categories/${editingCategory.id}/`, {
          name: formData.name.trim(),
        });
      } else {
        result = await api.post("/admin/categories/", {
          name: formData.name.trim(),
        });
      }

      if (result.success) {
        toast({
          title: "Success",
          description: editingCategory
            ? "Category updated."
            : "Category created.",
        });
        await loadCategories(page);
        resetForm();
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description:
            result.error ||
            (editingCategory
              ? "Failed to update category."
              : "Failed to create category."),
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeletingId(id);
    try {
      const res = await api.delete(`/admin/categories/${id}/`);
      if (res.success) {
        toast({ title: "Deleted", description: "Category deleted." });
        await loadCategories(page);
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to delete category.",
          variant: "destructive",
        });
      }
    } finally {
      setIsDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-transparent" />
        <span className="ml-4 text-lg text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Categories - Admin Dashboard</title>
        <meta
          name="description"
          content="Manage product categories, organize your inventory, and create new categories."
        />
      </Helmet>

      <div className="space-y-6">
        {/* Header (matches Orders.jsx tone) */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Categories</h1>
            <p className="text-gray-300">Organize your product catalog</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
                onClick={handleAddOpen}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>

              <form
                onSubmit={handleSubmit}
                className={`space-y-4 ${
                  isSaving ? "opacity-70 pointer-events-none" : ""
                }`}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-gray-800 border border-gray-700 text-white placeholder:text-gray-400"
                    placeholder="Enter category name"
                    disabled={isSaving}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-700"
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Add Category"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories Grid (dark cards like Orders) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-md p-6 hover:bg-gray-800/60 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                    <Tag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-400">ID: #{category.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Edit */}
                  <Dialog
                    open={
                      isEditDialogOpen && editingCategory?.id === category.id
                    }
                    onOpenChange={(open) => {
                      if (!open) {
                        setIsEditDialogOpen(false);
                        setEditingCategory(null);
                        resetForm();
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 text-gray-300 hover:bg-gray-700"
                        onClick={() => handleEditOpen(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="bg-gray-900 border border-gray-700 text-white">
                      <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                      </DialogHeader>

                      <form
                        onSubmit={handleSubmit}
                        className={`space-y-4 ${
                          isSaving ? "opacity-70 pointer-events-none" : ""
                        }`}
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`name_edit_${category.id}`}>
                            Category Name
                          </Label>
                          <Input
                            id={`name_edit_${category.id}`}
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="bg-gray-800 border border-gray-700 text-white placeholder:text-gray-400"
                            placeholder="Enter category name"
                            disabled={isSaving}
                            required
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsEditDialogOpen(false);
                              setEditingCategory(null);
                              resetForm();
                            }}
                            className="border-gray-700 text-gray-300 hover:bg-gray-700"
                            disabled={isSaving}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/40 text-red-400 hover:bg-red-900/20"
                        disabled={isDeletingId === category.id}
                      >
                        {isDeletingId === category.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900 border border-gray-700 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          Are you sure you want to delete "{category.name}"?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border border-gray-700 text-gray-300 hover:bg-gray-800">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(category.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
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

        {/* Empty state */}
        {categories.length === 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-md p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No categories found
            </h3>
            <p className="text-gray-400">
              Create your first category to organize products
            </p>
          </div>
        )}

        {/* Pagination buttons styled like Orders theme */}
        {(prevPage || nextPage) && (
          <div className="flex justify-between mt-4">
            <Button
              onClick={() => loadCategories(page - 1)}
              disabled={!prevPage}
              className="bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              Previous
            </Button>
            <Button
              onClick={() => loadCategories(page + 1)}
              disabled={!nextPage}
              className="bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
