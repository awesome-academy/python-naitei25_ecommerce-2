import React from "react";

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold text-gray-900">
            Django Electro Store Staff
          </span>
          <p className="text-sm text-gray-600 mt-1">
            Your staff management dashboard
          </p>
        </div>
      </div>
    </header>
  );
}
