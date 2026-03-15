import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, X, Zap } from 'lucide-react';

// ── Sound Engine ───────────────────────────────────────────────────────────────

function playSound(type: 'chime' | 'pop' | 'whoosh' | 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    switch (type) {
      case 'chime': {
        [660, 880, 1100].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          const t = ctx.currentTime + i * 0.14;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
          osc.start(t);
          osc.stop(t + 0.38);
        });
        break;
      }
      case 'pop': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.16);
        break;
      }
      case 'whoosh': {
        const bufferSize = Math.floor(ctx.sampleRate * 0.22);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.22);
        filter.Q.value = 3;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(ctx.currentTime);
        source.stop(ctx.currentTime + 0.24);
        break;
      }
      case 'success': {
        // Ascending fanfare: C5 E5 G5 C6
        [523, 659, 784, 1047].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          const t = ctx.currentTime + i * 0.08;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
          osc.start(t);
          osc.stop(t + 0.9);
        });
        break;
      }
    }
  } catch {
    // audio not available — silent fail
  }
}

// ── Tour Steps ─────────────────────────────────────────────────────────────────

interface TourStep {
  view: string | null;
  targetSelector: string | null;
  title: string;
  description: string;
  sound: 'chime' | 'pop' | 'whoosh' | 'success';
  emoji?: string;
  isFinal?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    view: null,
    targetSelector: null,
    title: '¡Bienvenido a entrenApp!',
    description: 'En los próximos minutos te mostramos todo lo que podés hacer para gestionar tu gimnasio como un profesional. Seguí los pasos del tour.',
    sound: 'chime',
    emoji: '🏋️',
  },
  {
    view: 'dashboard',
    targetSelector: '[data-tour="content-area"]',
    title: 'Panel General',
    description: 'De un vistazo: alumnos activos, morosos, ingresos del día y del mes. Todo lo importante, siempre a mano cuando entrás.',
    sound: 'pop',
  },
  {
    view: 'students',
    targetSelector: '[data-tour="content-area"]',
    title: 'Gestión de Alumnos',
    description: 'Todos tus alumnos con estado de pago, plan y próximo vencimiento. Encontrá cualquier alumno en segundos con la búsqueda.',
    sound: 'whoosh',
  },
  {
    view: 'payments',
    targetSelector: '[data-tour="content-area"]',
    title: 'Registro de Pagos',
    description: 'Registrá cobros en segundos — efectivo, transferencia o MercadoPago. El estado del alumno se actualiza automáticamente.',
    sound: 'pop',
  },
  {
    view: 'defaulters',
    targetSelector: '[data-tour="content-area"]',
    title: 'Morosos y Deudas',
    description: 'Sabé exactamente quién te debe y cuánto. Podés registrar el pago directamente desde acá sin perder tiempo buscando al alumno.',
    sound: 'whoosh',
  },
  {
    view: 'workouts',
    targetSelector: '[data-tour="content-area"]',
    title: 'Rutinas y Ejercicios',
    description: 'Creá planes de entrenamiento personalizados con ejercicios, videos y descripciones. Asignáselos a tus alumnos con un clic.',
    sound: 'pop',
  },
  {
    view: 'settings',
    targetSelector: '[data-tour="content-area"]',
    title: 'Configuración Total',
    description: 'Planes, precios, turnos, automatización de recordatorios por WhatsApp y mucho más. Todo configurable para tu gimnasio.',
    sound: 'whoosh',
  },
  {
    view: null,
    targetSelector: null,
    title: '¡Todo esto es tuyo!',
    description: 'Empezá gratis con 30 días de prueba completa. Sin tarjeta de crédito. Cancelás cuando quieras.',
    sound: 'success',
    emoji: '🚀',
    isFinal: true,
  },
];

// ── Spotlight Rect ─────────────────────────────────────────────────────────────

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface DemoTourProps {
  onNavigate: (view: string) => void;
  onExit: () => void;
  onRegister: () => void;
}

