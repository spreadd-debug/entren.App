import { useState, useEffect } from "react";
import {
  X, Search, Loader2, Check, Calendar, Users, AlertTriangle, Trash2,
} from "lucide-react";
import { supabase } from "../../db/supabase";
import { RoutineBuilderService } from "../../services/RoutineBuilderService";
import { PlanProfileService } from "../../services/pt/PlanProfileService";
import { useToast } from "../../context/ToastContext";
import type { RoutineDay, RoutineAssignment, StudentPlanProfile } from "../../../shared/types";

const WEEKDAYS = [
  { key: "lunes", label: "Lun", long: "Lunes" },
  { key: "martes", label: "Mar", long: "Martes" },
  { key: "miercoles", label: "Mie", long: "Miércoles" },
  { key: "jueves", label: "Jue", long: "Jueves" },
  { key: "viernes", label: "Vie", long: "Viernes" },
  { key: "sabado", label: "Sab", long: "Sábado" },
  { key: "domingo", label: "Dom", long: "Domingo" },
];

// Map plan profile day keys (english) to our weekday keys (spanish)
const PROFILE_DAY_MAP: Record<string, string> = {
  monday: "lunes", tuesday: "martes", wednesday: "miercoles", thursday: "jueves",
  friday: "viernes", saturday: "sabado", sunday: "domingo",
};

interface StudentRow {
  id: string;
  nombre: string;
  apellido: string;
  status: string;
}

interface StudentAssignmentFlowProps {
  routineId: string;
  routineDays: RoutineDay[];
  gymId: string;
  open: boolean;
  onClose: () => void;
}

