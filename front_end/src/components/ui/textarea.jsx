import * as React from "react";

/**
 * Simple, modern textarea with:
 * - rounded-xl, subtle shadow
 * - soft ring on focus
 * - smooth transitions
 */
export const Textarea = React.forwardRef(function Textarea(
  { className = "", ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={[
        "w-full min-h-[120px]",
        "rounded-xl border border-gray-200 bg-white",
        "px-3 py-2 text-sm leading-6",
        "shadow-sm outline-none",
        "placeholder:text-gray-400",
        "focus:ring-4 focus:ring-slate-100 focus:border-slate-400",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "transition-[box-shadow,border-color] duration-200",
        className,
      ].join(" ")}
      {...props}
    />
  );
});

export default Textarea;
