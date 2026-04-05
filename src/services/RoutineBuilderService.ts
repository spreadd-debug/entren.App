import { supabase } from "../db/supabase";
import type {
  RoutineV2,
  RoutineDay,
  RoutineBlock,
  RoutineExercise,
  RoutineSet,
  RoutineAssignment,
  RoutineDayDraft,
  RoutineBlockDraft,
  RoutineExerciseDraft,
  RoutineSetDraft,
  BlockType,
} from "../../shared/types";

// ─── Routines ────────────────────────────────────────────────────────────────

export const RoutineBuilderService = {
  async getRoutines(gymId: string): Promise<RoutineV2[]> {
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("gym_id", gymId)
      .eq("is_template", false)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getTemplates(gymId: string): Promise<RoutineV2[]> {
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("gym_id", gymId)
      .eq("is_template", true)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createRoutine(gymId: string, name: string, description?: string): Promise<RoutineV2> {
    const { data, error } = await supabase
      .from("routines")
      .insert({ gym_id: gymId, name, description: description || null })
      .select()
      .single();
    if (error) throw error;

    // Create a default day
    await supabase.from("routine_days").insert({
      routine_id: data.id,
      label: "Día 1",
      order: 0,
    });

    return data;
  },

  async updateRoutine(
    routineId: string,
    updates: { name?: string; description?: string | null; is_template?: boolean }
  ): Promise<RoutineV2> {
    const { data, error } = await supabase
      .from("routines")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", routineId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRoutine(routineId: string): Promise<void> {
    const { error } = await supabase.from("routines").delete().eq("id", routineId);
    if (error) throw error;
  },

  // ─── Load full routine (all nested data) ─────────────────────────────────

  async loadFullRoutine(routineId: string): Promise<{
    routine: RoutineV2;
    days: (RoutineDay & { blocks: (RoutineBlock & { exercises: (RoutineExercise & { sets: RoutineSet[] })[] })[] })[];
  }> {
    const { data: routine, error: rErr } = await supabase
      .from("routines")
      .select("*")
      .eq("id", routineId)
      .single();
    if (rErr) throw rErr;

    const { data: days, error: dErr } = await supabase
      .from("routine_days")
      .select("*")
      .eq("routine_id", routineId)
      .order("order");
    if (dErr) throw dErr;

    const dayIds = (days || []).map((d: RoutineDay) => d.id);
    if (dayIds.length === 0) {
      return { routine, days: [] };
    }

    const { data: blocks, error: bErr } = await supabase
      .from("routine_blocks")
      .select("*")
      .in("routine_day_id", dayIds)
      .order("order");
    if (bErr) throw bErr;

    const blockIds = (blocks || []).map((b: RoutineBlock) => b.id);
    if (blockIds.length === 0) {
      return {
        routine,
        days: (days || []).map((d: RoutineDay) => ({ ...d, blocks: [] })),
      };
    }

    const { data: exercises, error: eErr } = await supabase
      .from("routine_exercises")
      .select("*")
      .in("block_id", blockIds)
      .order("order");
    if (eErr) throw eErr;

    const exerciseIds = (exercises || []).map((e: RoutineExercise) => e.id);
    let sets: RoutineSet[] = [];
    if (exerciseIds.length > 0) {
      const { data: setsData, error: sErr } = await supabase
        .from("routine_sets")
        .select("*")
        .in("routine_exercise_id", exerciseIds)
        .order("set_number");
      if (sErr) throw sErr;
      sets = setsData || [];
    }

    // Nest everything
    const setsMap = new Map<string, RoutineSet[]>();
    for (const s of sets) {
      const arr = setsMap.get(s.routine_exercise_id) || [];
      arr.push(s);
      setsMap.set(s.routine_exercise_id, arr);
    }

    const exMap = new Map<string, (RoutineExercise & { sets: RoutineSet[] })[]>();
    for (const e of exercises || []) {
      const arr = exMap.get(e.block_id) || [];
      arr.push({ ...e, sets: setsMap.get(e.id) || [] });
      exMap.set(e.block_id, arr);
    }

    const blockMap = new Map<string, (RoutineBlock & { exercises: (RoutineExercise & { sets: RoutineSet[] })[] })[]>();
    for (const b of blocks || []) {
      const arr = blockMap.get(b.routine_day_id) || [];
      arr.push({ ...b, exercises: exMap.get(b.id) || [] });
      blockMap.set(b.routine_day_id, arr);
    }

    return {
      routine,
      days: (days || []).map((d: RoutineDay) => ({
        ...d,
        blocks: blockMap.get(d.id) || [],
      })),
    };
  },

  // ─── Save full day (bulk upsert) ─────────────────────────────────────────

  async saveDay(routineId: string, day: RoutineDayDraft): Promise<void> {
    // Upsert the day
    const { data: savedDay, error: dErr } = await supabase
      .from("routine_days")
      .upsert({ id: day.id, routine_id: routineId, label: day.label, order: day.order })
      .select()
      .single();
    if (dErr) throw dErr;

    const dayId = savedDay.id;

    // Get existing block IDs to find deletions
    const { data: existingBlocks } = await supabase
      .from("routine_blocks")
      .select("id")
      .eq("routine_day_id", dayId);

    const existingBlockIds = new Set((existingBlocks || []).map((b: { id: string }) => b.id));
    const newBlockIds = new Set(day.blocks.map((b) => b.id));

    // Delete removed blocks (cascade deletes exercises and sets)
    const blocksToDelete = [...existingBlockIds].filter((id) => !newBlockIds.has(id));
    if (blocksToDelete.length > 0) {
      await supabase.from("routine_blocks").delete().in("id", blocksToDelete);
    }

    // Upsert blocks, exercises, and sets
    for (const block of day.blocks) {
      const { data: savedBlock, error: bErr } = await supabase
        .from("routine_blocks")
        .upsert({
          id: block.id,
          routine_day_id: dayId,
          block_type: block.block_type,
          order: block.order,
          rest_after_block_sec: block.rest_after_block_sec,
        })
        .select()
        .single();
      if (bErr) throw bErr;

      const blockId = savedBlock.id;

      // Get existing exercise IDs
      const { data: existingExercises } = await supabase
        .from("routine_exercises")
        .select("id")
        .eq("block_id", blockId);

      const existingExIds = new Set((existingExercises || []).map((e: { id: string }) => e.id));
      const newExIds = new Set(block.exercises.map((e) => e.id));
      const exToDelete = [...existingExIds].filter((id) => !newExIds.has(id));
      if (exToDelete.length > 0) {
        await supabase.from("routine_exercises").delete().in("id", exToDelete);
      }

      for (const ex of block.exercises) {
        const { data: savedEx, error: eErr } = await supabase
          .from("routine_exercises")
          .upsert({
            id: ex.id,
            block_id: blockId,
            exercise_library_id: ex.exercise_library_id,
            exercise_name: ex.exercise_name,
            order: ex.order,
            notes: ex.notes,
            rest_between_sets_sec: ex.rest_between_sets_sec,
            tempo: ex.tempo,
          })
          .select()
          .single();
        if (eErr) throw eErr;

        const exId = savedEx.id;

        // Delete all existing sets and re-insert (simpler than diffing)
        await supabase.from("routine_sets").delete().eq("routine_exercise_id", exId);

        if (ex.sets.length > 0) {
          const setsToInsert = ex.sets.map((s) => ({
            routine_exercise_id: exId,
            set_number: s.set_number,
            set_type: s.set_type,
            reps: s.reps,
            reps_max: s.reps_max,
            time_sec: s.time_sec,
            weight_kg: s.weight_kg,
            weight_type: s.weight_type,
            rpe_target: s.rpe_target,
            rir_target: s.rir_target,
            notes: s.notes,
          }));
          const { error: sErr } = await supabase.from("routine_sets").insert(setsToInsert);
          if (sErr) throw sErr;
        }
      }
    }

    // Touch routine updated_at
    await supabase
      .from("routines")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", routineId);
  },

  // ─── Days CRUD ────────────────────────────────────────────────────────────

  async addDay(routineId: string, label: string, order: number): Promise<RoutineDay> {
    const { data, error } = await supabase
      .from("routine_days")
      .insert({ routine_id: routineId, label, order })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteDay(dayId: string): Promise<void> {
    const { error } = await supabase.from("routine_days").delete().eq("id", dayId);
    if (error) throw error;
  },

  // ─── Clone routine ────────────────────────────────────────────────────────

  async cloneRoutine(routineId: string, newName: string, gymId: string): Promise<string> {
    const full = await this.loadFullRoutine(routineId);

    const { data: newRoutine, error } = await supabase
      .from("routines")
      .insert({
        gym_id: gymId,
        name: newName,
        description: full.routine.description,
        is_template: false,
      })
      .select()
      .single();
    if (error) throw error;

    for (const day of full.days) {
      const { data: newDay } = await supabase
        .from("routine_days")
        .insert({ routine_id: newRoutine.id, label: day.label, order: day.order })
        .select()
        .single();
      if (!newDay) continue;

      for (const block of day.blocks) {
        const { data: newBlock } = await supabase
          .from("routine_blocks")
          .insert({
            routine_day_id: newDay.id,
            block_type: block.block_type,
            order: block.order,
            rest_after_block_sec: block.rest_after_block_sec,
          })
          .select()
          .single();
        if (!newBlock) continue;

        for (const ex of block.exercises) {
          const { data: newEx } = await supabase
            .from("routine_exercises")
            .insert({
              block_id: newBlock.id,
              exercise_library_id: ex.exercise_library_id,
              exercise_name: ex.exercise_name,
              order: ex.order,
              notes: ex.notes,
              rest_between_sets_sec: ex.rest_between_sets_sec,
              tempo: ex.tempo,
            })
            .select()
            .single();
          if (!newEx) continue;

          if (ex.sets.length > 0) {
            await supabase.from("routine_sets").insert(
              ex.sets.map((s) => ({
                routine_exercise_id: newEx.id,
                set_number: s.set_number,
                set_type: s.set_type,
                reps: s.reps,
                reps_max: s.reps_max,
                time_sec: s.time_sec,
                weight_kg: s.weight_kg,
                weight_type: s.weight_type,
                rpe_target: s.rpe_target,
                rir_target: s.rir_target,
                notes: s.notes,
              }))
            );
          }
        }
      }
    }

    return newRoutine.id;
  },

  // ─── Assignments ──────────────────────────────────────────────────────────

  async getAssignmentsForRoutine(routineId: string): Promise<RoutineAssignment[]> {
    const { data, error } = await supabase
      .from("routine_assignments")
      .select("*")
      .eq("routine_id", routineId)
      .eq("active", true);
    if (error) throw error;
    return data || [];
  },

  async getAssignmentsForStudent(studentId: string): Promise<(RoutineAssignment & { routine_name: string })[]> {
    const { data, error } = await supabase
      .from("routine_assignments")
      .select("*, routines(name)")
      .eq("student_id", studentId)
      .eq("active", true)
      .order("assigned_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      routine_name: r.routines?.name ?? "",
    }));
  },

  async assignRoutine(
    routineId: string,
    studentId: string,
    dayMapping: Record<string, string> = {}
  ): Promise<void> {
    const { error } = await supabase.from("routine_assignments").insert({
      routine_id: routineId,
      student_id: studentId,
      day_mapping: dayMapping,
      active: true,
    });
    if (error) throw error;
  },

  async removeAssignment(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from("routine_assignments")
      .update({ active: false })
      .eq("id", assignmentId);
    if (error) throw error;
  },

  // ─── Exercise library helpers ─────────────────────────────────────────────

  async searchExercises(query: string, muscleGroup?: string): Promise<any[]> {
    let q = supabase.from("exercise_library").select("*").order("name");
    if (muscleGroup) {
      q = q.eq("muscle_group", muscleGroup);
    }
    if (query.trim()) {
      q = q.ilike("name", `%${query.trim()}%`);
    }
    const { data, error } = await q.limit(50);
    if (error) throw error;
    return data || [];
  },

  // ─── Stats helpers ────────────────────────────────────────────────────────

  async getRoutineAssignmentCount(routineId: string): Promise<number> {
    const { count, error } = await supabase
      .from("routine_assignments")
      .select("id", { count: "exact", head: true })
      .eq("routine_id", routineId)
      .eq("active", true);
    if (error) return 0;
    return count || 0;
  },

  async getRoutineExerciseCount(routineId: string): Promise<number> {
    const { data: days } = await supabase
      .from("routine_days")
      .select("id")
      .eq("routine_id", routineId);
    if (!days || days.length === 0) return 0;

    const { data: blocks } = await supabase
      .from("routine_blocks")
      .select("id")
      .in("routine_day_id", days.map((d: { id: string }) => d.id));
    if (!blocks || blocks.length === 0) return 0;

    const { count, error } = await supabase
      .from("routine_exercises")
      .select("id", { count: "exact", head: true })
      .in("block_id", blocks.map((b: { id: string }) => b.id));
    if (error) return 0;
    return count || 0;
  },
};
