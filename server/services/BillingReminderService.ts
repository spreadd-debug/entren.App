
import { supabase } from '../db/supabase';
import { Student, ReminderRule, MessageTemplate, ReminderLog, Plan } from '../../shared/types';
import { StudentService } from './StudentService';
import { PlanService } from './PlanService';

export const BillingReminderService = {
  async getRules(gymId: string): Promise<ReminderRule[]> {
    const { data, error } = await supabase
      .from('reminder_rules')
      .select('*')
      .eq('gym_id', gymId);
    if (error) throw error;
    return data || [];
  },

  async getTemplates(gymId: string): Promise<MessageTemplate[]> {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('gym_id', gymId);
    if (error) throw error;
    return data || [];
  },

  async getLogs(gymId: string): Promise<ReminderLog[]> {
    const { data, error } = await supabase
      .from('reminder_logs')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async runDailyCheck(gymId: string): Promise<any> {
    const students = await StudentService.getAll(gymId);
    const rules = await this.getRules(gymId);
    const templates = await this.getTemplates(gymId);
    const plans = await PlanService.getAll(gymId);
    const logs = await this.getLogs(gymId);

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    let totalEvaluated = 0;
    let totalEligible = 0;
    let totalGenerated = 0;
    let totalIgnored = 0;
    const newLogs: ReminderLog[] = [];

    for (const student of students) {
      totalEvaluated++;

      const isEligible = 
        (student.status === 'active' || student.status === 'expiring' || student.status === 'expired') &&
        student.cobra_cuota &&
        student.recordatorio_automatico &&
        student.whatsapp_opt_in &&
        student.phone &&
        student.nextDueDate;

      if (!isEligible) {
        totalIgnored++;
        continue;
      }

      totalEligible++;

      for (const rule of rules.filter(r => r.active)) {
        const dueDate = new Date(student.nextDueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let shouldTrigger = false;
        if (rule.triggerType === 'before' && diffDays === rule.offsetDays) shouldTrigger = true;
        else if (rule.triggerType === 'on_day' && diffDays === 0) shouldTrigger = true;
        else if (rule.triggerType === 'after' && diffDays === -rule.offsetDays) shouldTrigger = true;

        if (shouldTrigger) {
          const alreadySent = logs.some(log => 
            log.studentId === student.id && 
            log.ruleCode === rule.code && 
            log.scheduledFor === todayStr
          );

          if (!alreadySent) {
            const template = templates.find(t => t.code === rule.code && t.active);
            if (template) {
              const plan = plans.find(p => p.id === student.planId);
              const message = this.formatMessage(template.body, student, plan, "Gimnasio Pro");
              
              const log: Partial<ReminderLog> = {
                gym_id: gymId,
                studentId: student.id,
                ruleCode: rule.code,
                scheduledFor: todayStr,
                status: 'pending',
                channel: 'whatsapp',
                messagePreview: message
              };
              
              const { data: savedLog, error: logError } = await supabase
                .from('reminder_logs')
                .insert([log])
                .select()
                .single();

              if (!logError && savedLog) {
                newLogs.push(savedLog);
                totalGenerated++;
              }
            }
          }
        }
      }
    }

    return {
      totalEvaluated,
      totalEligible,
      totalGenerated,
      totalIgnored,
      newLogs
    };
  },

  formatMessage(body: string, student: Student, plan?: Plan, gymName: string = "Gimnasio Pro"): string {
    const dueDate = new Date(student.nextDueDate);
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    const variables: Record<string, string> = {
      '{nombre}': student.name,
      '{apellido}': student.apellido || student.lastName || '',
      '{plan}': plan?.name || student.planName || '',
      '{fecha_vencimiento}': student.nextDueDate,
      '{dias_atraso}': diffDays.toString(),
      '{precio}': (student.precio_personalizado || plan?.price || 0).toString(),
      '{gimnasio}': gymName
    };

    let formatted = body;
    Object.entries(variables).forEach(([key, value]) => {
      formatted = formatted.replace(new RegExp(key, 'g'), value);
    });

    return formatted;
  }
};
