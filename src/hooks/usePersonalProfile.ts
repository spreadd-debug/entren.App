import { useEffect, useState } from 'react';
import { CURRENT_USER } from '../config/currentUser';
import { PersonalProfileService } from '../services/PersonalTrackerService';
import { PersonalProfile } from '../../shared/types';

interface State {
  profile: PersonalProfile | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  update: (updates: Partial<PersonalProfile>) => Promise<void>;
}

export function usePersonalProfile(): State {
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await PersonalProfileService.ensureForUser(CURRENT_USER.id, CURRENT_USER.email);
      setProfile(p);
    } catch (err: any) {
      console.error('[usePersonalProfile] failed to load:', err);
      setError(err?.message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = async (updates: Partial<PersonalProfile>) => {
    if (!profile) return;
    const updated = await PersonalProfileService.update(profile.id, updates);
    setProfile(updated);
  };

  return { profile, loading, error, reload: load, update };
}
