
import React, { useState } from 'react';
import { ArrowLeft, Clock, MessageSquare, History, CheckCircle, XCircle, AlertCircle, ChevronRight, Play, Settings, Lock } from 'lucide-react';
import { Card, Button, Input } from '../components/UI';
import { ReminderRule, MessageTemplate, ReminderLog, AutomationStatus, GymSubscription } from '../../shared/types';
import { formatDate } from '../utils/dateUtils';
import { hasPlanFeature } from '../utils/subscriptionAccess';

interface AutomationViewProps {
  rules: ReminderRule[];
  templates: MessageTemplate[];
  logs: ReminderLog[];
  status: AutomationStatus | null;
  subscription: GymSubscription | null;
  onBack: () => void;
  onRunAutomation: () => Promise<any>;
  onUpdateRule: (rule: ReminderRule) => void;
  onUpdateTemplate: (template: MessageTemplate) => void;
}

export const AutomationView: React.FC<AutomationViewProps> = ({
  rules,
  templates,
  logs,
  status,
  subscription,
  onBack,
  onRunAutomation,
  onUpdateRule,
  onUpdateTemplate
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'templates' | 'logs'>('rules');

  if (!hasPlanFeature(subscription, 'whatsapp_reminders')) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-xl font-bold text-slate-900">Automatización WA</h2>
        </div>
        <Card className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Lock size={26} className="text-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <p className="font-black text-slate-900 text-base">Requiere Plan Pro o Business</p>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Los recordatorios automáticos por WhatsApp están disponibles a partir del plan Pro.
              Actualizá tu plan para activar esta funcionalidad.
            </p>
          </div>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-black rounded-full uppercase tracking-wide">
            Pro · Business
          </span>
        </Card>
      </div>
    );
  }
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const pendingCount = logs.filter(l => l.status === 'pending').length;
  const sentCount = logs.filter(l => l.status === 'sent' || l.status === 'delivered' || l.status === 'read').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-xl font-bold text-slate-900">Automatización WA</h2>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-indigo-50 border-indigo-100">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Última Ejecución</p>
          <p className="text-sm font-black text-indigo-900">
            {status?.lastRun ? formatDate(status.lastRun) : 'Nunca'}
          </p>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-100">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Próxima (Est.)</p>
          <p className="text-sm font-black text-slate-900">
            {status?.nextRun ? formatDate(status.nextRun) : 'No programada'}
          </p>
        </Card>
      </div>

      {/* Manual Trigger & Last Result */}
      <Card className="p-5 space-y-4 border-dashed border-2 border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Ejecución Manual</h4>
            <p className="text-[10px] text-slate-500">Solo para pruebas y administración</p>
          </div>
          <Button 
            size="sm" 
            className="gap-2" 
            onClick={async () => {
              setIsRunning(true);
              const res = await onRunAutomation();
              setLastResult(res);
              setIsRunning(false);
            }}
            disabled={isRunning}
          >
            <Play size={14} fill="currentColor" />
            {isRunning ? 'Ejecutando...' : 'Ejecutar Ahora'}
          </Button>
        </div>

        {(lastResult || status?.lastResult) && (
          <div className="pt-3 border-t border-slate-200 grid grid-cols-4 gap-2 text-center">
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Eval.</p>
              <p className="text-xs font-black text-slate-900">{(lastResult || status?.lastResult).totalEvaluated}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Elig.</p>
              <p className="text-xs font-black text-slate-900">{(lastResult || status?.lastResult).totalEligible}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold text-emerald-500 uppercase">Gen.</p>
              <p className="text-xs font-black text-emerald-600">{(lastResult || status?.lastResult).totalGenerated}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Ignor.</p>
              <p className="text-xs font-black text-slate-900">{(lastResult || status?.lastResult).totalIgnored}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'rules' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Reglas
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'templates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'logs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Historial
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.map(rule => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${rule.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{rule.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">
                      {rule.triggerType === 'before' ? `${rule.offsetDays} días antes` : 
                       rule.triggerType === 'after' ? `${rule.offsetDays} días después` : 'Mismo día'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onUpdateRule({ ...rule, active: !rule.active })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${rule.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${rule.active ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {templates.map(template => (
            <Card key={template.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-indigo-500" />
                  <p className="font-bold text-slate-900">{template.title}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(template)}>
                  Editar
                </Button>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-600 leading-relaxed italic">"{template.body}"</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold whitespace-nowrap">Todos</span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-bold whitespace-nowrap">Enviados ({sentCount})</span>
            <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-bold whitespace-nowrap">Pendientes ({pendingCount})</span>
            <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[10px] font-bold whitespace-nowrap">Fallidos ({failedCount})</span>
          </div>

          <div className="space-y-3">
            {logs.length > 0 ? logs.map(log => (
              <Card key={log.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className={`mt-1 p-1.5 rounded-lg ${
                      log.status === 'sent' || log.status === 'delivered' || log.status === 'read' ? 'bg-emerald-50 text-emerald-600' :
                      log.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {log.status === 'sent' || log.status === 'delivered' || log.status === 'read' ? <CheckCircle size={14} /> :
                       log.status === 'pending' ? <Clock size={14} /> : <XCircle size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Regla: {log.ruleCode}</p>
                      <p className="text-[10px] text-slate-500">{log.sentAt ? formatDate(log.sentAt) : `Programado: ${log.scheduledFor}`}</p>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">"{log.messagePreview}"</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      log.status === 'sent' || log.status === 'delivered' || log.status === 'read' ? 'bg-emerald-100 text-emerald-700' :
                      log.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              </Card>
            )) : (
              <div className="text-center py-10">
                <History size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm">No hay registros de envíos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Editar Template</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Título</label>
              <Input 
                value={editingTemplate.title} 
                onChange={(e) => setEditingTemplate({...editingTemplate, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Cuerpo del Mensaje</label>
              <textarea 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 min-h-[120px]"
                value={editingTemplate.body}
                onChange={(e) => setEditingTemplate({...editingTemplate, body: e.target.value})}
              />
              <p className="text-[10px] text-slate-400 italic">
                Variables: {'{nombre}'}, {'{apellido}'}, {'{plan}'}, {'{fecha_vencimiento}'}, {'{dias_atraso}'}, {'{precio}'}, {'{gimnasio}'}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth onClick={() => setEditingTemplate(null)}>Cancelar</Button>
              <Button fullWidth onClick={() => {
                onUpdateTemplate(editingTemplate);
                setEditingTemplate(null);
              }}>Guardar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
