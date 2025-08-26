import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User as UserIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function getDisplayName(user) {
  if (!user) return "";
  // prefer name from AuthContext if present
  if (user.name && user.name.trim()) return user.name.trim();
  // fallback to first + last
  const full = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (full) return full;
  // fallback to email's local-part
  if (user.email) return user.email.split("@")[0];
  return "Account";
}

const UserNav = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    let alive = true;
    if (!user) {
      setAvatarUrl("");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setAvatarUrl("");
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/profile/`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) return;
        const p = await res.json();
        if (!alive) return;
        setAvatarUrl(p?.avatar || "");
      } catch {
        // silent fail, keep default icon
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Link to="/login">
          <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
            Login
          </Button>
        </Link>
        <Link to="/register">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Register
          </Button>
        </Link>
      </div>
    );
  }

  const displayName = getDisplayName(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-auto rounded-full pl-1 pr-2"
        >
          {/* Avatar (or default icon) */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="h-8 w-8 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "";
              }}
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600">
              <UserIcon className="h-5 w-5" />
            </div>
          )}
          <span className="ml-2 hidden sm:block text-sm text-gray-800">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem className="flex flex-col items-start !text-black">
          <p className="text-sm font-medium leading-none">{displayName}</p>
          <p className="text-xs leading-none text-muted-foreground">
            {user.email}
          </p>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/orders")}>
          My Orders
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserNav;
