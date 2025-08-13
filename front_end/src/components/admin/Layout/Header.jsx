import React from "react";

export function Header() {
  return (
    <header className="glass-card border-b border-white/10 px-6 py-4 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent">
            Django Electro Store Staff
          </span>
          <p className="text-sm text-gray-400 mt-1">
            Your staff management dashboard
          </p>
        </div>
      </div>
    </header>
  );
}
