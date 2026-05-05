import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Estado global "esconder balances" (modo privacidad). Cuando está prendido,
// los componentes que muestran montos los reemplazan por '••••••'.
//
// Persiste en localStorage entre sesiones. Sincronizado entre todos los
// componentes vía Context — un toggle en el Dashboard actualiza Money,
// Accounts, etc. en simultáneo.

const STORAGE_KEY = 'v1:personal:hideBalances';

interface Ctx {
  hidden: boolean;
  toggle: () => void;
  setHidden: (v: boolean) => void;
}

const HideBalancesContext = createContext<Ctx | null>(null);

export const HideBalancesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hidden, setHiddenState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem(STORAGE_KEY) === '1'; }
    catch { return false; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0'); }
    catch { /* localStorage roto — seguimos en memoria */ }
  }, [hidden]);

  const setHidden = useCallback((v: boolean) => setHiddenState(v), []);
  const toggle = useCallback(() => setHiddenState(prev => !prev), []);

  return React.createElement(
    HideBalancesContext.Provider,
    { value: { hidden, toggle, setHidden } },
    children,
  );
};

export function useHideBalances(): { hidden: boolean; toggle: () => void; setHidden: (v: boolean) => void; mask: (formatted: string) => string } {
  const ctx = useContext(HideBalancesContext);
  if (!ctx) {
    // Fallback: si alguien usa el hook fuera del Provider, no rompemos —
    // devolvemos un dummy que nunca esconde nada.
    return { hidden: false, toggle: () => {}, setHidden: () => {}, mask: (s) => s };
  }
  return {
    ...ctx,
    mask: (formatted: string) => (ctx.hidden ? '••••••' : formatted),
  };
}
