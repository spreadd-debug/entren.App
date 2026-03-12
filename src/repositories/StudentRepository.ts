import { supabase } from "../db/supabase"
import { CURRENT_GYM_ID } from "../config/gym"

export const StudentRepository = {

  async getAll() {

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("gym_id", CURRENT_GYM_ID)

    if (error) throw error

    return data ?? []

  },

  async create(student: any) {

    const { data, error } = await supabase
      .from("students")
      .insert({
        ...student,
        gym_id: CURRENT_GYM_ID
      })
      .select()
      .single()

    if (error) throw error

    return data

  },

  async update(id: string, updates: any) {

    const { data, error } = await supabase
      .from("students")
      .update(updates)
      .eq("id", id)
      .eq("gym_id", CURRENT_GYM_ID)
      .select()
      .single()

    if (error) throw error

    return data

  }

}