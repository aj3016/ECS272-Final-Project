import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function HelpModal({ open, title = "Help", children, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="helpOverlay" role="dialog" aria-modal="true">
      <div className="helpBackdrop" onPointerDown={() => onClose?.()} />

      <div
        className="helpCard"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="helpHeader">
          <div>
            <div className="helpTitle">{title}</div>
            <div className="helpSub">
              Press <b>Esc</b> to close.
            </div>
          </div>

          <button type="button" className="helpCloseBtn" onClick={() => onClose?.()}>
            ✕
          </button>
        </div>

        <div className="helpBody">{children}</div>

        <div className="helpFooter">
          <button type="button" className="helpOkBtn" onClick={() => onClose?.()}>
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}