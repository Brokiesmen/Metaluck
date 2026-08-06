import { useEffect, type ReactNode, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: ReactNode;
  onClose: () => void;
  /** Extra classes on the overlay (e.g. settings-overlay) */
  overlayClassName?: string;
  /** Extra classes on the sheet (e.g. topup-sheet) */
  sheetClassName?: string;
  labelledBy?: string;
}

/**
 * Bottom-sheet modal portaled to document.body.
 * Avoids iOS Safari bugs where position:fixed inside overflow:scroll
 * (page-content) misplaces the sheet and makes buttons untappable.
 */
export function ModalShell({
  children,
  onClose,
  overlayClassName = '',
  sheetClassName = '',
  labelledBy,
}: Props) {
  useEffect(() => {
    const root = document.documentElement;
    const prevOverflow = document.body.style.overflow;
    root.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    return () => {
      root.classList.remove('modal-open');
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const stop = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return createPortal(
    <div
      className={`modal-overlay${overlayClassName ? ` ${overlayClassName}` : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`modal-sheet${sheetClassName ? ` ${sheetClassName}` : ''}`}
        onClick={stop}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
