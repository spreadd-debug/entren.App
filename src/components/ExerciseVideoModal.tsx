import { X } from 'lucide-react';
import { getYouTubeEmbedUrl } from '../lib/youtube';

interface ExerciseVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  videoUrl: string;
}

export function ExerciseVideoModal({
  isOpen,
  onClose,
  exerciseName,
  videoUrl,
}: ExerciseVideoModalProps) {
  if (!isOpen) return null;

  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white truncate pr-4">
            {exerciseName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video */}
        <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={exerciseName}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-2">
              <span className="text-sm">URL de video no válida</span>
              <span className="text-xs break-all px-6 text-center">{videoUrl}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
