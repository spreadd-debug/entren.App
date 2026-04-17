import React, { useState, useEffect } from "react";
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
  ChevronRight,
} from "lucide-react";
import {
  DevicePicker,
  IPhoneGuide,
  AndroidGuide,
  markInstallGuideSeen as markGlobalInstallGuideSeen,
  type DeviceType,
} from "../components/InstallAppGuide";

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
    if (localStorage.getItem("install_guide_seen") === "1") return false;
    const key = `portal_install_seen_${loggedStudent?.id}`;
    return !localStorage.getItem(key);
  };

  const markInstallGuideSeen = () => {
    markGlobalInstallGuideSeen();
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
        const globalSeen = localStorage.getItem("install_guide_seen") === "1";
        const studentSeen = !!localStorage.getItem(`portal_install_seen_${student.id}`);
        if (!globalSeen && !studentSeen) {
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
