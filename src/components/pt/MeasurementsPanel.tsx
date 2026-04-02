import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowDown, ArrowUp, Minus as MinusIcon, AlertTriangle, User, List } from 'lucide-react';
import { Card, Button, Input } from '../UI';
import { MeasurementsService } from '../../services/pt/MeasurementsService';
import { ClientMeasurement } from '../../../shared/types';
import { useToast } from '../../context/ToastContext';
import { InteractiveBodyMap } from './InteractiveBodyMap';

interface MeasurementsPanelProps {
  studentId: string;
  gymId: string;
}

const FIELDS: { key: keyof ClientMeasurement; label: string; short: string }[] = [
  { key: 'chest_cm', label: 'Pecho', short: 'Pecho' },
  { key: 'waist_cm', label: 'Cintura', short: 'Cintura' },
  { key: 'hips_cm', label: 'Cadera', short: 'Cadera' },
  { key: 'shoulders_cm', label: 'Hombros', short: 'Hombros' },
  { key: 'bicep_l_cm', label: 'Bíceps izq.', short: 'Bíc. I' },
  { key: 'bicep_r_cm', label: 'Bíceps der.', short: 'Bíc. D' },
  { key: 'thigh_l_cm', label: 'Muslo izq.', short: 'Mus. I' },
  { key: 'thigh_r_cm', label: 'Muslo der.', short: 'Mus. D' },
  { key: 'calf_l_cm', label: 'Gemelo izq.', short: 'Gem. I' },
  { key: 'calf_r_cm', label: 'Gemelo der.', short: 'Gem. D' },
  { key: 'neck_cm', label: 'Cuello', short: 'Cuello' },
];

const EMPTY_FORM: Record<string, string> = {
  measured_at: new Date().toISOString().split('T')[0],
  chest_cm: '', waist_cm: '', hips_cm: '', shoulders_cm: '',
  bicep_l_cm: '', bicep_r_cm: '', thigh_l_cm: '', thigh_r_cm: '',
  calf_l_cm: '', calf_r_cm: '', neck_cm: '', notes: '',
};

// Reasonable ranges per measurement (cm)
const RANGES: Record<string, { min: number; max: number; warnMin: number; warnMax: number }> = {
  chest_cm:      { min: 50, max: 180, warnMin: 60, warnMax: 160 },
  waist_cm:      { min: 40, max: 180, warnMin: 50, warnMax: 150 },
  hips_cm:       { min: 50, max: 180, warnMin: 60, warnMax: 160 },
  shoulders_cm:  { min: 70, max: 200, warnMin: 80, warnMax: 170 },
  bicep_l_cm:    { min: 15, max: 70, warnMin: 20, warnMax: 60 },
  bicep_r_cm:    { min: 15, max: 70, warnMin: 20, warnMax: 60 },
  thigh_l_cm:    { min: 30, max: 100, warnMin: 35, warnMax: 90 },
  thigh_r_cm:    { min: 30, max: 100, warnMin: 35, warnMax: 90 },
  calf_l_cm:     { min: 20, max: 70, warnMin: 25, warnMax: 60 },
  calf_r_cm:     { min: 20, max: 70, warnMin: 25, warnMax: 60 },
  neck_cm:       { min: 25, max: 65, warnMin: 28, warnMax: 55 },
};

function validateMeasurements(form: Record<string, string>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const f of FIELDS) {
    const val = form[f.key] ? Number(form[f.key]) : null;
    if (val == null) continue;
    const range = RANGES[f.key];
    if (!range) continue;
    if (val < range.min || val > range.max) {
      errors.push(`${f.label} fuera de rango (${range.min}–${range.max} cm)`);
    } else if (val < range.warnMin || val > range.warnMax) {
      warnings.push(`${f.label}: ${val} cm parece inusual, verificá el dato`);
    }
  }

  // Check L/R asymmetry
  const pairs: [string, string, string][] = [
    ['bicep_l_cm', 'bicep_r_cm', 'Bíceps'],
    ['thigh_l_cm', 'thigh_r_cm', 'Muslos'],
    ['calf_l_cm', 'calf_r_cm', 'Gemelos'],
  ];
  for (const [l, r, label] of pairs) {
    const lv = form[l] ? Number(form[l]) : null;
    const rv = form[r] ? Number(form[r]) : null;
    if (lv != null && rv != null) {
      const diff = Math.abs(lv - rv);
      const avg = (lv + rv) / 2;
      if (avg > 0 && diff / avg > 0.15) {
        warnings.push(`${label}: diferencia izq/der de ${diff.toFixed(1)} cm (>${Math.round(diff / avg * 100)}%), verificá`);
      }
    }
  }

  return { errors, warnings };
}

