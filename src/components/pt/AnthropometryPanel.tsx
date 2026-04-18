import React, { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, Button, Input } from '../UI';
import { AnthropometryService } from '../../services/pt/AnthropometryService';
import { StudentSummaryService } from '../../services/pt/StudentSummaryService';
import { ClientAnthropometry } from '../../../shared/types';
import { useToast } from '../../context/ToastContext';

interface AnthropometryPanelProps {
  studentId: string;
  gymId: string;
}

const EMPTY_FORM = {
  measured_at: new Date().toISOString().split('T')[0],
  height_cm: '',
  weight_kg: '',
  body_fat_pct: '',
  muscle_mass_kg: '',
  notes: '',
};

/** Validate anthropometry and return warnings/errors */
function validateAnthropometry(form: typeof EMPTY_FORM): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const height = form.height_cm ? Number(form.height_cm) : null;
  const weight = form.weight_kg ? Number(form.weight_kg) : null;
  const fat = form.body_fat_pct ? Number(form.body_fat_pct) : null;
  const muscle = form.muscle_mass_kg ? Number(form.muscle_mass_kg) : null;

  if (height != null) {
    if (height < 50 || height > 250) errors.push('Altura fuera de rango (50–250 cm)');
  }
  if (weight != null) {
    if (weight < 20 || weight > 350) errors.push('Peso fuera de rango (20–350 kg)');
  }
  if (fat != null) {
    if (fat < 2 || fat > 70) errors.push('% Grasa fuera de rango (2–70%)');
    else if (fat > 50) warnings.push('% Grasa muy alto (>50%), verificá el dato');
    else if (fat < 5) warnings.push('% Grasa muy bajo (<5%), verificá el dato');
  }
  if (muscle != null && weight != null) {
    if (muscle > weight) errors.push('Masa muscular no puede superar el peso total');
    else if (muscle > weight * 0.65) warnings.push('Masa muscular muy alta respecto al peso, verificá el dato');
  }
  if (fat != null && muscle != null && weight != null) {
    const fatKg = weight * fat / 100;
    if (fatKg + muscle > weight * 1.05) {
      errors.push(`Grasa (${fatKg.toFixed(1)} kg) + Músculo (${muscle} kg) superan el peso total (${weight} kg)`);
    }
  }

  return { errors, warnings };
}

