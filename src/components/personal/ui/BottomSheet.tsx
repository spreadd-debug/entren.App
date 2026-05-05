import React, { useEffect, useState } from 'react';
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
  // Offset del teclado virtual (iOS) — calculamos cuánto se "comió" la altura
  // del visualViewport para levantar el bottom del sheet por encima del teclado.
  // Sin esto, los CTAs (Guardar / Confirmar) quedan tapados por el teclado o
  // el sheet entero scrollea con el parent y no se ve.
  const [keyboardOffset, setKeyboardOffset] = useState(0);

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

  // Tracking del teclado virtual (iOS / Android) usando VisualViewport API.
  // El sheet sólo se renderiza cuando open=true, así que el listener queda
  // limpio al cerrarse.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, inset));
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      setKeyboardOffset(0);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            // fixed en mobile (queda anclado al viewport, no scrollea con el
            // PersonalLayout cuando estás en mitad del feed), absolute en
            // desktop (dentro del frame iPhone).
            className="fixed md:absolute inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={dismissOnBackdrop ? onClose : undefined}
          />
          <motion.div
            className="fixed md:absolute left-0 right-0 z-50 mx-auto md:mx-0 max-w-[480px] md:max-w-none bg-[var(--color-cream-50)] rounded-t-[2rem] shadow-2xl flex flex-col"
            // bottom dinámico: si hay teclado virtual, se levanta por encima.
            // En desktop keyboardOffset es 0 → bottom: 0px (= bottom-0 visual).
            // max-height: calc resta el teclado al 85dvh para que el sheet
            // nunca extienda arriba del viewport cuando hay teclado abierto.
            style={{ bottom: keyboardOffset, maxHeight: `calc(85dvh - ${keyboardOffset}px)` }}
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
