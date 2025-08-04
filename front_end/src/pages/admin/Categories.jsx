import React, { useState, useEffect } from "react";
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
import { useAdminApi } from "@/contexts/AdminApi";
import { toast } from "@/components/admin/ui/use-toast";
import { Plus, Trash2, FolderOpen, Tag } from "lucide-react";

export function Categories() {
  const [categories, setCategories] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "" });

  const api = useAdminApi();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const result = await api.get("/categories/");
    if (result.success) {
      setCategories(result.data);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await api.post("/categories/", formData);
    if (result.success) {
      loadCategories();
      setIsAddDialogOpen(false);
      resetForm();
    } else {
      toast({ title: "Failed to add category", variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    const result = await api.delete(`/categories/${id}/`);
    if (result.success) {
      loadCategories();
    } else {
      toast({ title: "Failed to delete category", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ name: "" });
  };

  return (
    <>
      <Helmet>
        <title>Categories - E-Commerce Admin Dashboard</title>
        <meta
          name="description"
          content="Manage product categories, organize your inventory, and create new product categories for your e-commerce store."
        />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Categories</h1>
            <p className="text-gray-400 mt-1">Organize your product catalog</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="glass-button bg-white hover:bg-gray-100 text-black border border-gray-200"
                onClick={resetForm}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-gray-700 text-white bg-gray-900">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                    placeholder="Enter category name"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="glass-button bg-white hover:bg-gray-100 text-black border border-gray-200"
                  >
                    Add Category
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        ---
        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 border-gray-800 hover:bg-gray-800/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {/* Changed gradient to grayscale */}
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                    <Tag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-400">ID: #{category.id}</p>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-gray-700 text-white bg-gray-900">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Category</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        Are you sure you want to delete "{category.name}"? This
                        action cannot be undone and may affect products in this
                        category.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(category.id)}
                        className="bg-red-600 hover:bg-red-700 text-white border border-red-500"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          ))}
        </div>
        {categories.length === 0 && (
          <div className="glass-card p-12 text-center border-gray-800">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No categories found
            </h3>
            <p className="text-gray-400">
              Create your first category to organize products
            </p>
          </div>
        )}
      </div>
    </>
  );
}
