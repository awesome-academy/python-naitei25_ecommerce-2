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

export function Users() {
  const api = useAdminApi();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUserIds, setLoadingUserIds] = useState([]); // track IDs currently updating

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
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="text-gray-300">Manage customer accounts</p>
        </div>

        {/* Search bar */}
        <div className="bg-gray-900 p-4 rounded-md">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
              className="pl-10 bg-gray-800 border border-gray-700 text-white"
            />
          </div>
          <div className="mt-3">
            <Button onClick={loadUsers} disabled={isLoading}>
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
                  className="bg-gray-900 text-white p-6 rounded-md shadow"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {user.first_name} {user.last_name}
                      </h3>
                      <p className="text-sm text-gray-400">ID: #{user.id}</p>
                      {user.is_active ? (
                        <span className="flex items-center text-green-400 text-sm mt-1">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center text-red-400 text-sm mt-1">
                          <Ban className="w-4 h-4 mr-1" /> Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{user.phone_number || "No phone"}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {user.is_active ? (
                      <Button
                        variant="destructive"
                        onClick={() => deactivateUser(user.id)}
                        disabled={isUserLoading}
                      >
                        {isUserLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        {isUserLoading ? "Deactivating..." : "Deactivate"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => reactivateUser(user.id)}
                        disabled={isUserLoading}
                      >
                        {isUserLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        {isUserLoading ? "Reactivating..." : "Reactivate"}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-900 text-center p-8 rounded-md">
            <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-white font-semibold">
              {isLoading ? "Loading..." : "No users found"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
