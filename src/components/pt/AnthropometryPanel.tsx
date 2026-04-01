import React, { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, Button, Input } from '../UI';
import { AnthropometryService } from '../../services/pt/AnthropometryService';
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

export const AnthropometryPanel: React.FC<AnthropometryPanelProps> = ({ studentId, gymId }) => {
  const toast = useToast();
  const [entries, setEntries] = useState<ClientAnthropometry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setEntries(await AnthropometryService.getByStudent(studentId));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [studentId]);

  const handleSave = async () => {
    if (!form.weight_kg && !form.height_cm && !form.body_fat_pct && !form.muscle_mass_kg) {
      toast.error('Ingresá al menos un dato');
      return;
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
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  // Chart data (oldest first)
  const chartData = [...entries]
    .reverse()
    .filter(e => e.weight_kg !== null)
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
          <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Evolución de Peso
          </h4>
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
        <Button variant="outline" fullWidth onClick={() => setShowForm(true)}>
          <Plus size={15} className="inline mr-1" />
          Nueva medición
        </Button>
      ) : (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-500/30">
          <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">Nueva medición</h4>
          <Input type="date" value={form.measured_at} onChange={e => setForm({ ...form, measured_at: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" step="0.1" placeholder="Altura (cm)" value={form.height_cm} onChange={e => setForm({ ...form, height_cm: e.target.value })} />
            <Input type="number" step="0.1" placeholder="Peso (kg)" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} />
            <Input type="number" step="0.1" placeholder="% Grasa" value={form.body_fat_pct} onChange={e => setForm({ ...form, body_fat_pct: e.target.value })} />
            <Input type="number" step="0.1" placeholder="Masa muscular (kg)" value={form.muscle_mass_kg} onChange={e => setForm({ ...form, muscle_mass_kg: e.target.value })} />
          </div>
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
            <Button variant="secondary" fullWidth onClick={handleSave} disabled={saving}>
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
