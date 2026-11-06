"use client";

import { useEffect, useId, useRef, useState } from "react";
import { COUNTRIES, countryByIso, flagEmoji, formatPhone, parsePhone } from "@/lib/countries";
import { cn } from "./ui";

/** One field combining a searchable country picker and the number; submits "+971501234567" as `name`. */
export function PhoneInput({
  label = "Phone",
  name = "phone",
  defaultValue,
  required,
  openUp,
}: {
  label?: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  /** Opens the country list above the field, for forms near the bottom of the screen. */
  openUp?: boolean;
}) {
  const id = useId();
  const initial = parsePhone(defaultValue);
  const [iso, setIso] = useState(initial.iso);
  const [number, setNumber] = useState(initial.number);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const numberInput = useRef<HTMLInputElement>(null);
  const country = countryByIso(iso);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const q = query.trim().toLowerCase().replace(/^\+/, "");
  const matches = q ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dial.startsWith(q)) : COUNTRIES;

  const choose = (nextIso: string) => {
    setIso(nextIso);
    setOpen(false);
    setQuery("");
    numberInput.current?.focus();
  };

  return (
    <div ref={root} className="relative space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input type="hidden" name={name} value={formatPhone(iso, number)} />
      <div className="flex rounded-lg border border-line bg-surface-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country code: ${country.name} +${country.dial}`}
          className="flex shrink-0 items-center gap-1.5 rounded-l-lg border-r border-line px-3 py-2 text-sm outline-none hover:bg-line/50"
        >
          <span aria-hidden>{flagEmoji(country.iso)}</span>
          <span className="font-mono tabular-nums">+{country.dial}</span>
          <svg viewBox="0 0 24 24" className={cn("size-3.5 text-muted transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <input
          ref={numberInput}
          id={id}
          type="tel"
          inputMode="tel"
          required={required}
          autoComplete="tel-national"
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/[^\d\s()-]/g, ""))}
          placeholder="Phone number"
          className="min-w-0 flex-1 rounded-r-lg bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/60"
        />
      </div>

      {open && (
        <div className={cn("absolute left-0 z-30 w-80 max-w-full overflow-hidden rounded-lg border border-line bg-surface shadow-2xl shadow-black/30", openUp ? "bottom-full mb-1" : "mt-1")}>
          <div className="border-b border-line p-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter") {
                  // Pick the top result instead of submitting the form.
                  e.preventDefault();
                  if (matches[0]) choose(matches[0].iso);
                }
              }}
              placeholder="Search country or code"
              aria-label="Search country or code"
              className="w-full rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none placeholder:text-muted/60 focus:border-brand"
            />
          </div>
          <ul role="listbox" aria-label="Country code" className={cn("overflow-y-auto overscroll-contain py-1", openUp ? "max-h-44" : "max-h-60")}>
            {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matches</li>}
            {matches.map((c) => (
              <li key={c.iso} role="option" aria-selected={c.iso === iso}>
                <button
                  type="button"
                  onClick={() => choose(c.iso)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2",
                    c.iso === iso && "bg-brand/10",
                  )}
                >
                  <span aria-hidden>{flagEmoji(c.iso)}</span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-xs text-muted tabular-nums">+{c.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
