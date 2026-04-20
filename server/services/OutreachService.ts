import { supabase } from '../db/supabase';
import { OutreachDailyLog, OutreachDailyLogInput } from '../../shared/types';

const TABLE = 'outreach_daily_logs';

function mapRow(row: any): OutreachDailyLog {
  return {
    id: row.id,
    date: row.date,
    messages_sent: Number(row.messages_sent ?? 0),
    replies_received: Number(row.replies_received ?? 0),
    conversations_started: Number(row.conversations_started ?? 0),
    demos_scheduled: Number(row.demos_scheduled ?? 0),
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const OutreachService = {
  async getRange(from?: string, to?: string): Promise<OutreachDailyLog[]> {
    let q = supabase.from(TABLE).select('*').order('date', { ascending: false });
    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async getByDate(date: string): Promise<OutreachDailyLog | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('date', date)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  },

  async upsertDay(date: string, input: OutreachDailyLogInput): Promise<OutreachDailyLog> {
    const payload = {
      date,
      messages_sent: Math.max(0, Math.floor(Number(input.messages_sent ?? 0))),
      replies_received: Math.max(0, Math.floor(Number(input.replies_received ?? 0))),
      conversations_started: Math.max(0, Math.floor(Number(input.conversations_started ?? 0))),
      demos_scheduled: Math.max(0, Math.floor(Number(input.demos_scheduled ?? 0))),
      notes: input.notes ?? null,
    };
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'date' })
      .select('*')
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async deleteDay(date: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('date', date);
    if (error) throw error;
  },
};
