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
  dimOpacity?: number; // 0–1, default 0.84 — lower = more of the bg visible
}

const TOUR_STEPS: TourStep[] = [
  // ── 0. Welcome ──────────────────────────────────────────────────────────────
  {
    view: null,
    targetSelector: null,
    title: '¿Cuántos alumnos te deben plata hoy?',
    description: 'Si no tenés la respuesta en 5 segundos, este tour es para vos. Te mostramos cómo entrenApp te ordena el gimnasio — de verdad, no solo en papel.',
    sound: 'chime',
    emoji: '🏋️',
  },

  // ── 1. Deudores ──────────────────────────────────────────────────────────────
  {
    view: 'defaulters',
    targetSelector: '[data-tour="content-area"]',
    title: '¿Se te pasan alumnos sin pagar?',
    description: 'Acá ves quién debe y hace cuántos días. Seleccionás al alumno y con un click le mandás el recordatorio por WhatsApp — el mensaje ya está armado, vos solo apretás enviar.',
    sound: 'pop',
  },

  // ── 2. Pagos ─────────────────────────────────────────────────────────────────
  {
    view: 'payments',
    targetSelector: '[data-tour="content-area"]',
    title: 'Registrás un cobro en 10 segundos',
    description: 'Te pagan en efectivo, transferencia o MercadoPago — da igual. Registrás el cobro acá y el alumno queda al día automáticamente. Sin anotar nada a mano, sin olvidarte.',
    sound: 'whoosh',
  },

  // ── 3. Alumnos ───────────────────────────────────────────────────────────────
  {
    view: 'students',
    targetSelector: '[data-tour="content-area"]',
    title: 'Sabés el estado de cada alumno al instante',
    description: 'Al día, por vencer esta semana, ya vencido. Encontrás a cualquier alumno en segundos. Sin planillas, sin tener que acordarte de todo.',
    sound: 'pop',
  },

  // ── 4. QR Check-in ───────────────────────────────────────────────────────────
  {
    view: 'settings',
    targetSelector: '[data-tour="qr-section"]',
    title: '¿Sabés quién viene realmente?',
    description: 'Imprimís este QR y lo pegás en el gimnasio. Cada alumno lo escanea al entrar y registra su asistencia en segundos. Fin de las listas en papel.',
    sound: 'pop',
  },

  // ── 5. Dashboard ─────────────────────────────────────────────────────────────
  {
    view: 'dashboard',
    targetSelector: '[data-tour="dashboard-kpis"]',
    title: '¿Cómo está tu gimnasio hoy?',
    description: 'Cuántos alumnos activos tenés, cuántos deben, cuánto cobraste este mes. Todo en una pantalla cuando arranca el día. Sin abrir planillas ni calcular nada.',
    sound: 'chime',
  },

  // ── 5. Rutinas ───────────────────────────────────────────────────────────────
  {
    view: 'workouts',
    targetSelector: '[data-tour="content-area"]',
    title: 'Armás la rutina una sola vez',
    description: 'Creás el plan de entrenamiento con ejercicios, series, repeticiones e imágenes. Lo asignás al alumno — y listo. No lo tenés que explicar nunca más.',
    sound: 'whoosh',
  },

  // ── 6. Vista del alumno ───────────────────────────────────────────────────────
  {
    view: 'student-portal',
    targetSelector: null,
    title: 'Esto es lo que ve el alumno',
    description: 'Desde su teléfono ve su rutina completa, el estado de su cuota y cuándo vence. Menos preguntas, menos mensajes, más tiempo para vos.',
    sound: 'pop',
    dimOpacity: 0.45,
  },

  // ── 7. Ejemplo de ejercicio ───────────────────────────────────────────────────
  {
    view: 'student-portal',
    targetSelector: '[data-tour="exercise-photo-btn"]',
    title: '¿No conocen el ejercicio?',
    description: 'Tocan "Ejemplo" y ven la foto al instante. Sin googlear, sin preguntar. El alumno sabe exactamente cómo hacerlo.',
    sound: 'pop',
  },

  // ── 8. Final ─────────────────────────────────────────────────────────────────
  {
    view: null,
    targetSelector: null,
    title: 'Esto te ahorra tiempo y plata desde el día uno',
    description: 'Menos alumnos sin cobrar. Menos tiempo explicando rutinas. Menos caos. Empezá gratis, sin tarjeta de crédito. Si no te sirve, cancelás cuando querés.',
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
    // Scroll the element into the visible area, then re-measure its final position
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    // Small delay to let the layout settle after scroll
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setSpotRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
      setCardVisible(true);
    }, 80);
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
  // NOTE: Never use transform for horizontal centering here — the animation
  // keyframes also set `transform`, which would override translateX(-50%) and
  // break the position. Instead compute `left` in pixels for all cases.

  const getCardStyle = (): React.CSSProperties => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 768;
    const cardW = Math.min(340, vw - 32);
    const centerLeft = Math.round((vw - cardW) / 2); // px — no transform needed

    // Mobile: anchor to bottom by default, but if the spotlight is in the
    // lower half of the screen put the card at the top so it doesn't cover it.
    if (isMobile) {
      const inPortal = currentStep.view === 'student-portal';
      if (spotRect) {
        const spotCenterY = spotRect.top + spotRect.height / 2;
        const isLow = spotCenterY > vh * 0.45;
        if (isLow) {
          // Card at top — clear skip button (top:12 + ~34px) + a bit of breathing room
          return { position: 'fixed', top: 52, left: centerLeft, width: cardW };
        }
      }
      return {
        position: 'fixed',
        bottom: inPortal ? 24 : 88,
        left: centerLeft,
        width: cardW,
      };
    }

    // Desktop ───────────────────────────────────────────────────────────────────
    if (!spotRect) {
      // Vertically center with translateY only (X is handled by left in px).
      return { position: 'fixed', top: '50%', transform: 'translateY(-50%)', left: centerLeft, width: cardW };
    }

    const { top, left, width, height } = spotRect;
    const bottom = top + height;
    const centerX = left + width / 2;
    const clampedLeft = Math.max(16, Math.min(centerX - cardW / 2, vw - cardW - 16));

    // prefer below
    if (bottom + 240 < vh) {
      return { position: 'fixed', top: bottom + 18, left: clampedLeft, width: cardW };
    }
    // prefer above
    if (top - 240 > 0) {
      return { position: 'fixed', bottom: vh - top + 18, left: clampedLeft, width: cardW };
    }
    // fallback: center
    return { position: 'fixed', top: '50%', transform: 'translateY(-50%)', left: centerLeft, width: cardW };
  };

  const isFinal = currentStep.isFinal;
  const isWelcome = step === 0;
  const isFullOverlay = !spotRect;
  const mob = window.innerWidth < 768;

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
            background: `rgba(2,6,23,${currentStep.dimOpacity ?? 0.88})`,
            backdropFilter: currentStep.dimOpacity !== undefined && currentStep.dimOpacity < 0.7 ? 'none' : 'blur(4px)',
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
          style={{ position: 'fixed', top: 12, right: 12, zIndex: 10002, fontSize: 11 }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full font-semibold text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 transition-all backdrop-blur-sm"
        >
          <X size={11} />
          Saltar
        </button>
      )}

      {/* Tour card — outer div handles POSITION only (no transform for X centering).
           Inner div handles the slide-in ANIMATION. Separating them prevents the
           animation's `transform` keyframes from overriding the position transform. */}
      {cardVisible && (
        <div style={{ ...getCardStyle(), zIndex: 10001 }}>
          <div
            style={{
              animation: 'demotour-slidein 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards',
              ...(mob ? { maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' } : {}),
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

            <div style={{ padding: mob ? '10px 14px 14px' : '16px 20px 20px' }}>
              {/* Header row */}
              <div className="flex items-center justify-between" style={{ marginBottom: mob ? 8 : 12 }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-cyan-500 rounded flex items-center justify-center shrink-0">
                    <Zap size={9} className="text-slate-950" strokeWidth={3} />
                  </div>
                  <span className="font-black text-cyan-400 uppercase" style={{ fontSize: 9, letterSpacing: '0.18em' }}>
                    entrenApp Demo
                  </span>
                </div>
                <span className="font-bold text-slate-600" style={{ fontSize: 10 }}>
                  {step + 1} / {TOUR_STEPS.length}
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="bg-slate-800 rounded-full overflow-hidden"
                style={{ height: 3, marginBottom: mob ? 10 : 16 }}
              >
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
                  className="text-center"
                  style={{
                    fontSize: mob ? 28 : 42,
                    lineHeight: 1,
                    marginBottom: mob ? 6 : 12,
                    animation: 'demotour-bounce 2.5s ease-in-out infinite',
                  }}
                >
                  {currentStep.emoji}
                </div>
              )}

              {/* Title */}
              <h3
                className="font-black tracking-tight text-white leading-tight"
                style={{
                  fontSize: mob
                    ? (isFinal || isWelcome ? 15 : 14)
                    : (isFinal || isWelcome ? 22 : 17),
                  textAlign: isFinal || isWelcome ? 'center' : 'left',
                }}
              >
                {currentStep.title}
              </h3>

              {/* Description */}
              <p
                className="text-slate-400"
                style={{
                  fontSize: mob ? 12 : 14,
                  lineHeight: mob ? 1.45 : 1.6,
                  marginTop: mob ? 5 : 8,
                  textAlign: isFinal || isWelcome ? 'center' : 'left',
                }}
              >
                {currentStep.description}
              </p>

              {/* Footer */}
              <div style={{ marginTop: mob ? 12 : 20 }}>
                {isFinal ? (
                  <div className="space-y-2">
                    <button
                      onClick={onRegister}
                      className="w-full flex items-center justify-center gap-2 font-black rounded-xl transition-all active:scale-[0.97]"
                      style={{
                        fontSize: mob ? 13 : 14,
                        padding: mob ? '9px 16px' : '12px 16px',
                        background: 'linear-gradient(135deg, rgb(6,182,212) 0%, rgb(34,211,238) 100%)',
                        color: '#020617',
                        boxShadow: '0 8px 24px rgba(34,211,238,0.35), 0 0 0 1px rgba(34,211,238,0.2)',
                      }}
                    >
                      Registrá tu gimnasio gratis
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={onExit}
                      className="w-full text-center text-slate-600 hover:text-slate-400 transition-colors"
                      style={{ fontSize: 11, padding: '6px 0' }}
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
                            width: i === step ? (mob ? 10 : 14) : (mob ? 4 : 5),
                            height: mob ? 4 : 5,
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
                      className="flex items-center gap-1.5 font-black rounded-xl transition-all active:scale-[0.97]"
                      style={{
                        fontSize: mob ? 12 : 14,
                        padding: mob ? '8px 14px' : '10px 20px',
                        background: 'linear-gradient(135deg, rgb(6,182,212) 0%, rgb(34,211,238) 100%)',
                        color: '#020617',
                        boxShadow: '0 4px 16px rgba(34,211,238,0.3)',
                      }}
                    >
                      {step === TOUR_STEPS.length - 2 ? 'Finalizar' : 'Siguiente'}
                      <ArrowRight size={mob ? 12 : 14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>{/* end animation wrapper */}
        </div>
      )}
    </>
  );
};
