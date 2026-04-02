import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Camera, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { Card, Button, Input } from '../UI';
import { ProgressPhotosService } from '../../services/pt/ProgressPhotosService';
import { ProgressPhoto, PhotoAngle } from '../../../shared/types';
import { useToast } from '../../context/ToastContext';

interface ProgressPhotosPanelProps {
  studentId: string;
  gymId: string;
}

const ANGLE_LABELS: Record<PhotoAngle, string> = {
  front: 'Frente',
  side_left: 'Lateral izq.',
  side_right: 'Lateral der.',
  back: 'Espalda',
};

const ANGLES: PhotoAngle[] = ['front', 'side_left', 'side_right', 'back'];

export const ProgressPhotosPanel: React.FC<ProgressPhotosPanelProps> = ({ studentId, gymId }) => {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<PhotoAngle>('front');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Comparator state
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<ProgressPhoto | null>(null);
  const [compareB, setCompareB] = useState<ProgressPhoto | null>(null);

  // Fullscreen viewer
  const [fullscreenPhoto, setFullscreenPhoto] = useState<ProgressPhoto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setPhotos(await ProgressPhotosService.getByStudent(studentId));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [studentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Seleccioná una foto');
      return;
    }
    setUploading(true);
    try {
      await ProgressPhotosService.upload({
        gymId,
        studentId,
        file: selectedFile,
        angle,
        photoDate,
        notes,
      });
      toast.success('Foto guardada');
      resetForm();
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al subir la foto');
    }
    setUploading(false);
  };

  const handleDelete = async (photo: ProgressPhoto) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;
    try {
      await ProgressPhotosService.delete(photo);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      if (compareA?.id === photo.id) setCompareA(null);
      if (compareB?.id === photo.id) setCompareB(null);
      toast.success('Foto eliminada');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedFile(null);
    setPreview(null);
    setAngle('front');
    setPhotoDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCompareSelect = (photo: ProgressPhoto) => {
    if (!compareA) {
      setCompareA(photo);
    } else if (compareA.id === photo.id) {
      setCompareA(null);
    } else if (!compareB) {
      setCompareB(photo);
    } else if (compareB.id === photo.id) {
      setCompareB(null);
    } else {
      setCompareB(photo);
    }
  };

  // Group photos by date
  const groupedByDate = photos.reduce<Record<string, ProgressPhoto[]>>((acc, p) => {
    const date = p.photo_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(p);
    return acc;
  }, {});

  const dates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* Compare mode */}
      {photos.length >= 2 && (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Fotos de progreso
          </h4>
          <button
            onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null); }}
            className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${
              compareMode
                ? 'bg-violet-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-violet-500'
            }`}
          >
            {compareMode ? 'Salir de comparar' : 'Comparar'}
          </button>
        </div>
      )}

      {/* Compare selection hint */}
      {compareMode && !(compareA && compareB) && (
        <Card className="p-3 border-violet-200 dark:border-violet-500/30">
          <p className="text-xs text-slate-400 text-center py-2">
            {!compareA
              ? 'Seleccioná la primera foto (antes)'
              : 'Ahora seleccioná la segunda foto (después)'}
          </p>
        </Card>
      )}

      {/* Upload form */}
      {!showForm ? (
        <Button variant="outline" fullWidth onClick={() => setShowForm(true)}>
          <Camera size={15} className="inline mr-1" />
          Subir foto de progreso
        </Button>
      ) : (
        <Card className="p-4 space-y-3 border-violet-200 dark:border-violet-500/30 md:max-w-md">
          <h4 className="text-xs font-black text-violet-500 uppercase tracking-wider">Nueva foto</h4>

          {/* File input + preview */}
          {preview ? (
            <div className="relative max-w-xs mx-auto">
              <img src={preview} alt="Preview" className="w-full aspect-[3/4] object-cover rounded-xl" />
              <button
                onClick={() => { setPreview(null); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[4/3] md:aspect-[3/2] rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 flex flex-col items-center justify-center gap-2 hover:border-violet-400 transition-colors"
            >
              <Camera size={32} className="text-slate-300 dark:text-slate-600" />
              <span className="text-sm text-slate-400">Tocá para seleccionar foto</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Angle selector */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Ángulo</p>
            <div className="grid grid-cols-4 gap-1.5">
              {ANGLES.map(a => (
                <button
                  key={a}
                  onClick={() => setAngle(a)}
                  className={`py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                    angle === a
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-violet-500'
                  }`}
                >
                  {ANGLE_LABELS[a]}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <Input type="date" value={photoDate} onChange={e => setPhotoDate(e.target.value)} />

          {/* Notes */}
          <textarea
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            rows={2}
            placeholder="Notas (opcional)..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={resetForm}>
              Cancelar
            </Button>
            <Button variant="secondary" fullWidth onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading ? 'Subiendo...' : 'Guardar'}
            </Button>
          </div>
        </Card>
      )}

      {/* Photo gallery by date */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-4">Cargando fotos...</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sin fotos de progreso</p>
      ) : (
        <div className="space-y-4">
          {dates.map(date => (
            <div key={date}>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                {new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {groupedByDate[date].map(photo => {
                  const isSelectedA = compareA?.id === photo.id;
                  const isSelectedB = compareB?.id === photo.id;
                  const isCompareSelected = isSelectedA || isSelectedB;

                  return (
                    <div
                      key={photo.id}
                      className={`relative group rounded-xl overflow-hidden ${
                        compareMode ? 'cursor-pointer' : ''
                      } ${isCompareSelected ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
                      onClick={compareMode ? () => handleCompareSelect(photo) : undefined}
                    >
                      <img
                        src={photo.photo_url}
                        alt={ANGLE_LABELS[photo.angle]}
                        className="w-full aspect-[3/4] object-cover"
                      />

                      {/* Angle badge */}
                      <span className="absolute top-1.5 left-1.5 text-[8px] font-bold bg-black/50 text-white px-2 py-0.5 rounded-full">
                        {ANGLE_LABELS[photo.angle]}
                      </span>

                      {/* Compare selection badge */}
                      {isCompareSelected && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-violet-500 text-white w-5 h-5 rounded-full flex items-center justify-center">
                          {isSelectedA ? '1' : '2'}
                        </span>
                      )}

                      {/* Action buttons (not in compare mode) */}
                      {!compareMode && (
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent md:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                          <button
                            onClick={() => setFullscreenPhoto(photo)}
                            className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30"
                          >
                            <Maximize2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(photo)}
                            className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-rose-500/80"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}

                      {/* Notes */}
                      {photo.notes && !compareMode && (
                        <p className="absolute bottom-0 left-0 right-0 text-[9px] text-white bg-black/40 px-2 py-1 truncate group-hover:hidden">
                          {photo.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen comparator */}
      {compareA && compareB && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-[fadeIn_0.3s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80">
            <h3 className="text-white text-sm font-bold">Comparativa</h3>
            <button
              onClick={() => { setCompareA(null); setCompareB(null); setCompareMode(false); }}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X size={18} />
            </button>
          </div>

          {/* Photos side by side */}
          <div className="flex-1 flex flex-col overflow-hidden items-center justify-center">
            <div className="flex-1 w-full max-w-4xl grid grid-cols-2 gap-[2px] bg-black">
              {[compareA, compareB].map((photo, i) => (
                <div key={photo.id} className="relative flex flex-col h-full">
                  {/* Label */}
                  <div className={`py-2 text-center ${
                    i === 0 ? 'bg-violet-500/20' : 'bg-emerald-500/20'
                  }`}>
                    <p className={`text-xs font-black uppercase tracking-wider ${
                      i === 0 ? 'text-violet-400' : 'text-emerald-400'
                    }`}>
                      {i === 0 ? 'Antes' : 'Después'}
                    </p>
                    <p className="text-[10px] text-white/50">
                      {new Date(photo.photo_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                  {/* Photo */}
                  <div className="flex-1 overflow-hidden">
                    <img
                      src={photo.photo_url}
                      alt={ANGLE_LABELS[photo.angle]}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Angle badge */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                    <span className="text-[9px] font-bold bg-black/60 text-white px-2.5 py-1 rounded-full">
                      {ANGLE_LABELS[photo.angle]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom action */}
          <div className="px-4 py-4 bg-black/80">
            <button
              onClick={() => { setCompareA(null); setCompareB(null); }}
              className="w-full py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-colors"
            >
              Elegir otras fotos
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen viewer */}
      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
            onClick={() => setFullscreenPhoto(null)}
          >
            <X size={20} />
          </button>
          <img
            src={fullscreenPhoto.photo_url}
            alt={ANGLE_LABELS[fullscreenPhoto.angle]}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-white text-sm font-bold">{ANGLE_LABELS[fullscreenPhoto.angle]}</p>
            <p className="text-white/60 text-xs">
              {new Date(fullscreenPhoto.photo_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            {fullscreenPhoto.notes && (
              <p className="text-white/50 text-xs mt-1 italic">{fullscreenPhoto.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
