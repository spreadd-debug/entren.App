import { useState } from "react";
import { Button, Card, Input } from "../components/UI";
import { StudentPortalService } from "../services/StudentPortalService";
import { Smartphone, KeyRound } from "lucide-react";

interface StudentPortalAccessViewProps {
  onSuccess: (studentId: string) => void;
}

export default function StudentPortalAccessView({
  onSuccess,
}: StudentPortalAccessViewProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !code.trim()) return;

    try {
      setIsLoading(true);
      const student = await StudentPortalService.login(phone.trim(), code.trim());
      onSuccess(student.id);
    } catch (error) {
      console.error(error);
      alert("Teléfono o código incorrecto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4">
            <Smartphone size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Portal del Alumno</h1>
          <p className="text-sm text-slate-500 mt-1">
            Entrá con tu teléfono y código de acceso.
          </p>
        </div>

        <Input
          placeholder="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="relative">
          <Input
            placeholder="Código"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <KeyRound
            size={16}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        <Button variant="secondary" fullWidth onClick={handleLogin} disabled={isLoading}>
          {isLoading ? "Ingresando..." : "Entrar"}
        </Button>
      </Card>
    </div>
  );
}