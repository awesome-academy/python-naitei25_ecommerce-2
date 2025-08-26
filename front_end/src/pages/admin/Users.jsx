// src/pages/admin/Users.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { useAdminApi } from "@/contexts/AdminAPI";
import { toast } from "@/components/admin/ui/use-toast";
import {
  Users as UsersIcon,
  Search,
  Mail,
  Phone,
  User,
  Ban,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import ConfirmButton from "@/components/admin/ui/ConfirmButton";

export function Users() {
  const api = useAdminApi();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUserIds, setLoadingUserIds] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const res = await api.get("/admin/users/", {
      params: searchTerm ? { search: searchTerm } : {},
    });
    if (res.success) {
      const data = res.data?.results || [];
      setUsers(data);
    } else {
      toast({ variant: "destructive", title: "Failed to load users" });
    }
    setIsLoading(false);
  };

  const deactivateUser = async (id) => {
    setLoadingUserIds((prev) => [...prev, id]);
    const res = await api.post(`/admin/users/${id}/deactivate/`);
    if (res.success) {
      toast({ title: "User deactivated" });
      loadUsers();
    } else {
      toast({ variant: "destructive", title: "Failed to deactivate" });
    }
    setLoadingUserIds((prev) => prev.filter((uid) => uid !== id));
  };

  const reactivateUser = async (id) => {
    setLoadingUserIds((prev) => [...prev, id]);
    const res = await api.patch(`/admin/users/${id}/deactivate/`);
    if (res.success) {
      toast({ title: "User reactivated" });
      loadUsers();
    } else {
      toast({ variant: "destructive", title: "Failed to reactivate" });
    }
    setLoadingUserIds((prev) => prev.filter((uid) => uid !== id));
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Users - Admin Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage customer accounts</p>
        </div>

        {/* Search bar */}
        <div className="bg-white border border-gray-200 p-4 rounded-md shadow-sm">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
              className="pl-10 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="mt-3">
            <Button
              onClick={loadUsers}
              disabled={isLoading}
              className="bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200"
            >
              {isLoading ? "Loading..." : "Search"}
            </Button>
          </div>
        </div>

        {/* Users grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((user) => {
              const isUserLoading = loadingUserIds.includes(user.id);
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white text-gray-900 p-6 rounded-md shadow-sm border border-gray-200"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {user.first_name} {user.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">ID: #{user.id}</p>
                      {user.is_active ? (
                        <span className="flex items-center text-green-700 text-sm mt-1">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center text-red-700 text-sm mt-1">
                          <Ban className="w-4 h-4 mr-1" /> Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{user.phone_number || "No phone"}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {user.is_active ? (
                      <ConfirmButton
                        title="Deactivate user?"
                        description={`Are you sure you want to deactivate "${user.email}"? They won't be able to sign in.`}
                        confirmText="Deactivate"
                        onConfirm={() => deactivateUser(user.id)}
                        disabled={isUserLoading}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isUserLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deactivating...
                          </>
                        ) : (
                          "Deactivate"
                        )}
                      </ConfirmButton>
                    ) : (
                      <ConfirmButton
                        title="Reactivate user?"
                        description={`Allow "${user.email}" to sign in again.`}
                        confirmText="Reactivate"
                        onConfirm={() => reactivateUser(user.id)}
                        disabled={isUserLoading}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {isUserLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Reactivating...
                          </>
                        ) : (
                          "Reactivate"
                        )}
                      </ConfirmButton>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white text-center p-8 rounded-md border border-gray-200 shadow-sm">
            <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-900 font-semibold">
              {isLoading ? "Loading..." : "No users found"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
