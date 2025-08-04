// src/components/ui/card.jsx
import React from "react";

/**
 * Card container wraps content in a styled panel.
 */
export const Card = ({ className = "", children, ...props }) => (
  <div
    className={`bg-white border border-gray-200 rounded-2xl shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

/**
 * CardHeader groups title and meta at the top of Card.
 */
export const CardHeader = ({ className = "", children, ...props }) => (
  <div className={`px-4 py-3 border-b border-gray-100 ${className}`} {...props}>
    {children}
  </div>
);

/**
 * CardTitle styles the main heading of the Card.
 */
export const CardTitle = ({ className = "", children, ...props }) => (
  <h2 className={`text-lg font-semibold ${className}`} {...props}>
    {children}
  </h2>
);

/**
 * CardContent wraps the main content area of Card.
 */
export const CardContent = ({ className = "", children, ...props }) => (
  <div className={`p-4 ${className}`} {...props}>
    {children}
  </div>
);
