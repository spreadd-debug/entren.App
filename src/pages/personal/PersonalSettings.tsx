import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileHeader, Card } from '../../components/personal/ui';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';

export const PersonalSettings: React.FC = () => {
  const navigate = useNavigate();
  const { profile, update, loading } = usePersonalProfile();
  const [form, setForm] = useState({
    display_name: '',
    weight_kg: '',
    height_cm: '',
    currency: 'ARS',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name ?? '',
      weight_kg: profile.weight_kg != null ? String(profile.weight_kg) : '',
      height_cm: profile.height_cm != null ? String(profile.height_cm) : '',
      currency: profile.currency ?? 'ARS',
    });
  }, [profile?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update({
        display_name: form.display_name || null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        currency: form.currency || 'ARS',
      });
      navigate(-1);
    } catch (err) {
      console.error('[settings] save failed', err);
      alert('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <MobileHeader title="Ajustes" onBack={() => navigate(-1)} large />

      <div className="px-5 pb-32">
        {loading && <p className="text-center text-sm text-[var(--color-ink-muted)] py-8">Cargando…</p>}

        {!loading && (
          <Card className="mt-4">
            <div className="space-y-4">
              <Field label="Nombre" type="text" value={form.display_name} onChange={v => setForm({ ...form, display_name: v })} placeholder="Mauro" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Peso (kg)" type="number" value={form.weight_kg} onChange={v => setForm({ ...form, weight_kg: v })} placeholder="75" />
                <Field label="Altura (cm)" type="number" value={form.height_cm} onChange={v => setForm({ ...form, height_cm: v })} placeholder="175" />
              </div>
              <Field label="Moneda" type="text" value={form.currency} onChange={v => setForm({ ...form, currency: v })} placeholder="ARS" />
              <p className="text-[11px] text-[var(--color-ink-muted)]">
                El peso se usa para estimar las kcal de tus entrenamientos importados desde Strava.
              </p>
            </div>
          </Card>
        )}

        <button
          type="button"
          disabled={saving || loading}
          onClick={handleSave}
          className="w-full py-3 mt-4 rounded-full bg-[var(--color-ink)] text-white font-medium disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </>
  );
};

const Field: React.FC<{ label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, type, value, onChange, placeholder }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">{label}</span>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10 focus:outline-none focus:border-[var(--color-ink)]/40"
    />
  </label>
);
