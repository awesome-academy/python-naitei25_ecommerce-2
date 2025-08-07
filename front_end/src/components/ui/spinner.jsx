import React from "react";

/**
 * A simple loading spinner component using Tailwind CSS.
 *
 * @param {{ className?: string }} props
 * @returns {JSX.Element}
 */
export function Spinner({ className = "" }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-4 border-gray-200 border-t-slate-500 ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
