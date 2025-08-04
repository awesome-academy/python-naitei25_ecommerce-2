import React from "react";

// Utility to merge class names
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Define variant styles
const variantClasses = {
  default: "bg-gray-100 text-gray-800",
  secondary: "bg-slate-100 text-slate-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  destructive: "bg-red-100 text-red-800",
  outline: "border border-gray-200 text-gray-800",
};

/**
 * Badge component wraps children in a styled span.
 *
 * Props:
 * - variant: one of 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
 * - className: additional tailwind classes
 */
const Badge = React.forwardRef(
  ({ variant = "default", className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
