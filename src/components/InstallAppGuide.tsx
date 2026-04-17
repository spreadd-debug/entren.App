import React, { useState } from "react";
import {
  Download,
  Share,
  MoreVertical,
  MoreHorizontal,
  ChevronDown,
  Plus,
  Check,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { isNative } from "../lib/platform";

const AppIconPreview: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <div
    className="rounded-2xl overflow-hidden bg-white shadow-lg shadow-violet-500/30 flex items-center justify-center"
    style={{ width: size, height: size }}
  >
    <img src="/logo.png" alt="EntrenApp" className="w-full h-full object-contain" />
  </div>
);

export type DeviceType = "iphone" | "android" | null;

const INSTALL_GUIDE_SEEN_KEY = "install_guide_seen";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = (navigator as any).standalone === true;
  return mq || iosStandalone;
}

export function shouldShowInstallGuide(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(INSTALL_GUIDE_SEEN_KEY) === "1") return false;
  if (isNative()) return false;
  if (isRunningStandalone()) return false;
  if (!isMobileDevice()) return false;
  return true;
}

export function markInstallGuideSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTALL_GUIDE_SEEN_KEY, "1");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function DevicePicker({ onSelect }: { onSelect: (d: DeviceType) => void }) {
  return (
    <div className="space-y-3">
      <button
        onClick={() => onSelect("iphone")}
        className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl px-4 py-4 transition-all group"
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-800" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
        </div>
        <div className="text-left flex-1">
          <p className="text-white font-bold text-sm">iPhone</p>
          <p className="text-violet-300/50 text-xs">Safari</p>
        </div>
        <ChevronRight size={18} className="text-violet-400/40 group-hover:text-violet-300/70 transition-colors" />
      </button>

      <button
        onClick={() => onSelect("android")}
        className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl px-4 py-4 transition-all group"
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.27-.86-.31-.16-.69-.04-.86.27l-1.86 3.22c-1.3-.58-2.77-.92-4.35-.92s-3.05.34-4.35.92L5.79 5.71c-.16-.31-.54-.43-.86-.27-.31.16-.43.55-.27.86L6.5 9.48C3.76 11.08 1.88 13.87 1.5 17h21c-.38-3.13-2.26-5.92-4.9-7.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" />
          </svg>
        </div>
        <div className="text-left flex-1">
          <p className="text-white font-bold text-sm">Android</p>
          <p className="text-violet-300/50 text-xs">Chrome</p>
        </div>
        <ChevronRight size={18} className="text-violet-400/40 group-hover:text-violet-300/70 transition-colors" />
      </button>
    </div>
  );
}

export function IPhoneGuide() {
  const steps = [
    {
      num: 1,
      title: "Tocá los 3 puntitos",
      desc: "En la barra de Safari. Ahí es donde aparece el botón de Compartir.",
      visual: (
        <div className="flex items-center justify-center py-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <MoreHorizontal size={20} className="text-white/80" />
          </div>
        </div>
      ),
    },
    {
      num: 2,
      title: 'Tocá "View More"',
      desc: "Se despliegan más opciones del menú.",
      visual: (
        <div className="bg-white/5 rounded-xl px-3 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <ChevronDown size={16} className="text-white/70" />
          </div>
          <span className="text-white/70 text-xs font-medium">View More</span>
        </div>
      ),
    },
    {
      num: 3,
      title: "Tocá el botón Compartir",
      desc: "Es el ícono con una flechita hacia arriba.",
      visual: (
        <div className="flex items-center justify-center py-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Share size={20} className="text-blue-400" />
          </div>
        </div>
      ),
    },
    {
      num: 4,
      title: 'Buscá "Agregar a Inicio"',
      desc: "Está abajo de todo. Deslizá hasta encontrarla.",
      visual: (
        <div className="bg-white/5 rounded-xl px-3 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Plus size={16} className="text-white/70" />
          </div>
          <span className="text-white/70 text-xs font-medium">Agregar a pantalla de inicio</span>
        </div>
      ),
    },
    {
      num: 5,
      title: 'Tocá "Agregar"',
      desc: "¡Listo! La app aparece en tu pantalla de inicio.",
      visual: (
        <div className="flex items-center justify-center py-2">
          <AppIconPreview />
        </div>
      ),
    },
  ];

  return <GuideSteps steps={steps} />;
}

