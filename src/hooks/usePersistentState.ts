import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';

// Igual que useState, pero el valor se persiste en localStorage bajo la key dada.
// En el primer render, si hay un valor cacheado, lo devuelve al instante (sin
// fetch). Devuelve también un flag `hadCache` (true si se hidrato desde caché),
// útil para no mostrar 'Cargando...' cuando ya hay datos viejos en pantalla.
//
// Patrón stale-while-revalidate: la página renderiza con cache → dispara fetch
// en background → cuando llega data nueva, setValue la pisa y se reescribe la
// caché. Cero pantallas en blanco entre navegaciones.
//
// El versionado va en la key (ej. 'v1:personal:dashboard:sleep'). Si cambia el
// shape de los datos, bumpeá la versión para invalidar todo el caché viejo.
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  // useMemo se asegura de que la lectura de localStorage corra una sola vez,
  // aunque el componente se re-renderice antes de pasarse a useState.
  const initialState = useMemo(() => {
    if (typeof window === 'undefined') return { value: initial, hadCache: false };
    try {
      const cached = window.localStorage.getItem(key);
      if (cached !== null) {
        return { value: JSON.parse(cached) as T, hadCache: true };
      }
    } catch {
      // localStorage puede tirar (modo privado, cuota llena) — fallback a initial.
    }
    return { value: initial, hadCache: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const [value, setValue] = useState<T>(initialState.value);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Idem: si localStorage no anda, seguimos en memoria sin cachear.
    }
  }, [key, value]);

  return [value, setValue, initialState.hadCache];
}
