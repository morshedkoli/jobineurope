"use client";

import { useState } from "react";

export function PasswordField() {
  const [show, setShow] = useState(false);

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">Password</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name="password"
          required
          autoComplete="current-password"
          className="glass-input pr-16"
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          aria-pressed={show}
          className="absolute inset-y-0 right-2 my-auto h-fit rounded px-1.5 py-0.5 text-xs font-medium text-faint transition hover:text-[var(--fg)]"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
