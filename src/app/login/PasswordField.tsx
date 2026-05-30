"use client";

import { useState } from "react";

export function PasswordField() {
  const [show, setShow] = useState(false);

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">Password</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-black/15 px-3 py-2 pr-16 text-sm outline-none focus:border-neutral-900 dark:border-white/20 dark:bg-neutral-800 dark:focus:border-white"
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          aria-pressed={show}
          className="absolute inset-y-0 right-2 my-auto h-fit rounded px-1.5 py-0.5 text-xs font-medium text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
