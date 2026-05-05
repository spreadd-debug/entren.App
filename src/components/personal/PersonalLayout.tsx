import React from 'react';
import { Outlet } from 'react-router-dom';
import { HideBalancesProvider } from '../../hooks/useHideBalances';

/**
 * Wrapper de la sección "Personal Life Tracker" del superadmin.
 *
 * Es 100% mobile-first. En viewports >= md, el contenido se renderiza dentro
 * de un frame centrado tipo iPhone para que el desktop muestre el mismo layout
 * que el mobile real (en lugar de estirarlo a full-width).
 *
 * El className `personal-theme` activa scoping para los design tokens (cream,
 * Fraunces, etc.) — los componentes en src/components/personal/* asumen estar
 * dentro de este wrapper.
 */
export const PersonalLayout: React.FC = () => {
  return (
    <HideBalancesProvider>
      <div className="personal-theme min-h-screen w-full bg-neutral-100 font-sans flex md:items-center md:justify-center md:p-6">
        {/* Frame mobile: fullscreen <md, centrado >=md */}
        <div className="relative w-full md:w-[420px] md:h-[860px] md:max-h-[calc(100vh-3rem)] md:rounded-[2.75rem] md:overflow-hidden md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] bg-[var(--color-cream-100)]">
          <div className="relative w-full h-full overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </HideBalancesProvider>
  );
};