export const MeasurementsPanel: React.FC<MeasurementsPanelProps> = ({ studentId, gymId }) => {
  const toast = useToast();
  const [entries, setEntries] = useState<ClientMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'body' | 'list'>('body');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setEntries(await MeasurementsService.getByStudent(studentId));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [studentId]);

  const validation = validateMeasurements(form);

  const openForm = () => {
    if (entries.length > 0) {
      const last = entries[0];
      const prefilled: Record<string, string> = {
        measured_at: new Date().toISOString().split('T')[0],
        notes: '',
      };
      FIELDS.forEach(f => {
        const v = last[f.key] as number | null;
        prefilled[f.key] = v != null ? String(v) : '';
      });
      setForm(prefilled);
    } else {
      setForm(EMPTY_FORM);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    const hasValue = FIELDS.some(f => form[f.key] !== '');
    if (!hasValue) {
      toast.error('Ingresá al menos una medición');
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
      const payload: any = { gym_id: gymId, student_id: studentId, measured_at: form.measured_at };
      FIELDS.forEach(f => {
        payload[f.key] = form[f.key] ? Number(form[f.key]) : null;
      });
      payload.notes = form.notes || null;
      await MeasurementsService.create(payload);
      toast.success('Mediciones guardadas');
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
      await MeasurementsService.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const getDelta = (field: keyof ClientMeasurement) => {
    if (entries.length < 2) return null;
    const curr = entries[0]?.[field] as number | null;
    const prev = entries[1]?.[field] as number | null;
    if (curr == null || prev == null) return null;
    return Math.round((curr - prev) * 10) / 10;
  };

  return (
    <div className="space-y-4">
      {/* View toggle */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {viewMode === 'body' ? 'Mapa corporal' : 'Mediciones'}
          </h4>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('body')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'body'
                  ? 'bg-violet-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Mapa corporal"
            >
              <User size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-violet-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Vista lista"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Body map view */}
      {entries.length > 0 && viewMode === 'body' && (
        <Card className="p-4">
          <InteractiveBodyMap
            latest={entries[0]}
            previous={entries.length > 1 ? entries[1] : null}
          />
        </Card>
      )}

      {/* List view (original cards) */}
      {entries.length > 0 && viewMode === 'list' && (
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map(f => {
            const val = entries[0]?.[f.key] as number | null;
            if (val == null) return null;
            const delta = getDelta(f.key);
            return (
              <Card key={f.key} className="p-2.5">
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate">{f.short}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-slate-900 dark:text-white">{val}</span>
                  <span className="text-[10px] text-slate-400">cm</span>
                  {delta != null && delta !== 0 && (
                    <span className={`inline-flex items-center text-[9px] font-bold ${
                      delta < 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {delta > 0 ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                      {Math.abs(delta)}
                    </span>
                  )}
                </div>
              </Card>
            );
          }).filter(Boolean)}
        </div>
      )}

      {/* Add / Form */}
      {!showForm ? (
        <Button variant="outline" fullWidth onClick={openForm}>
          <Plus size={15} className="inline mr-1" />
          Nueva medición corporal
        </Button>
      ) : (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-500/30">
          <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">Nueva medición corporal</h4>
          {entries.length > 0 && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-1">
              Precargado con datos de la medición anterior. Modificá lo que cambió.
            </p>
          )}
          <Input type="date" value={form.measured_at} onChange={e => setForm({ ...form, measured_at: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(f => (
              <Input
                key={f.key}
                type="number"
                step="0.1"
                placeholder={`${f.label} (cm)`}
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              />
            ))}
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

      {/* History */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-4">Cargando historial...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sin mediciones registradas</p>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <Card key={entry.id} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {new Date(entry.measured_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                </span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
                {FIELDS.map(f => {
                  const v = entry[f.key] as number | null;
                  if (v == null) return null;
                  return (
                    <div key={f.key} className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">{f.short}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{v} cm</span>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
              {entry.notes && (
                <p className="text-[10px] text-slate-400 mt-2 italic">{entry.notes}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
