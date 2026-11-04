"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const CLOSE_MS = 200;

/**
 * Native <dialog>: traps focus, closes on Escape and sits above everything else.
 * Children mount only while open, so forms start fresh each time.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Stays true through the exit animation, so content doesn't vanish mid-close.
  const [rendered, setRendered] = useState(false);
  if (open && !rendered) setRendered(true);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.classList.remove("closing");
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
      return;
    }
    if (!dialog.open) return;
    dialog.classList.add("closing");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => {
      dialog.close();
      dialog.classList.remove("closing");
      document.body.style.overflow = "";
      setRendered(false);
    }, reduced ? 0 : CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(
    () => () => {
      document.body.style.overflow = "";
    },
    [],
  );

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // The dialog element itself only receives clicks on its backdrop.
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {rendered && (
        <>
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </>
      )}
    </dialog>
  );
}

/** Button row that stays visible while a long form scrolls. */
export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 flex gap-2 border-t border-line bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>*]:flex-1">
      {children}
    </div>
  );
}