export const DemoTour: React.FC<DemoTourProps> = ({ onNavigate, onExit, onRegister }) => {
  const [step, setStep] = useState(0);
  const [spotRect, setSpotRect] = useState<SpotRect | null>(null);
  const [visible, setVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = TOUR_STEPS[step];
  const PAD = 10;

  // fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const measureTarget = useCallback(() => {
    const sel = TOUR_STEPS[step].targetSelector;
    if (!sel) {
      setSpotRect(null);
      setCardVisible(true);
      return;
    }
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) {
      setSpotRect(null);
      setCardVisible(true);
      return;
    }
    const r = el.getBoundingClientRect();
    setSpotRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    setCardVisible(true);
  }, [step]);

  // when step changes: navigate → play sound → measure
  useEffect(() => {
    setCardVisible(false);
    setSpotRect(null);
    const s = TOUR_STEPS[step];
    if (s.view) onNavigate(s.view);
    playSound(s.sound);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(measureTarget, s.view ? 420 : 80);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step, measureTarget]);

  // resize: re-measure
  useEffect(() => {
    const handleResize = () => measureTarget();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureTarget]);

  const goNext = () => {
    if (currentStep.isFinal) { onRegister(); return; }
    setStep(s => s + 1);
  };

  // ── Spotlight rendering ──────────────────────────────────────────────────────

  const renderSpotlight = () => {
    if (!spotRect) return null;
    const { top, left, width, height } = spotRect;
    const right = left + width;
    const bottom = top + height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bg = 'rgba(2,6,23,0.84)';

    return (
      <>
        {/* 4 dark panels around the spotlight */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: Math.max(0, top), background: bg, pointerEvents: 'auto' }} />
        <div style={{ position: 'fixed', top: bottom, left: 0, right: 0, bottom: 0, background: bg, pointerEvents: 'auto' }} />
        <div style={{ position: 'fixed', top, left: 0, width: Math.max(0, left), height, background: bg, pointerEvents: 'auto' }} />
        <div style={{ position: 'fixed', top, left: right, right: 0, height, background: bg, pointerEvents: 'auto' }} />

        {/* Glow ring */}
        <div style={{
          position: 'fixed',
          top, left, width, height,
          borderRadius: 14,
          border: '2px solid rgb(34,211,238)',
          boxShadow: '0 0 0 5px rgba(34,211,238,0.12), 0 0 50px rgba(34,211,238,0.45), inset 0 0 25px rgba(34,211,238,0.06)',
          animation: 'demotour-pulse 2s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 9999,
        }} />
      </>
    );
  };

  // ── Tooltip position ─────────────────────────────────────────────────────────

  const getCardStyle = (): React.CSSProperties => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 768;
    const cardW = Math.min(340, vw - 32);

    if (!spotRect) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: cardW };
    }

    const { top, left, width, height } = spotRect;
    const bottom = top + height;
    const centerX = left + width / 2;

    if (isMobile) {
      return { position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', width: cardW };
    }

    // prefer below
    if (bottom + 240 < vh) {
      return {
        position: 'fixed',
        top: bottom + 18,
        left: Math.max(16, Math.min(centerX - cardW / 2, vw - cardW - 16)),
        width: cardW,
      };
    }
    // prefer above
    if (top - 240 > 0) {
      return {
        position: 'fixed',
        bottom: vh - top + 18,
        left: Math.max(16, Math.min(centerX - cardW / 2, vw - cardW - 16)),
        width: cardW,
      };
    }
    // fallback: right side
    return {
      position: 'fixed',
      top: '50%',
      right: 24,
      transform: 'translateY(-50%)',
      width: cardW,
    };
  };

  const isFinal = currentStep.isFinal;
  const isWelcome = step === 0;
  const isFullOverlay = !spotRect;

  if (!visible) return null;

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes demotour-pulse {
          0%, 100% { box-shadow: 0 0 0 5px rgba(34,211,238,0.12), 0 0 50px rgba(34,211,238,0.45); }
          50% { box-shadow: 0 0 0 10px rgba(34,211,238,0.07), 0 0 80px rgba(34,211,238,0.65); }
        }
        @keyframes demotour-slidein {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes demotour-fadeoverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes demotour-bounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(1.2) rotate(-8deg); }
          70% { transform: scale(1.2) rotate(8deg); }
        }
        @keyframes demotour-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Full dark overlay (steps with no spotlight) */}
      {isFullOverlay && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(2,6,23,0.88)',
            backdropFilter: 'blur(4px)',
            animation: 'demotour-fadeoverlay 0.3s ease',
            pointerEvents: 'auto',
          }}
        />
      )}

      {/* Spotlight panels */}
      {spotRect && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>
          {renderSpotlight()}
        </div>
      )}

      {/* Skip button */}
      {!isFinal && (
        <button
          onClick={onExit}
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 10002 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 transition-all backdrop-blur-sm"
        >
          <X size={12} />
          Saltar tour
        </button>
      )}

      {/* Tour card */}
      {cardVisible && (
        <div
          style={{
            ...getCardStyle(),
            zIndex: 10001,
            animation: 'demotour-slidein 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #0f172a 0%, #0c1322 100%)',
              border: '1px solid rgba(34,211,238,0.18)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(34,211,238,0.08)',
            }}
          >
            {/* Top accent line */}
            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgb(34,211,238), transparent)' }} />

            <div className="px-5 pt-4 pb-5">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-cyan-500 rounded-md flex items-center justify-center shrink-0">
                    <Zap size={10} className="text-slate-950" strokeWidth={3} />
                  </div>
                  <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.18em]">
                    entrenApp Demo
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-600">
                  {step + 1} / {TOUR_STEPS.length}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-[3px] bg-slate-800 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((step + 1) / TOUR_STEPS.length) * 100}%`,
                    background: 'linear-gradient(90deg, rgb(6,182,212), rgb(34,211,238))',
                    boxShadow: '0 0 8px rgba(34,211,238,0.6)',
                  }}
                />
              </div>

              {/* Emoji */}
              {currentStep.emoji && (
                <div
                  className="text-center mb-3"
                  style={{ fontSize: 42, lineHeight: 1, animation: 'demotour-bounce 2.5s ease-in-out infinite' }}
                >
                  {currentStep.emoji}
                </div>
              )}

              {/* Title */}
              <h3
                className="font-black tracking-tight text-white leading-tight"
                style={{ fontSize: isFinal || isWelcome ? 22 : 17, textAlign: isFinal || isWelcome ? 'center' : 'left' }}
              >
                {currentStep.title}
              </h3>

              {/* Description */}
              <p
                className="text-slate-400 text-sm leading-relaxed mt-2"
                style={{ textAlign: isFinal || isWelcome ? 'center' : 'left' }}
              >
                {currentStep.description}
              </p>

              {/* Footer */}
              <div className="mt-5">
                {isFinal ? (
                  <div className="space-y-2">
                    <button
                      onClick={onRegister}
                      className="w-full flex items-center justify-center gap-2 font-black py-3 rounded-xl transition-all active:scale-[0.97] text-sm"
                      style={{
                        background: 'linear-gradient(135deg, rgb(6,182,212) 0%, rgb(34,211,238) 100%)',
                        color: '#020617',
                        boxShadow: '0 8px 24px rgba(34,211,238,0.35), 0 0 0 1px rgba(34,211,238,0.2)',
                      }}
                    >
                      Registrá tu gimnasio gratis
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={onExit}
                      className="w-full text-center text-xs text-slate-600 hover:text-slate-400 py-1.5 transition-colors"
                    >
                      Seguir explorando el demo
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    {/* Step dots */}
                    <div className="flex gap-1 items-center">
                      {TOUR_STEPS.map((_, i) => (
                        <div
                          key={i}
                          className="rounded-full transition-all duration-300"
                          style={{
                            width: i === step ? 14 : 5,
                            height: 5,
                            background: i === step
                              ? 'rgb(34,211,238)'
                              : i < step
                              ? 'rgba(34,211,238,0.35)'
                              : 'rgba(100,116,139,0.3)',
                          }}
                        />
                      ))}
                    </div>

                    {/* Next button */}
                    <button
                      onClick={goNext}
                      className="flex items-center gap-2 font-black px-5 py-2.5 rounded-xl transition-all active:scale-[0.97] text-sm"
                      style={{
                        background: 'linear-gradient(135deg, rgb(6,182,212) 0%, rgb(34,211,238) 100%)',
                        color: '#020617',
                        boxShadow: '0 4px 16px rgba(34,211,238,0.3)',
                      }}
                    >
                      {step === TOUR_STEPS.length - 2 ? 'Finalizar' : 'Siguiente'}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
