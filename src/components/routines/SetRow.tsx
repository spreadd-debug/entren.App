import { Trash2 } from "lucide-react";
import type { RoutineSetDraft, SetType, WeightType } from "../../../shared/types";

const SET_TYPES: { value: SetType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "warmup", label: "Entrada en calor" },
  { value: "dropset", label: "Drop set" },
  { value: "failure", label: "Al fallo" },
  { value: "backoff", label: "Back-off" },
];

const WEIGHT_TYPES: { value: WeightType; label: string }[] = [
  { value: "absolute", label: "kg" },
  { value: "bodyweight", label: "Corporal" },
  { value: "rpe_target", label: "RPE" },
  { value: "percentage_1rm", label: "% 1RM" },
  { value: "band", label: "Banda" },
  { value: "not_specified", label: "—" },
];

interface SetRowProps {
  key?: string | number;
  set: RoutineSetDraft;
  index: number;
  useTime: boolean;
  onChange: (updated: RoutineSetDraft) => void;
  onDelete: () => void;
  canDelete: boolean;
}

export default function SetRow({ set, index, useTime, onChange, onDelete, canDelete }: SetRowProps) {
  const setTypeColor: Record<SetType, string> = {
    normal: "text-slate-600 dark:text-slate-400",
    warmup: "text-amber-500",
    dropset: "text-purple-500",
    failure: "text-rose-500",
    backoff: "text-sky-500",
  };

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      {/* Set number */}
      <span className="w-6 text-center text-xs font-bold text-slate-400 dark:text-slate-600 shrink-0">
        {index + 1}
      </span>

      {/* Set type */}
      <select
        className={`w-28 shrink-0 px-2 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${setTypeColor[set.set_type]} appearance-none cursor-pointer`}
        value={set.set_type}
        onChange={(e) => onChange({ ...set, set_type: e.target.value as SetType })}
      >
        {SET_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Reps or Time */}
      {useTime ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            className="w-16 px-2 py-1.5 rounded-lg text-xs text-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            placeholder="seg"
            value={set.time_sec ?? ""}
            onChange={(e) => onChange({ ...set, time_sec: e.target.value ? Number(e.target.value) : null })}
          />
          <span className="text-xs text-slate-400">seg</span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <input
            type="number"
            className="w-14 px-2 py-1.5 rounded-lg text-xs text-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            placeholder="reps"
            value={set.reps ?? ""}
            onChange={(e) => onChange({ ...set, reps: e.target.value ? Number(e.target.value) : null })}
          />
          {set.reps_max !== null && set.reps_max !== undefined ? (
            <>
              <span className="text-xs text-slate-400">-</span>
              <input
                type="number"
                className="w-14 px-2 py-1.5 rounded-lg text-xs text-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="max"
                value={set.reps_max ?? ""}
                onChange={(e) => onChange({ ...set, reps_max: e.target.value ? Number(e.target.value) : null })}
              />
            </>
          ) : null}
          <button
            type="button"
            className="text-[10px] text-slate-400 hover:text-cyan-500 transition-colors"
            title="Agregar rango de reps"
            onClick={() => onChange({ ...set, reps_max: set.reps_max !== null ? null : (set.reps ?? 12) })}
          >
            {set.reps_max !== null && set.reps_max !== undefined ? "×" : "±"}
          </button>
          <span className="text-xs text-slate-400">reps</span>
        </div>
      )}

      {/* Weight */}
      <div className="flex items-center gap-1">
        {set.weight_type === "absolute" || set.weight_type === "percentage_1rm" ? (
          <input
            type="number"
            step="0.5"
            className="w-16 px-2 py-1.5 rounded-lg text-xs text-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            placeholder={set.weight_type === "percentage_1rm" ? "%" : "kg"}
            value={set.weight_kg ?? ""}
            onChange={(e) => onChange({ ...set, weight_kg: e.target.value ? Number(e.target.value) : null })}
          />
        ) : null}
        <select
          className="w-20 shrink-0 px-1 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 appearance-none cursor-pointer"
          value={set.weight_type}
          onChange={(e) => onChange({ ...set, weight_type: e.target.value as WeightType })}
        >
          {WEIGHT_TYPES.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      </div>

      {/* RPE / RIR */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.5"
          min="1"
          max="10"
          className="w-12 px-1 py-1.5 rounded-lg text-xs text-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          placeholder="RPE"
          value={set.rpe_target ?? ""}
          onChange={(e) => onChange({ ...set, rpe_target: e.target.value ? Number(e.target.value) : null })}
        />
        <input
          type="number"
          min="0"
          max="10"
          className="w-12 px-1 py-1.5 rounded-lg text-xs text-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          placeholder="RIR"
          value={set.rir_target ?? ""}
          onChange={(e) => onChange({ ...set, rir_target: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      {/* Delete */}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded-lg text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
