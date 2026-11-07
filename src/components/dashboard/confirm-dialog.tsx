"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { ModalDialog } from "@/components/dashboard/modal-dialog";

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
}: ConfirmDialogProps) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-brand-500 hover:bg-brand-600"
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {isDestructive && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
            <AlertTriangle size={18} />
          </div>
        )}
        <p className="text-xs text-ink-600 leading-relaxed pt-1">
          {message}
        </p>
      </div>
    </ModalDialog>
  );
}

