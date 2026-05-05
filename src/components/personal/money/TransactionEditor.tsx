import React, { useEffect, useState } from 'react';
import { BottomSheet } from '../ui';
import { resolveCategoryIcon } from './categoryIcons';
import { PersonalTransaction, PersonalCategory } from '../../../../shared/types';

// Editor minimal de tx: sólo descripción + categoría. El resto (monto, kind,
// fecha, cuenta/tarjeta) queda read-only porque cambiarlos requiere
// reconciliación de balances/statements — para esos casos, borrar y volver
// a crear es más limpio.

interface Props {
  open: boolean;
  tx: PersonalTransaction | null;
  categories: PersonalCategory[];
  onClose: () => void;
  onSave: (id: string, patch: { description: string | null; category_id: string | null }) => Promise<void>;
}

export const TransactionEditor: React.FC<Props> = ({ open, tx, categories, onClose, onSave }) => {
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tx) return;
    setDescription(tx.description ?? '');
    setCategoryId(tx.category_id);
    setSaving(false);
  }, [tx]);

  if (!tx) return null;

  const txKind: 'expense' | 'income' | 'transfer' =
    tx.kind === 'expense' ? 'expense' :
    tx.kind === 'income' ? 'income' : 'transfer';

  const filteredCats = categories.filter(c =>
    txKind === 'transfer' ? false : c.kind === txKind
  );

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(tx.id, {
        description: description.trim() || null,
        category_id: categoryId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Editar movimiento">
      <div className="space-y-4 mt-2">
        {/* Read-only summary del monto + cuenta */}
        <div className="rounded-2xl bg-[var(--color-cream-100)] px-3.5 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
            {tx.kind === 'expense' ? 'Egreso' : tx.kind === 'income' ? 'Ingreso' : 'Transferencia'}
          </p>
          <p className="font-serif text-2xl text-[var(--color-ink)] mt-0.5">
            {tx.kind === 'expense' ? '−' : tx.kind === 'income' ? '+' : ''} {tx.currency} {Math.abs(Number(tx.amount)).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
            {new Date(tx.occurred_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
            {tx.installment_total && tx.installment_number && ` · Cuota ${tx.installment_number}/${tx.installment_total}`}
          </p>
          <p className="text-[10px] text-[var(--color-ink-muted)] mt-1.5 italic">
            Para cambiar monto, fecha o cuenta tenés que borrar y volver a cargar.
          </p>
        </div>

        {filteredCats.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold mb-2">Categoría</p>
            <div className="grid grid-cols-4 gap-2">
              {filteredCats.map(c => {
                const Icon = resolveCategoryIcon(c.icon);
                const selected = categoryId === c.id;
                const accent = c.color ?? '#64748B';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(selected ? null : c.id)}
                    className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-2xl transition-all ${
                      selected
                        ? 'bg-[var(--color-ink)] text-white shadow-md'
                        : 'bg-white text-[var(--color-ink)] border border-[var(--color-ink)]/8 hover:border-[var(--color-ink)]/20 active:scale-[0.97]'
                    }`}
                  >
                    <span
                      className="w-9 h-9 rounded-2xl flex items-center justify-center"
                      style={
                        selected
                          ? { background: 'rgba(255,255,255,0.15)', color: 'white' }
                          : { background: accent + '22', color: accent }
                      }
                    >
                      <Icon size={16} strokeWidth={1.85} />
                    </span>
                    <span className="text-[11px] font-medium leading-tight text-center">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block mb-1.5">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="opcional"
            className="w-full px-4 py-2.5 rounded-2xl bg-white text-[var(--color-ink)] text-sm border border-[var(--color-ink)]/10 focus:outline-none focus:border-[var(--color-ink)]/40"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 mt-2 rounded-full bg-[var(--color-ink)] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </BottomSheet>
  );
};
