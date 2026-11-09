"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "./ui";

export type PickerClient = { id: string; name: string; detail: string };

const MAX_SHOWN = 8;

/**
 * Type to find a client by name, email or username; works for hundreds of clients where a plain
 * dropdown doesn't. Submits the chosen client's id as `name`.
 */
export function ClientPicker({ name, clients, defaultValue }: { name: string; clients: PickerClient[]; defaultValue?: string }) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState(() => clients.find((c) => c.id === defaultValue) ?? null);
  const [query, setQuery] = useState(chosen?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const found = words.length
      ? clients.filter((c) => {
          const text = `${c.name} ${c.detail}`.toLowerCase();
          return words.every((w) => text.includes(w));
        })
      : clients;
    return found.slice(0, MAX_SHOWN);
  }, [clients, query]);

  const pick = (c: PickerClient) => {
    setChosen(c);
    setQuery(c.name);
    setOpen(false);
    input.current?.setCustomValidity("");
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={chosen?.id ?? ""} />
      <input
        ref={input}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Search by name, email or username"
        value={query}
        required
        onChange={(e) => {
          setQuery(e.target.value);
          setChosen(null);
          setActive(0);
          setOpen(true);
          // Typing without picking isn't a choice: the form won't submit until one is picked.
          e.target.setCustomValidity("Choose a client from the list.");
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open && matches[active]) {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/60 focus:border-brand"
      />
      {chosen && <p className="mt-1 truncate text-xs text-muted">{chosen.detail}</p>}
      {open && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No client matches “{query}”.</li>
          ) : (
            matches.map((c, i) => (
              <li
                key={c.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                onMouseEnter={() => setActive(i)}
                className={cn("cursor-pointer px-3 py-2 text-sm", i === active && "bg-brand/10")}
              >
                <p className="font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted">{c.detail}</p>
              </li>
            ))
          )}
          {matches.length === MAX_SHOWN && <li className="px-3 py-1.5 text-xs text-muted">Keep typing to narrow the list.</li>}
        </ul>
      )}
    </div>
  );
}
