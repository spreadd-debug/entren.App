import React, { useEffect, useState } from 'react';
import { Activity, Link2, Loader2, Unlink } from 'lucide-react';
import { Card, Button } from '../UI';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StravaConnection } from '../../../shared/types';

interface StravaConnectCardProps {
  studentId: string;
  /** Notifica al padre cuando cambia el estado de conexión, para refetch de corridas. */
  onChange?: () => void;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const StravaConnectCard: React.FC<StravaConnectCardProps> = ({ studentId, onChange }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.strava.getConnection(studentId)
      .then(c => { if (!cancelled) setConnection(c); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  const handleConnect = async () => {
    setWorking(true);
    try {
      const { url } = await api.strava.startConnect(studentId);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo iniciar la conexión con Strava');
      setWorking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar Strava? Tus corridas ya importadas se conservan.')) return;
    setWorking(true);
    try {
      await api.strava.disconnect(studentId);
      setConnection(null);
      toast.success('Strava desconectado');
      onChange?.();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo desconectar');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="animate-spin" size={16} /> Cargando estado de Strava…
        </div>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <Activity className="text-orange-500" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Conectar Strava</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sincronizá tus corridas automáticamente desde tu reloj (Garmin, Apple Watch, Polar, etc.). Importamos los últimos 30 días al conectar.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Button variant="primary" fullWidth onClick={handleConnect} disabled={working}>
            {working ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            Conectar Strava
          </Button>
        </div>
      </Card>
    );
  }

  const name = [connection.athlete_firstname, connection.athlete_lastname].filter(Boolean).join(' ').trim();

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
          <Activity className="text-orange-500" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Strava conectado</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-orange-500/10 text-orange-600 border-orange-500/20">
              ACTIVO
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {name || `Athlete #${connection.athlete_id}`} · Última sync: {fmtDateTime(connection.last_sync_at)}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Button variant="outline" fullWidth onClick={handleDisconnect} disabled={working}>
          {working ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
          Desconectar
        </Button>
      </div>
    </Card>
  );
};
