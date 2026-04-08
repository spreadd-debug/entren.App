import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Plus, Dumbbell } from "lucide-react";
import { Button } from "../UI";
import { RoutineBuilderService } from "../../services/RoutineBuilderService";

// Muscle groups matching exercise_library values (Spanish)
const MUSCLE_GROUPS = [
  "Cuello", "Trapecios", "Hombros", "Pecho", "Espalda", "Espalda Media",
  "Espalda Baja", "Bíceps", "Tríceps", "Antebrazos", "Abdomen", "Glúteos",
  "Cuádriceps", "Isquiotibiales", "Aductores", "Abductores", "Pantorrillas",
];

interface ExercisePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: { id: string; name: string; muscle_group: string | null }) => void;
}

export default function ExercisePickerModal({ isOpen, onClose, onSelect }: ExercisePickerModalProps) {
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setMuscleGroup("");
      inputRef.current?.focus();
      doSearch("", "");
    }
  }, [isOpen]);

  const doSearch = async (q: string, mg: string) => {
    setLoading(true);
    try {
      const data = await RoutineBuilderService.searchExercises(q, mg || undefined);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value, muscleGroup), 250);
  };

  const handleMuscleGroupChange = (mg: string) => {
    setMuscleGroup(mg);
    doSearch(search, mg);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Agregar ejercicio</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 space-y-2 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/60"
              placeholder="Buscar ejercicio..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                !muscleGroup ? "bg-cyan-500 text-slate-950" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              onClick={() => handleMuscleGroupChange("")}
            >
              Todos
            </button>
            {MUSCLE_GROUPS.map((mg) => (
              <button
                key={mg}
                type="button"
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  muscleGroup === mg ? "bg-cyan-500 text-slate-950" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                onClick={() => handleMuscleGroupChange(mg)}
              >
                {mg}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              No se encontraron ejercicios
            </div>
          ) : (
            <div className="space-y-0.5">
              {results.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group"
                  onClick={() => {
                    onSelect({ id: ex.id, name: ex.name, muscle_group: ex.muscle_group });
                    onClose();
                  }}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Dumbbell size={14} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{ex.name}</p>
                    {ex.muscle_group && (
                      <p className="text-[11px] text-slate-400">{ex.muscle_group}</p>
                    )}
                  </div>
                  <Plus size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-cyan-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
