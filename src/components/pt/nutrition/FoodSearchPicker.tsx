import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ArrowLeft, Flame, Beef, Wheat, Droplets, Loader2, PackageSearch, BookOpen, Plus } from 'lucide-react';
import { Input, Button } from '../../UI';
import {
  searchLocal,
  searchOpenFoodFacts,
  scaleMacros,
  type FoodLibraryItem,
} from '../../../services/foodLibrary';

interface FoodSearchPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (payload: {
    food_name: string;
    amount: number;
    unit: 'g';
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }) => void;
  onAddManual?: () => void;
}

type Tab = 'local' | 'off';

export const FoodSearchPicker: React.FC<FoodSearchPickerProps> = ({ open, onClose, onSelect, onAddManual }) => {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('local');
  const [offResults, setOffResults] = useState<FoodLibraryItem[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [offError, setOffError] = useState<string | null>(null);

  const [selected, setSelected] = useState<FoodLibraryItem | null>(null);
  const [amount, setAmount] = useState<string>('');

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setQuery('');
      setTab('local');
      setOffResults([]);
      setOffLoading(false);
      setOffError(null);
      setSelected(null);
      setAmount('');
    }
  }, [open]);

  // Local search (sync)
  const localResults = useMemo(() => searchLocal(query), [query]);

  // OFF search (debounced)
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!open || tab !== 'off') return;
    const q = query.trim();
    if (!q || q.length < 2) {
      setOffResults([]);
      setOffLoading(false);
      setOffError(null);
      return;
    }

    setOffLoading(true);
    setOffError(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const timer = setTimeout(async () => {
      try {
        const results = await searchOpenFoodFacts(q, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        setOffResults(results);
        if (results.length === 0) setOffError('Sin productos argentinos para esta búsqueda.');
      } catch {
        if (!ctrl.signal.aborted) setOffError('Error de conexión.');
      } finally {
        if (!ctrl.signal.aborted) setOffLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, tab, open]);

  if (!open) return null;

  const currentResults = tab === 'local' ? localResults : offResults;

  const handlePick = (item: FoodLibraryItem) => {
    setSelected(item);
    setAmount('100');
  };

  const handleBack = () => {
    setSelected(null);
    setAmount('');
  };

  const grams = Number(amount);
  const gramsValid = !isNaN(grams) && grams > 0;
  const scaled = selected && gramsValid ? scaleMacros(selected, grams) : null;

  const handleConfirm = () => {
    if (!selected || !scaled || !gramsValid) return;
    onSelect({
      food_name: selected.brand ? `${selected.name} (${selected.brand})` : selected.name,
      amount: grams,
      unit: 'g',
      calories: scaled.kcal,
      protein_g: scaled.protein,
      carbs_g: scaled.carbs,
      fat_g: scaled.fat,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-xl sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl overflow-hidden">
        {selected ? (
          <PortionStage
            item={selected}
            amount={amount}
            onAmountChange={setAmount}
            scaled={scaled}
            onBack={handleBack}
            onCancel={onClose}
            onConfirm={handleConfirm}
            confirmDisabled={!gramsValid}
          />
        ) : (
          <SearchStage
            query={query}
            onQueryChange={setQuery}
            tab={tab}
            onTabChange={setTab}
            results={currentResults}
            loading={tab === 'off' && offLoading}
            error={tab === 'off' ? offError : null}
            onPick={handlePick}
            onClose={onClose}
            onAddManual={onAddManual}
          />
        )}
      </div>
    </div>
  );
};

// ─── Search stage ──────────────────────────────────────────────────────────

const SearchStage: React.FC<{
  query: string;
  onQueryChange: (q: string) => void;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  results: FoodLibraryItem[];
  loading: boolean;
  error: string | null;
  onPick: (item: FoodLibraryItem) => void;
  onClose: () => void;
  onAddManual?: () => void;
}> = ({ query, onQueryChange, tab, onTabChange, results, loading, error, onPick, onClose, onAddManual }) => (
  <>
    {/* Header */}
    <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
      <div className="relative flex-1">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          type="search"
          autoFocus
          placeholder={tab === 'local' ? 'Buscar alimento (ej: pollo)' : 'Buscar producto (ej: galletitas oreo)'}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        title="Cerrar"
      >
        <X size={18} />
      </button>
    </div>

    {/* Tabs */}
    <div className="flex gap-1 px-3 pt-2 border-b border-slate-100 dark:border-slate-800">
      <TabButton active={tab === 'local'} onClick={() => onTabChange('local')} icon={<BookOpen size={13} />}>
        Biblioteca
      </TabButton>
      <TabButton active={tab === 'off'} onClick={() => onTabChange('off')} icon={<PackageSearch size={13} />} badge="AR">
        Productos
      </TabButton>
    </div>

    {/* Results */}
    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
      {tab === 'off' && loading && (
        <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-2">
          <Loader2 size={14} className="animate-spin" /> Buscando en Open Food Facts…
        </div>
      )}

      {tab === 'off' && !loading && error && results.length === 0 && (
        <EmptyState message={error} query={query} onAddManual={onAddManual} />
      )}

      {!loading && results.length === 0 && !error && (
        <EmptyState
          message={
            query.trim()
              ? (tab === 'local' ? 'Sin resultados en la biblioteca.' : 'Escribí al menos 2 letras para buscar.')
              : (tab === 'local' ? 'Escribí un alimento para buscar (pollo, arroz, banana…).' : 'Escribí un producto (ej: "yogur la serenísima").')
          }
          query={query}
          onSwitchToProducts={tab === 'local' ? () => onTabChange('off') : undefined}
          onAddManual={onAddManual}
        />
      )}

      {results.map(item => (
        <FoodRow key={item.id} item={item} onPick={onPick} />
      ))}
    </div>
  </>
);

const EmptyState: React.FC<{
  message: string;
  query: string;
  onSwitchToProducts?: () => void;
  onAddManual?: () => void;
}> = ({ message, query, onSwitchToProducts, onAddManual }) => {
  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 2;
  return (
    <div className="py-8 text-center space-y-2 flex flex-col items-center">
      <p className="text-xs text-slate-400">{message}</p>
      {hasQuery && onSwitchToProducts && (
        <button
          type="button"
          onClick={onSwitchToProducts}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-colors"
        >
          <PackageSearch size={12} /> Buscar "{trimmed}" en Productos (AR)
        </button>
      )}
      {hasQuery && onAddManual && (
        <button
          type="button"
          onClick={onAddManual}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors"
        >
          <Plus size={12} /> Agregar "{trimmed}" manualmente
        </button>
      )}
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
}> = ({ active, onClick, icon, badge, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 border-b-2 transition-colors ${
      active
        ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
    }`}
  >
    {icon} {children}
    {badge && (
      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
        {badge}
      </span>
    )}
  </button>
);

const FoodRow: React.FC<{ item: FoodLibraryItem; onPick: (i: FoodLibraryItem) => void }> = ({ item, onPick }) => (
  <button
    type="button"
    onClick={() => onPick(item)}
    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
  >
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
        {(item.brand || item.category) && (
          <p className="text-[10px] text-slate-400 truncate">
            {item.brand ?? item.category}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1">
          <MacroChip color="orange" icon={<Flame size={9} />} value={`${item.per100g.kcal}`} unit="kcal" />
          <MacroChip color="rose" icon={<Beef size={9} />} value={`${item.per100g.protein}`} unit="p" />
          <MacroChip color="amber" icon={<Wheat size={9} />} value={`${item.per100g.carbs}`} unit="c" />
          <MacroChip color="cyan" icon={<Droplets size={9} />} value={`${item.per100g.fat}`} unit="g" />
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-500">
            /100g
          </span>
        </div>
      </div>
    </div>
  </button>
);

// ─── Portion stage ──────────────────────────────────────────────────────────

const PortionStage: React.FC<{
  item: FoodLibraryItem;
  amount: string;
  onAmountChange: (v: string) => void;
  scaled: { kcal: number; protein: number; carbs: number; fat: number } | null;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
}> = ({ item, amount, onAmountChange, scaled, onBack, onCancel, onConfirm, confirmDisabled }) => (
  <>
    <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
      <button
        type="button"
        onClick={onBack}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        title="Volver"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
        {item.brand && <p className="text-[10px] text-slate-400 truncate">{item.brand}</p>}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        title="Cerrar"
      >
        <X size={18} />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Per 100g summary */}
      <div>
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 px-1">Macros por 100g</p>
        <div className="flex flex-wrap gap-1.5">
          <MacroChip color="orange" icon={<Flame size={10} />} value={`${item.per100g.kcal}`} unit="kcal" large />
          <MacroChip color="rose" icon={<Beef size={10} />} value={`${item.per100g.protein}`} unit="p" large />
          <MacroChip color="amber" icon={<Wheat size={10} />} value={`${item.per100g.carbs}`} unit="c" large />
          <MacroChip color="cyan" icon={<Droplets size={10} />} value={`${item.per100g.fat}`} unit="g" large />
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block px-1">
          Cantidad (gramos)
        </label>
        <Input
          type="number"
          min="1"
          step="1"
          autoFocus
          placeholder="Ej: 150"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
        />
      </div>

      {/* Common portions */}
      {item.commonPortions && item.commonPortions.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 px-1">Porciones comunes</p>
          <div className="flex flex-wrap gap-1.5">
            {item.commonPortions.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => onAmountChange(String(p.grams))}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scaled preview */}
      {scaled && (
        <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Para {amount}g
          </p>
          <div className="flex flex-wrap gap-1.5">
            <MacroChip color="orange" icon={<Flame size={10} />} value={`${scaled.kcal}`} unit="kcal" large />
            <MacroChip color="rose" icon={<Beef size={10} />} value={`${scaled.protein}`} unit="p" large />
            <MacroChip color="amber" icon={<Wheat size={10} />} value={`${scaled.carbs}`} unit="c" large />
            <MacroChip color="cyan" icon={<Droplets size={10} />} value={`${scaled.fat}`} unit="g" large />
          </div>
        </div>
      )}
    </div>

    {/* Footer */}
    <div className="flex gap-2 p-3 border-t border-slate-100 dark:border-slate-800">
      <Button variant="outline" onClick={onBack} className="flex-1">Volver</Button>
      <Button variant="primary" onClick={onConfirm} disabled={confirmDisabled} className="flex-1">
        Agregar al plan
      </Button>
    </div>
  </>
);

// ─── Macro chip ──────────────────────────────────────────────────────────────

const MacroChip: React.FC<{
  color: 'orange' | 'rose' | 'amber' | 'cyan';
  icon: React.ReactNode;
  value: string;
  unit: string;
  large?: boolean;
}> = ({ color, icon, value, unit, large }) => {
  const colors = {
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md font-semibold ${colors[color]} ${large ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'}`}>
      {icon} {value}<span className="opacity-60">{unit}</span>
    </span>
  );
};
