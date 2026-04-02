import { supabase } from '../../db/supabase';
import type { AIAnalysis } from '../../../shared/types';

export const AIAnalysisService = {

  async getByStudent(studentId: string, limit = 5): Promise<AIAnalysis[]> {
    const { data, error } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as AIAnalysis[];
  },

  async getLatest(studentId: string): Promise<AIAnalysis | null> {
    const { data, error } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as AIAnalysis) ?? null;
  },

  async getBySession(sessionId: string): Promise<AIAnalysis | null> {
    const { data, error } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('session_id', sessionId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as AIAnalysis) ?? null;
  },

  async create(params: {
    gym_id: string;
    student_id: string;
    session_id?: string;
    analysis_type: 'post_session' | 'weekly_review';
    content: string;
    model_used: string;
    tokens_used: number;
  }): Promise<AIAnalysis> {
    const { data, error } = await supabase
      .from('ai_analyses')
      .insert([{
        gym_id: params.gym_id,
        student_id: params.student_id,
        session_id: params.session_id ?? null,
        analysis_type: params.analysis_type,
        content: params.content,
        model_used: params.model_used,
        tokens_used: params.tokens_used,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as AIAnalysis;
  },

  async countThisWeek(studentId: string): Promise<number> {
    // Get Monday of current week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('ai_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', monday.toISOString());

    if (error) throw error;
    return count ?? 0;
  },

  /** Trigger AI analysis via backend (calls Claude API server-side) */
  async requestAnalysis(gymId: string, studentId: string, sessionId?: string): Promise<AIAnalysis> {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gymId, studentId, sessionId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error ?? `Error ${res.status}`);
    }

    return await res.json() as AIAnalysis;
  },
};
