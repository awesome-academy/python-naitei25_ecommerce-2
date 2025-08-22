// src/components/admin/ui/OrderStatusProgression.jsx
import React, { useState } from "react";
import { ChevronRight, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/admin/ui/dialog";

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

export const OrderStatusProgression = ({
  currentStatus,
  orderId,
  onStatusChange,
  isLoading = false,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const getCurrentIndex = () => {
    return STATUS_PROGRESSION.findIndex((s) => s.key === currentStatus);
  };

  const getNextStatus = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex >= 0 && currentIndex < STATUS_PROGRESSION.length - 1) {
      return STATUS_PROGRESSION[currentIndex + 1];
    }
    return null;
  };

  const canCancel = currentStatus === "PENDING";
  const canProgress = getNextStatus() !== null;
  const isCancelled = currentStatus === "CANCELLED";

  const handleProgressClick = () => {
    const nextStatus = getNextStatus();
    if (nextStatus) {
      setPendingAction({
        type: "progress",
        from: currentStatus,
        to: nextStatus.key,
        label: nextStatus.label,
      });
      setShowConfirmModal(true);
    }
  };

  const handleCancelClick = () => {
    if (canCancel) {
      setPendingAction({
        type: "cancel",
        from: currentStatus,
        to: "CANCELLED",
        label: "Cancelled",
      });
      setShowConfirmModal(true);
    }
  };

  const handleConfirm = async () => {
    if (pendingAction && onStatusChange) {
      await onStatusChange(orderId, pendingAction.to);
    }
    setShowConfirmModal(false);
    setPendingAction(null);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setPendingAction(null);
  };

  const currentStatusObj = STATUS_PROGRESSION.find(
    (s) => s.key === currentStatus
  ) || { key: "CANCELLED", label: "Cancelled", color: "red" };
  const colors = STATUS_COLORS[currentStatusObj.color];

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Current Status Badge */}
        <div
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {currentStatusObj.label}
        </div>

        {/* Progress Button */}
        {canProgress && !isCancelled && (
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

        {/* Cancel Button */}
        <Button
          size="sm"
          onClick={handleCancelClick}
          disabled={!canCancel || isLoading || isCancelled}
          className={`h-8 w-8 p-0 rounded-md transition-all ${
            canCancel && !isCancelled
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-red-200 text-red-400 cursor-not-allowed opacity-50"
          }`}
          title={
            canCancel && !isCancelled
              ? "Cancel order"
              : "Can only cancel pending orders"
          }
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Confirm Status Change
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {pendingAction?.type === "cancel" ? (
                <>
                  Are you sure you want to <strong>cancel</strong> order #
                  {orderId}?
                  <br />
                  <span className="text-sm text-red-600 mt-2 block">
                    This action cannot be undone.
                  </span>
                </>
              ) : (
                <>
                  Change order #{orderId} status from{" "}
                  <strong>{pendingAction?.from}</strong> to{" "}
                  <strong>{pendingAction?.label}</strong>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="border-gray-300 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className={
                pendingAction?.type === "cancel"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }
            >
              {isLoading ? "Updating..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrderStatusProgression;
