import React, { useEffect, useState } from 'react';
import { Plus, Trash2, FileText, AlertTriangle, Apple, Heart, MoreHorizontal } from 'lucide-react';
import { Card, Button } from '../UI';
import { SessionNotesService } from '../../services/pt/SessionNotesService';
import { SessionNote, NoteCategory } from '../../../shared/types';
import { useToast } from '../../context/ToastContext';

interface SessionNotesPanelProps {
  studentId: string;
  gymId: string;
}

const CATEGORIES: { value: NoteCategory; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'progress', label: 'Progreso', icon: FileText, color: 'text-emerald-500' },
  { value: 'injury', label: 'Lesión', icon: AlertTriangle, color: 'text-rose-500' },
  { value: 'nutrition', label: 'Nutrición', icon: Apple, color: 'text-amber-500' },
  { value: 'motivation', label: 'Motivación', icon: Heart, color: 'text-pink-500' },
  { value: 'other', label: 'Otro', icon: MoreHorizontal, color: 'text-slate-400' },
];

export const SessionNotesPanel: React.FC<SessionNotesPanelProps> = ({ studentId, gymId }) => {
  const toast = useToast();
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    content: '',
    category: 'progress' as NoteCategory,
    note_date: new Date().toISOString().split('T')[0],
  });

  const load = async () => {
    setLoading(true);
    try {
      setNotes(await SessionNotesService.getByStudent(studentId));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [studentId]);

  const handleSave = async () => {
    if (!form.content.trim()) {
      toast.error('Escribí una nota');
      return;
    }
    setSaving(true);
    try {
      await SessionNotesService.create({
        gym_id: gymId,
        student_id: studentId,
        content: form.content.trim(),
        category: form.category,
        note_date: form.note_date,
      });
      toast.success('Nota guardada');
      setForm({ content: '', category: 'progress', note_date: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await SessionNotesService.delete(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <div className="space-y-4">
      {/* Add */}
      {!showForm ? (
        <Button variant="outline" fullWidth onClick={() => setShowForm(true)}>
          <Plus size={15} className="inline mr-1" />
          Nueva nota
        </Button>
      ) : (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-500/30">
          <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">Nueva nota</h4>
          <input
            type="date"
            className="w-full px-4 h-12 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
            value={form.note_date}
            onChange={e => setForm({ ...form, note_date: e.target.value })}
          />
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm({ ...form, category: cat.value })}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  form.category === cat.value
                    ? 'bg-violet-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <cat.icon size={12} />
                {cat.label}
              </button>
            ))}
          </div>
          <textarea
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            rows={3}
            placeholder="Escribí tu nota acá..."
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
          />
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="secondary" fullWidth onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </Card>
      )}

      {/* Notes list */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-4">Cargando notas...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sin notas registradas</p>
      ) : (
        <div className="space-y-2">
          {notes.map(note => {
            const cat = CATEGORIES.find(c => c.value === note.category) ?? CATEGORIES[4];
            const CatIcon = cat.icon;
            return (
              <Card key={note.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 ${cat.color} shrink-0 mt-0.5`}>
                    <CatIcon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        {new Date(note.note_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                      <span className={`text-[9px] font-bold uppercase ${cat.color}`}>{cat.label}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