export function AndroidGuide() {
  const steps = [
    {
      num: 1,
      title: "Tocá los 3 puntos",
      desc: "Están arriba a la derecha en Chrome.",
      visual: (
        <div className="flex items-center justify-center py-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
            <MoreVertical size={20} className="text-emerald-400" />
          </div>
        </div>
      ),
    },
    {
      num: 2,
      title: '"Instalar aplicación" o "Agregar a inicio"',
      desc: "Buscá la opción en el menú desplegable.",
      visual: (
        <div className="bg-white/5 rounded-xl px-3 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Download size={16} className="text-white/70" />
          </div>
          <span className="text-white/70 text-xs font-medium">Instalar aplicación</span>
        </div>
      ),
    },
    {
      num: 3,
      title: 'Tocá "Instalar"',
      desc: "¡Listo! La app se descarga a tu pantalla de inicio.",
      visual: (
        <div className="flex items-center justify-center py-2">
          <AppIconPreview />
        </div>
      ),
    },
  ];

  return <GuideSteps steps={steps} />;
}

function GuideSteps({ steps }: { steps: Array<{ num: number; title: string; desc: string; visual: React.ReactNode }> }) {
  return (
    <div className="space-y-3">
      {steps.map((s) => (
        <div key={s.num} className="bg-white/5 border border-white/5 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-violet-500/30 border border-violet-400/30 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-violet-300">{s.num}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">{s.title}</p>
              <p className="text-violet-300/60 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
              <div className="mt-2.5">{s.visual}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Standalone modal for global first-open trigger ──────────────────────────

interface InstallAppGuideProps {
  onDismiss: () => void;
}

export function InstallAppGuide({ onDismiss }: InstallAppGuideProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>(null);

  return (
    <div className="fixed inset-0 z-[100] min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 flex items-center justify-center p-4 overflow-auto">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10 py-8">
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center mx-auto mb-5 shadow-xl shadow-violet-500/30 overflow-hidden">
            <img src="/logo.png" alt="EntrenApp" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Instalá la app</h1>
          <p className="text-sm text-violet-300/70 mt-2 font-medium italic">
            Tenela siempre a mano en tu pantalla de inicio.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl shadow-black/20">
          {!selectedDevice ? (
            <>
              <div className="bg-violet-500/10 border border-violet-400/15 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-violet-300/80 leading-relaxed">
                  Agregala a tu pantalla de inicio para acceder{" "}
                  <span className="font-semibold text-violet-200">más rápido, como cualquier otra app</span>.
                </p>
              </div>

              <p className="text-white font-bold text-sm text-center">¿Qué celular tenés?</p>

              <DevicePicker onSelect={setSelectedDevice} />
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-violet-400/60 hover:text-violet-300/80 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <ChevronRight size={14} className="rotate-180" />
                Cambiar dispositivo
              </button>

              {selectedDevice === "iphone" ? <IPhoneGuide /> : <AndroidGuide />}
            </>
          )}

          <button
            onClick={onDismiss}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]"
          >
            <span className="flex items-center justify-center gap-2">
              {selectedDevice ? (
                <>
                  <Check size={16} />
                  ¡Entendido, vamos!
                </>
              ) : (
                <>
                  Ahora no
                  <ArrowRight size={16} />
                </>
              )}
            </span>
          </button>
        </div>

        <p className="text-center text-[11px] text-violet-400/30 mt-6 font-medium">
          Esto lo podés hacer en cualquier momento
        </p>
      </div>
    </div>
  );
}
