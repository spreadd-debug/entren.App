import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // bloquea cierre al tocar backdrop (útil para forms con cambios sin guardar)
  dismissOnBackdrop?: boolean;
}

export const BottomSheet: React.FC<Props> = ({
  open,
  onClose,
  title,
  children,
  dismissOnBackdrop = true,
}) => {
  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC cierra
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={dismissOnBackdrop ? onClose : undefined}
          />
          <motion.div
            className="absolute left-0 right-0 bottom-0 z-50 bg-[var(--color-cream-50)] rounded-t-[2rem] shadow-2xl flex flex-col max-h-[85%]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center pt-2.5 pb-1 shrink-0">
              <span className="w-10 h-1.5 rounded-full bg-[var(--color-ink)]/15" />
            </div>
            {title && (
              <div className="px-6 pb-3 shrink-0">
                <h3 className="font-serif text-2xl text-[var(--color-ink)] leading-tight">{title}</h3>
              </div>
            )}
            <div className="overflow-y-auto px-6 pb-8 flex-1">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
