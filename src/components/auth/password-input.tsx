"use client";

import React, { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthInput, type AuthInputProps } from "./auth-input";

export interface PasswordInputProps extends Omit<AuthInputProps, "type" | "rightElement"> {
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <AuthInput
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        rightElement={
          showToggle ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setVisible((prev) => !prev)}
              className="inline-flex size-8 items-center justify-center rounded-lg text-ink-400 hover:text-ink-700 hover:bg-warm-100/80 active:bg-warm-200/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
              aria-label={visible ? "Hide password" : "Show password"}
              title={visible ? "Hide password" : "Show password"}
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          ) : undefined
        }
      />
    );
  },
);

PasswordInput.displayName = "PasswordInput";
