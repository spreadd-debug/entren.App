
import { Student, ReminderRule, MessageTemplate, ReminderLog, Plan } from '../types';
import { WhatsAppProvider } from './whatsappProvider';

export interface ReminderCheckResult {
  totalEvaluated: number;
  totalEligible: number;
  totalGenerated: number;
  totalIgnored: number;
  logs: ReminderLog[];
}

export const BillingReminderService = {
  /**
   * Evaluates all students and generates reminders based on rules
   */
  runDailyReminderCheck: (
    students: Student[],
    rules: ReminderRule[],
    templates: MessageTemplate[],
    existingLogs: ReminderLog[],
    plans: Plan[],
    gymName: string = "Gimnasio Pro"
  ): ReminderCheckResult => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    
    let totalEvaluated = 0;
    let totalEligible = 0;
    let totalGenerated = 0;
    let totalIgnored = 0;
    const newLogs: ReminderLog[] = [];

    students.forEach(student => {
      totalEvaluated++;

      // 1. Basic Eligibility Rules
      const isEligible = 
        student.status === 'active' || student.status === 'expiring' || student.status === 'expired' &&
        student.cobra_cuota &&
        student.recordatorio_automatico &&
        student.whatsapp_opt_in &&
        student.phone &&
        student.nextDueDate;

      if (!isEligible) {
        totalIgnored++;
        return;
      }

      totalEligible++;

      // 2. Evaluate each active rule
      rules.filter(r => r.active).forEach(rule => {
        const dueDate = new Date(student.nextDueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let shouldTrigger = false;

        if (rule.triggerType === 'before' && diffDays === rule.offsetDays) {
          shouldTrigger = true;
        } else if (rule.triggerType === 'on_day' && diffDays === 0) {
          shouldTrigger = true;
        } else if (rule.triggerType === 'after' && diffDays === -rule.offsetDays) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          // 3. Check for duplicates (same student, same rule, same due date)
          // We use scheduledFor to store the date the reminder was intended for
          const alreadySent = existingLogs.some(log => 
            log.studentId === student.id && 
            log.ruleCode === rule.code && 
            log.scheduledFor === todayStr
          );

          if (!alreadySent) {
            const template = templates.find(t => t.code === rule.code && t.active);
            if (template) {
              const plan = plans.find(p => p.id === student.planId);
              const message = BillingReminderService.formatMessage(template.body, student, plan, gymName);
              
              const log: ReminderLog = {
                id: `log-${Date.now()}-${student.id}-${rule.code}`,
                studentId: student.id,
                ruleCode: rule.code,
                scheduledFor: todayStr,
                status: 'pending',
                channel: 'whatsapp',
                messagePreview: message
              };
              
              newLogs.push(log);
              totalGenerated++;
            }
          }
        }
      });
    });

    return {
      totalEvaluated,
      totalEligible,
      totalGenerated,
      totalIgnored,
      logs: newLogs
    };
  },

  /**
   * Replaces variables in template body
   */
  formatMessage: (body: string, student: Student, plan?: Plan, gymName: string = "Gimnasio Pro"): string => {
    const dueDate = new Date(student.nextDueDate);
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    const variables: Record<string, string> = {
      '{nombre}': student.name,
      '{apellido}': student.apellido || '',
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
