// src/components/admin/ui/OrderStatusProgression.jsx
import React, { useMemo, useState } from "react";
import { ChevronRight, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/admin/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select";

const STATUS_PROGRESSION = [
  { key: "PENDING", label: "Pending", color: "yellow" },
  { key: "CONFIRMED", label: "Confirmed", color: "blue" },
  { key: "SHIPPED", label: "Shipped", color: "purple" },
  { key: "DELIVERED", label: "Delivered", color: "green" },
];

const STATUS_COLORS = {
  yellow: {
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    border: "border-yellow-200",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-200",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
  },
};

// Default reasons map to your Python `RejectReason`
const DEFAULT_REJECT_REASONS = [
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
  { value: "SUSPICIOUS_ORDER", label: "Suspicious Order" },
  { value: "PAYMENT_ISSUE", label: "Payment Issue" },
  { value: "ADDRESS_ISSUE", label: "Address Issue" },
  { value: "OTHER", label: "Other" },
];

export const OrderStatusProgression = ({
  currentStatus,
  orderId,
  onStatusChange,
  isLoading = false,
  /**
   * Optional: handle rejection in parent.
   * Signature: (orderId: number, reason: string) => Promise<void>|void
   */
  onReject,
  /**
   * Optional: override reject reasons from parent to keep FE and BE perfectly in sync.
   * Format: [{ value: "OUT_OF_STOCK", label: "Out of Stock" }, ...]
   */
  rejectReasons = DEFAULT_REJECT_REASONS,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState("");

  const getCurrentIndex = () =>
    STATUS_PROGRESSION.findIndex((s) => s.key === currentStatus);

  const getNextStatus = () => {
    const idx = getCurrentIndex();
    if (idx >= 0 && idx < STATUS_PROGRESSION.length - 1) {
      return STATUS_PROGRESSION[idx + 1];
    }
    return null;
  };

  const canProgress = !!getNextStatus();
  const canReject = !["DELIVERED", "CANCELLED", "REJECTED"].includes(
    String(currentStatus || "")
  );

  const currentStatusObj = STATUS_PROGRESSION.find(
    (s) => s.key === currentStatus
  ) || {
    key: currentStatus,
    label:
      currentStatus === "REJECTED"
        ? "Rejected"
        : currentStatus === "CANCELLED"
        ? "Cancelled"
        : String(currentStatus || "Unknown"),
    color:
      currentStatus === "REJECTED" || currentStatus === "CANCELLED"
        ? "red"
        : "yellow",
  };

  const colors = STATUS_COLORS[currentStatusObj.color] || STATUS_COLORS.yellow;

  // --- Handlers ---
  const handleProgressClick = () => {
    const next = getNextStatus();
    if (!next) return;
    setPendingAction({
      type: "progress",
      from: currentStatus,
      to: next.key,
      label: next.label,
    });
    setShowConfirmModal(true);
  };

  const handleConfirmProgress = async () => {
    if (pendingAction?.type === "progress" && onStatusChange) {
      await onStatusChange(orderId, pendingAction.to);
    }
    setShowConfirmModal(false);
    setPendingAction(null);
  };

  const handleRejectClick = () => {
    if (!canReject || isLoading) return;
    setSelectedRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRejectReason) return;
    if (typeof onReject === "function") {
      await onReject(orderId, selectedRejectReason);
    } else if (typeof onStatusChange === "function") {
      // Fallback: pass optional payload as 3rd arg if parent supports it
      await onStatusChange(orderId, "REJECTED", {
        reject_reason: selectedRejectReason,
      });
    }
    setShowRejectModal(false);
  };

  const reasonOptions = useMemo(
    () =>
      Array.isArray(rejectReasons) ? rejectReasons : DEFAULT_REJECT_REASONS,
    [rejectReasons]
  );

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Current Status Badge */}
        <div
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {currentStatusObj.label}
        </div>

        {/* Forward Progress */}
        {canProgress && (
          <Button
            size="sm"
            onClick={handleProgressClick}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 w-8 p-0 rounded-md"
            title={`Advance to ${getNextStatus()?.label}`}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {/* Reject Button (red X) */}
        {canReject && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRejectClick}
            disabled={isLoading}
            className="h-8 w-8 p-0 rounded-md"
            title="Reject order"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Confirm Progress Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Confirm Status Change
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Change order #{orderId} status from{" "}
              <strong>{pendingAction?.from}</strong> to{" "}
              <strong>{pendingAction?.label}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmModal(false);
                setPendingAction(null);
              }}
              disabled={isLoading}
              className="border-gray-300 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmProgress}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Updating..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal with Reason Dropdown */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              Reject Order #{orderId}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Please select a reason for rejection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Reject reason</label>
              <Select
                value={selectedRejectReason}
                onValueChange={setSelectedRejectReason}
              >
                <SelectTrigger className="bg-white border border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 text-gray-900">
                  {reasonOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
                disabled={isLoading}
                className="border-gray-300 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReject}
                disabled={isLoading || !selectedRejectReason}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? "Rejecting..." : "Reject Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrderStatusProgression;
