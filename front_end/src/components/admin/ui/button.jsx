import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default: Black background, white text
        default: "bg-black text-white hover:bg-gray-800",
        // Destructive: Red for danger actions
        destructive: "bg-red-600 text-white hover:bg-red-700",
        // Outline: Gray border, transparent background, black/gray text on hover
        outline:
          "border border-gray-600 bg-transparent text-gray-100 hover:bg-gray-700 hover:text-white",
        // Secondary: Dark gray background, light gray text
        secondary: "bg-gray-700 text-gray-200 hover:bg-gray-600",
        // Ghost: Transparent background, light gray text on hover
        ghost: "hover:bg-gray-700 hover:text-white",
        // Link: Gray text, underline on hover
        link: "text-gray-300 underline-offset-4 hover:underline hover:text-gray-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