export const AnthropometryPanel: React.FC<AnthropometryPanelProps> = ({ studentId, gymId }) => {
  const toast = useToast();
  const [entries, setEntries] = useState<ClientAnthropometry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [chartRange, setChartRange] = useState<'3m' | '6m' | '1y' | 'all'>('all');

  const load = async () => {
    setLoading(true);
    try {
      setEntries(await AnthropometryService.getByStudent(studentId));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [studentId]);

  const validation = validateAnthropometry(form);

  const openForm = () => {
    if (entries.length > 0) {
      const last = entries[0];
      setForm({
        measured_at: new Date().toISOString().split('T')[0],
        height_cm: last.height_cm != null ? String(last.height_cm) : '',
        weight_kg: last.weight_kg != null ? String(last.weight_kg) : '',
        body_fat_pct: last.body_fat_pct != null ? String(last.body_fat_pct) : '',
        muscle_mass_kg: last.muscle_mass_kg != null ? String(last.muscle_mass_kg) : '',
        notes: '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.weight_kg && !form.height_cm && !form.body_fat_pct && !form.muscle_mass_kg) {
      toast.error('Ingresá al menos un dato');
      return;
    }
    if (validation.errors.length > 0) {
      toast.error(validation.errors[0]);
      return;
    }
    if (validation.warnings.length > 0) {
      const ok = window.confirm(`Atención:\n• ${validation.warnings.join('\n• ')}\n\n¿Guardar de todas formas?`);
      if (!ok) return;
    }
    setSaving(true);
    try {
      await AnthropometryService.create({
        gym_id: gymId,
        student_id: studentId,
        measured_at: form.measured_at,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        body_fat_pct: form.body_fat_pct ? Number(form.body_fat_pct) : null,
        muscle_mass_kg: form.muscle_mass_kg ? Number(form.muscle_mass_kg) : null,
        notes: form.notes || null,
      });
      StudentSummaryService.invalidate(studentId);
      toast.success('Medición guardada');
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await AnthropometryService.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      StudentSummaryService.invalidate(studentId);
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  // Chart data (oldest first) with date range filter
  const rangeFilterDate = (() => {
    if (chartRange === 'all') return null;
    const d = new Date();
    if (chartRange === '3m') d.setMonth(d.getMonth() - 3);
    else if (chartRange === '6m') d.setMonth(d.getMonth() - 6);
    else if (chartRange === '1y') d.setFullYear(d.getFullYear() - 1);
    return d;
  })();

  const chartData = [...entries]
    .reverse()
    .filter(e => e.weight_kg !== null)
    .filter(e => !rangeFilterDate || new Date(e.measured_at) >= rangeFilterDate)
    .map(e => ({
      date: new Date(e.measured_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
      peso: e.weight_kg,
      grasa: e.body_fat_pct,
    }));

  // Delta between last two entries
  const getDelta = (field: 'weight_kg' | 'body_fat_pct' | 'muscle_mass_kg') => {
    if (entries.length < 2) return null;
    const curr = entries[0]?.[field];
    const prev = entries[1]?.[field];
    if (curr == null || prev == null) return null;
    return Math.round((curr - prev) * 10) / 10;
  };

  const DeltaBadge = ({ value, inverted = false }: { value: number | null; inverted?: boolean }) => {
    if (value == null) return null;
    const isPositive = value > 0;
    const isGood = inverted ? !isPositive : isPositive;
    const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        isGood ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
               : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
      }`}>
        <Icon size={10} />
        {value > 0 ? '+' : ''}{value}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Weight Chart */}
      {chartData.length >= 2 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Evolución de Peso
            </h4>
            <div className="flex gap-1">
              {(['3m', '6m', '1y', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                    chartRange === r
                      ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                      : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                  }`}
                >
                  {r === 'all' ? 'Todo' : r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 10 }} stroke="#64748b" domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line type="monotone" dataKey="peso" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} name="Peso (kg)" />
                {chartData.some(d => d.grasa != null) && (
                  <Line type="monotone" dataKey="grasa" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="Grasa (%)" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Peso</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {entries[0].weight_kg ?? '-'}<span className="text-xs text-slate-400 ml-0.5">kg</span>
            </p>
            <DeltaBadge value={getDelta('weight_kg')} />
          </Card>
          <Card className="p-3 text-center">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Grasa</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {entries[0].body_fat_pct ?? '-'}<span className="text-xs text-slate-400 ml-0.5">%</span>
            </p>
            <DeltaBadge value={getDelta('body_fat_pct')} inverted />
          </Card>
          <Card className="p-3 text-center">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Músculo</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {entries[0].muscle_mass_kg ?? '-'}<span className="text-xs text-slate-400 ml-0.5">kg</span>
            </p>
            <DeltaBadge value={getDelta('muscle_mass_kg')} />
          </Card>
        </div>
      )}

      {/* Add Button / Form */}
      {!showForm ? (
        <Button variant="outline" fullWidth onClick={openForm}>
          <Plus size={15} className="inline mr-1" />
          Nueva medición
        </Button>
      ) : (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-500/30">
          <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">Nueva medición</h4>
          {entries.length > 0 && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-1">
              Precargado con datos de la medición anterior. Modificá lo que cambió.
            </p>
          )}
          <Input type="date" value={form.measured_at} onChange={e => setForm({ ...form, measured_at: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" step="0.1" placeholder="Altura (cm)" value={form.height_cm} onChange={e => setForm({ ...form, height_cm: e.target.value })} />
            <Input type="number" step="0.1" placeholder="Peso (kg)" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} />
            <Input type="number" step="0.1" placeholder="% Grasa" value={form.body_fat_pct} onChange={e => setForm({ ...form, body_fat_pct: e.target.value })} />
            <Input type="number" step="0.1" placeholder="Masa muscular (kg)" value={form.muscle_mass_kg} onChange={e => setForm({ ...form, muscle_mass_kg: e.target.value })} />
          </div>
          {/* Validation feedback */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-1">
              {validation.errors.map((e, i) => (
                <p key={`e${i}`} className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                  <AlertTriangle size={12} /> {e}
                </p>
              ))}
              {validation.warnings.map((w, i) => (
                <p key={`w${i}`} className="text-[11px] text-amber-500 font-medium flex items-center gap-1">
                  <AlertTriangle size={12} /> {w}
                </p>
              ))}
            </div>
          )}
          <textarea
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            rows={2}
            placeholder="Notas..."
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
              Cancelar
            </Button>
            <Button variant="secondary" fullWidth onClick={handleSave} disabled={saving || validation.errors.length > 0}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </Card>
      )}

      {/* History Table */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-4">Cargando historial...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sin mediciones registradas</p>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-3 py-2.5 text-left font-bold text-slate-500 dark:text-slate-400">Fecha</th>
                  <th className="px-3 py-2.5 text-right font-bold text-slate-500 dark:text-slate-400">Peso</th>
                  <th className="px-3 py-2.5 text-right font-bold text-slate-500 dark:text-slate-400">Grasa</th>
                  <th className="px-3 py-2.5 text-right font-bold text-slate-500 dark:text-slate-400">Músculo</th>
                  <th className="px-3 py-2.5 text-right font-bold text-slate-500 dark:text-slate-400">IMC</th>
                  <th className="px-1 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-t border-slate-100 dark:border-slate-700/50">
                    <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                      {new Date(entry.measured_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900 dark:text-white">
                      {entry.weight_kg ?? '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-400">
                      {entry.body_fat_pct != null ? `${entry.body_fat_pct}%` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-400">
                      {entry.muscle_mass_kg ?? '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-400">
                      {entry.bmi ?? '-'}
                    </td>
                    <td className="px-1 py-2.5">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
