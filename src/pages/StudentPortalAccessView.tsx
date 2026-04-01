import { useState, useEffect } from "react";
import { api } from "../services/api";
import { StudentPortalService } from "../services/StudentPortalService";
import {
  Smartphone,
  KeyRound,
  Dumbbell,
  ShieldCheck,
  ArrowRight,
  Check,
  Download,
  Share,
  MoreVertical,
  Plus,
  ChevronRight,
} from "lucide-react";

interface StudentPortalAccessViewProps {
  onSuccess: (studentId: string) => void;
}

const FRASES = [
  "Tu único límite sos vos.",
  "Cada repetición cuenta.",
  "El dolor de hoy es la fuerza de mañana.",
  "No pares hasta estar orgulloso.",
  "La disciplina supera a la motivación.",
  "Hoy es un gran día para entrenar.",
  "El progreso, no la perfección.",
  "Vos elegís ser más fuerte.",
];

type Step = "login" | "set-code" | "install-guide";
type DeviceType = "iphone" | "android" | null;

// ─── Install Guide Sub-components ──────────────────────────────────────────────

function DevicePicker({ onSelect }: { onSelect: (d: DeviceType) => void }) {
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

function IPhoneGuide() {
  const steps = [
    {
      num: 1,
      icon: <Share size={18} />,
      title: "Tocá el botón Compartir",
      desc: "Es el ícono con una flechita hacia arriba, abajo de todo en Safari.",
      visual: (
        <div className="flex items-center justify-center py-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Share size={20} className="text-blue-400" />
          </div>
        </div>
      ),
    },
    {
      num: 2,
      icon: <Plus size={18} />,
      title: 'Buscá "Agregar a Inicio"',
      desc: "Deslizá hacia abajo en el menú hasta encontrar la opción.",
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
      num: 3,
      icon: <Check size={18} />,
      title: 'Tocá "Agregar"',
      desc: "¡Listo! La app aparece en tu pantalla de inicio.",
      visual: (
        <div className="flex items-center justify-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Dumbbell size={22} className="text-white" />
          </div>
        </div>
      ),
    },
  ];

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

function AndroidGuide() {
  const steps = [
    {
      num: 1,
      icon: <MoreVertical size={18} />,
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
      icon: <Download size={18} />,
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
      icon: <Check size={18} />,
      title: 'Tocá "Instalar"',
      desc: "¡Listo! La app se descarga a tu pantalla de inicio.",
      visual: (
        <div className="flex items-center justify-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Dumbbell size={22} className="text-white" />
          </div>
        </div>
      ),
    },
  ];

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

// ─── Main Component ────────────────────────────────────────────────────────────

export default function StudentPortalAccessView({
  onSuccess,
}: StudentPortalAccessViewProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [frase, setFrase] = useState("");

  // Set-code step state
  const [step, setStep] = useState<Step>("login");
  const [loggedStudent, setLoggedStudent] = useState<any>(null);
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [codeSaved, setCodeSaved] = useState(false);

  // Install guide state
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>(null);

  useEffect(() => {
    setFrase(FRASES[Math.floor(Math.random() * FRASES.length)]);
  }, []);

  const shouldShowInstallGuide = () => {
    const key = `portal_install_seen_${loggedStudent?.id}`;
    return !localStorage.getItem(key);
  };

  const markInstallGuideSeen = () => {
    if (loggedStudent?.id) {
      localStorage.setItem(`portal_install_seen_${loggedStudent.id}`, "1");
    }
  };

  const goToInstallGuideOrFinish = () => {
    if (shouldShowInstallGuide()) {
      setStep("install-guide");
    } else {
      onSuccess(loggedStudent.id);
    }
  };

  const handleLogin = async () => {
    if (!phone.trim() || !code.trim()) return;
    setError("");
    try {
      setIsLoading(true);
      const student = await StudentPortalService.login(phone.trim(), code.trim());
      setLoggedStudent(student);

      if (student.has_custom_code) {
        // Already set custom code — check install guide
        const key = `portal_install_seen_${student.id}`;
        if (!localStorage.getItem(key)) {
          setStep("install-guide");
        } else {
          onSuccess(student.id);
        }
      } else {
        setStep("set-code");
      }
    } catch (err) {
      console.error(err);
      setError("Teléfono o código incorrecto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCode = async () => {
    setCodeError("");

    if (newCode.length < 4) {
      setCodeError("El código debe tener al menos 4 caracteres");
      return;
    }
    if (newCode !== confirmCode) {
      setCodeError("Los códigos no coinciden");
      return;
    }

    try {
      setIsSavingCode(true);
      await api.students.setCustomCode(loggedStudent.id, code.trim(), newCode);
      setCodeSaved(true);
      setTimeout(() => goToInstallGuideOrFinish(), 1200);
    } catch (err: any) {
      setCodeError(err?.message || "No se pudo guardar el código");
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleSkipCode = () => {
    goToInstallGuideOrFinish();
  };

  const handleFinishInstallGuide = () => {
    markInstallGuideSeen();
    onSuccess(loggedStudent.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (step === "login") handleLogin();
      else if (step === "set-code") handleSetCode();
    }
  };

  const Spinner = () => (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  // ─── Header content per step ─────────────────────────────────────────────────

  const headerIcon = {
    login: <Dumbbell size={28} />,
    "set-code": <ShieldCheck size={28} />,
    "install-guide": <Download size={28} />,
  }[step];

  const headerTitle = {
    login: "Portal del Alumno",
    "set-code": "Elegí tu código",
    "install-guide": "Instalá la app",
  }[step];

  const headerSubtitle = {
    login: `"${frase}"`,
    "set-code": "Creá un código que puedas recordar fácilmente.",
    "install-guide": "Tené tu entrenamiento siempre a mano.",
  }[step];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-violet-500/30">
            {headerIcon}
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {headerTitle}
          </h1>
          <p className="text-sm text-violet-300/70 mt-2 font-medium italic">
            {headerSubtitle}
          </p>
        </div>

        {/* ── Step 1: Login ───────────────────────────────────────────────────── */}
        {step === "login" && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl shadow-black/20">
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-300/60">
                  <Smartphone size={16} />
                </div>
                <input
                  type="tel"
                  placeholder="Tu teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-violet-300/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400/30 transition-all"
                />
              </div>

              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-300/60">
                  <KeyRound size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Código de acceso"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  maxLength={8}
                  className="w-full bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-violet-300/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400/30 transition-all font-mono tracking-widest"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/15 border border-rose-400/20 rounded-xl px-4 py-2.5 text-center">
                <p className="text-sm text-rose-300 font-semibold">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoading || !phone.trim() || !code.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-violet-800/50 disabled:to-purple-800/50 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Ingresando...
                </span>
              ) : (
                "Entrar"
              )}
            </button>
          </div>
        )}

        {/* ── Step 2: Set Custom Code ─────────────────────────────────────────── */}
        {step === "set-code" && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl shadow-black/20">
            {codeSaved ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                  <Check size={28} className="text-emerald-400" />
                </div>
                <p className="text-white font-bold text-lg">¡Listo!</p>
                <p className="text-violet-300/70 text-sm text-center">
                  Tu nuevo código fue guardado. Usalo la próxima vez que entres.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-violet-500/10 border border-violet-400/15 rounded-xl px-4 py-3">
                  <p className="text-xs text-violet-300/80 leading-relaxed">
                    Tu código actual es el que te dio tu entrenador. Podés cambiarlo por uno que te
                    sea más fácil de recordar —{" "}
                    <span className="font-semibold text-violet-200">
                      letras, números, o una combinación
                    </span>
                    .
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-300/60">
                      <KeyRound size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Tu nuevo código"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      onKeyDown={handleKeyDown}
                      maxLength={8}
                      className="w-full bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-violet-300/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400/30 transition-all font-mono tracking-widest"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-300/60">
                      <ShieldCheck size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Repetí el código"
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                      onKeyDown={handleKeyDown}
                      maxLength={8}
                      className="w-full bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-violet-300/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400/30 transition-all font-mono tracking-widest"
                    />
                  </div>
                </div>

                {codeError && (
                  <div className="bg-rose-500/15 border border-rose-400/20 rounded-xl px-4 py-2.5 text-center">
                    <p className="text-sm text-rose-300 font-semibold">{codeError}</p>
                  </div>
                )}

                <button
                  onClick={handleSetCode}
                  disabled={isSavingCode || !newCode.trim() || !confirmCode.trim()}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-violet-800/50 disabled:to-purple-800/50 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]"
                >
                  {isSavingCode ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner />
                      Guardando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Guardar mi código
                      <ArrowRight size={16} />
                    </span>
                  )}
                </button>

                <button
                  onClick={handleSkipCode}
                  className="w-full text-violet-400/50 hover:text-violet-300/70 text-xs font-medium py-2 transition-colors"
                >
                  Ahora no, seguir con el código actual
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Install App Guide ───────────────────────────────────────── */}
        {step === "install-guide" && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl shadow-black/20">
            {!selectedDevice ? (
              <>
                <div className="bg-violet-500/10 border border-violet-400/15 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-violet-300/80 leading-relaxed">
                    Podés agregar la app a tu pantalla de inicio para acceder{" "}
                    <span className="font-semibold text-violet-200">
                      más rápido, como cualquier otra app
                    </span>
                    .
                  </p>
                </div>

                <p className="text-white font-bold text-sm text-center">
                  ¿Qué celular tenés?
                </p>

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
              onClick={handleFinishInstallGuide}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                {selectedDevice ? "¡Entendido, vamos!" : "Omitir por ahora"}
                <ArrowRight size={16} />
              </span>
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-violet-400/30 mt-6 font-medium">
          {{
            login: "Pedile el código a tu entrenador",
            "set-code": "Podés cambiarlo después desde tu perfil",
            "install-guide": "Esto lo podés hacer en cualquier momento",
          }[step]}
        </p>
      </div>
    </div>
  );
}