export default function StudentAssignmentFlow({
  routineId,
  routineDays,
  gymId,
  open,
  onClose,
}: StudentAssignmentFlowProps) {
  const toast = useToast();

  // Step state
  const [step, setStep] = useState<"pick_student" | "map_days">("pick_student");

  // Student picker
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Selected student
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentPlanProfile | null>(null);

  // Day mapping
  const [dayMapping, setDayMapping] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState(false);

  // Existing assignments
  const [assignments, setAssignments] = useState<(RoutineAssignment & { routine_name: string })[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Load students
  useEffect(() => {
    if (!open) return;
    setStep("pick_student");
    setSelectedStudent(null);
    setSearch("");
    setDayMapping({});

    (async () => {
      setLoadingStudents(true);
      try {
        const { data } = await supabase
          .from("students")
          .select("id, nombre, apellido, status")
          .eq("gym_id", gymId)
          .in("status", ["activo", "active"])
          .order("nombre");
        setStudents((data as StudentRow[]) || []);
      } catch {
        toast.error("Error al cargar alumnos");
      } finally {
        setLoadingStudents(false);
      }
    })();

    // Load existing assignments for this routine
    (async () => {
      setLoadingAssignments(true);
      try {
        const data = await RoutineBuilderService.getAssignmentsForRoutine(routineId);
        // Enrich with student names
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, nombre, apellido")
          .in("id", data.map((a) => a.student_id));

        const nameMap = new Map((studentsData || []).map((s: any) => [s.id, `${s.nombre ?? ""} ${s.apellido ?? ""}`.trim()]));

        setAssignments(
          data.map((a) => ({ ...a, routine_name: nameMap.get(a.student_id) || "Alumno" }))
        );
      } catch {
        // ignore
      } finally {
        setLoadingAssignments(false);
      }
    })();
  }, [open, routineId, gymId]);

  // Filter students
  const filtered = students.filter((s) => {
    const name = `${s.nombre} ${s.apellido}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // Handle student selection → go to day mapping
  const handleSelectStudent = async (student: StudentRow) => {
    setSelectedStudent(student);
    setStep("map_days");
    setDayMapping({});

    // Try to load plan profile for available_days hints
    try {
      const profile = await PlanProfileService.get(student.id);
      setStudentProfile(profile);

      // Auto-map routine days to student's available days if they match count
      if (profile?.available_days && profile.available_days.length > 0 && routineDays.length > 0) {
        const availableWeekdays = profile.available_days
          .map((d) => PROFILE_DAY_MAP[d])
          .filter(Boolean);

        if (availableWeekdays.length >= routineDays.length) {
          const autoMap: Record<string, string> = {};
          routineDays.forEach((day, i) => {
            if (availableWeekdays[i]) autoMap[day.id] = availableWeekdays[i];
          });
          setDayMapping(autoMap);
        }
      }
    } catch {
      setStudentProfile(null);
    }
  };

  const toggleDayMapping = (dayId: string, weekday: string) => {
    setDayMapping((prev) => {
      const copy = { ...prev };
      if (copy[dayId] === weekday) {
        delete copy[dayId];
      } else {
        for (const [k, v] of Object.entries(copy)) {
          if (v === weekday) delete copy[k];
        }
        copy[dayId] = weekday;
      }
      return copy;
    });
  };

  const handleAssign = async () => {
    if (!selectedStudent) return;
    setAssigning(true);
    try {
      await RoutineBuilderService.assignRoutine(routineId, selectedStudent.id, dayMapping);
      toast.success(`Rutina asignada a ${selectedStudent.nombre}`);
      // Refresh assignments
      const data = await RoutineBuilderService.getAssignmentsForRoutine(routineId);
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, nombre, apellido")
        .in("id", data.map((a) => a.student_id));
      const nameMap = new Map((studentsData || []).map((s: any) => [s.id, `${s.nombre ?? ""} ${s.apellido ?? ""}`.trim()]));
      setAssignments(data.map((a) => ({ ...a, routine_name: nameMap.get(a.student_id) || "Alumno" })));

      setStep("pick_student");
      setSelectedStudent(null);
      setDayMapping({});
    } catch {
      toast.error("Error al asignar");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await RoutineBuilderService.removeAssignment(assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast.success("Asignacion eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  if (!open) return null;

  // Get available days from profile as weekday keys (spanish)
  const profileWeekdays = new Set(
    (studentProfile?.available_days || []).map((d) => PROFILE_DAY_MAP[d]).filter(Boolean)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {step === "pick_student" ? "Asignar a alumno" : `Dias para ${selectedStudent?.nombre}`}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* ── Step 1: Pick student ──────────────────────────────────────── */}
          {step === "pick_student" && (
            <>
              {/* Existing assignments */}
              {!loadingAssignments && assignments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Alumnos asignados ({assignments.length})
                  </p>
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white flex-1 truncate">
                        {a.routine_name}
                      </span>
                      {Object.keys(a.day_mapping || {}).length > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                          {Object.values(a.day_mapping).map((d) => WEEKDAYS.find((w) => w.key === d)?.label).filter(Boolean).join(", ")}
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveAssignment(a.id)}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar alumno..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-cyan-500 transition-colors"
                  autoFocus
                />
              </div>

              {/* Student list */}
              {loadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  {search ? "Sin resultados" : "No hay alumnos activos"}
                </p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filtered.map((s) => {
                    const alreadyAssigned = assignments.some((a) => a.student_id === s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => !alreadyAssigned && handleSelectStudent(s)}
                        disabled={alreadyAssigned}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          alreadyAssigned
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-slate-500">
                            {(s.nombre?.[0] ?? "").toUpperCase()}{(s.apellido?.[0] ?? "").toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate flex-1">
                          {s.nombre} {s.apellido}
                        </span>
                        {alreadyAssigned && (
                          <span className="text-[10px] font-bold text-emerald-500">Asignado</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Step 2: Map days ──────────────────────────────────────────── */}
          {step === "map_days" && selectedStudent && (
            <>
              {/* Profile hint */}
              {studentProfile?.available_days && studentProfile.available_days.length > 0 && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                  <Calendar size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                      Dias del plan: {studentProfile.available_days.map((d) => {
                        const wd = PROFILE_DAY_MAP[d];
                        return WEEKDAYS.find((w) => w.key === wd)?.long;
                      }).filter(Boolean).join(", ")}
                    </p>
                    <p className="text-[10px] text-indigo-500/70 mt-0.5">
                      Los dias se pre-asignaron automaticamente
                    </p>
                  </div>
                </div>
              )}

              {/* Day mapping grid */}
              <div className="space-y-3">
                {routineDays.map((day) => {
                  const mapped = dayMapping[day.id];
                  return (
                    <div key={day.id} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {day.label}
                        </span>
                        {mapped && (
                          <span className="text-xs text-indigo-500 font-semibold ml-auto">
                            {WEEKDAYS.find((w) => w.key === mapped)?.long}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {WEEKDAYS.map((wd) => {
                          const isSelected = mapped === wd.key;
                          const isUsedByOther = !isSelected && Object.values(dayMapping).includes(wd.key);
                          const isFromProfile = profileWeekdays.has(wd.key);
                          return (
                            <button
                              key={wd.key}
                              type="button"
                              onClick={() => toggleDayMapping(day.id, wd.key)}
                              disabled={isUsedByOther}
                              className={`w-9 h-8 rounded-lg text-xs font-bold transition-all ${
                                isSelected
                                  ? "bg-indigo-500 text-white"
                                  : isUsedByOther
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-200 dark:text-slate-700 cursor-not-allowed"
                                    : isFromProfile
                                      ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 border border-indigo-300 dark:border-indigo-500/30 hover:bg-indigo-200"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              {wd.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* No profile warning */}
              {!studentProfile?.available_days?.length && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Este alumno no tiene plan de entrenamiento — asigna los dias manualmente
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAssign}
                  disabled={assigning}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {assigning ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Asignar
                </button>
                <button
                  onClick={() => { setStep("pick_student"); setSelectedStudent(null); setDayMapping({}); }}
                  className="px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Volver
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
