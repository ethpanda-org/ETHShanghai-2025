"use client";

import { ReactNode, useEffect } from "react";

export default function PixelModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="pixel-card cyan w-[92vw] max-w-[520px]" onClick={e => e.stopPropagation()}>
        <div className="badge-pixel">{title}</div>
        <div className="pixel-surface mt-3">{children}</div>
        <div className="mt-3 flex justify-end">
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
