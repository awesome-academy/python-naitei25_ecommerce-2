// src/components/admin/ui/ConfirmButton.jsx
import React, { useState } from "react";
import { Button } from "@/components/admin/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/admin/ui/alert-dialog";
import { Loader2 } from "lucide-react";

/**
 * Reusable confirmation button.
 * Props:
 * - title, description: strings for the dialog
 * - onConfirm: async () => Promise<void> | void
 * - confirmText="Confirm", cancelText="Cancel"
 * - asChild: use your own trigger (e.g. another <Button/>)
 * - disabled, className, variant, size
 */
export default function ConfirmButton({
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  asChild = false,
  disabled = false,
  className = "",
  variant,
  size,
  children, // optional custom trigger content
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    try {
      setBusy(true);
      await Promise.resolve(onConfirm?.());
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const Trigger = (
    <Button
      disabled={disabled}
      className={className}
      variant={variant}
      size={size}
      type="button"
    >
      {children}
    </Button>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild={asChild}>
        {asChild ? children : Trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white border border-gray-200 text-gray-900 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="text-gray-600">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border border-gray-300 text-gray-800 hover:bg-gray-100">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {busy ? "Working..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
