export interface PackageTemplate {
  id: string;
  sessionsTotal: number;
  pricePaid: number;
  label?: string;
}

export interface PTRateSettings {
  defaultSessionRate: number;
  packageTemplates: PackageTemplate[];
}

const KEY_PREFIX = 'pt_rate_settings:';

const EMPTY: PTRateSettings = { defaultSessionRate: 0, packageTemplates: [] };

function keyFor(gymId: string) {
  return `${KEY_PREFIX}${gymId}`;
}

export const PTRateSettingsService = {
  get(gymId: string): PTRateSettings {
    if (!gymId) return EMPTY;
    try {
      const raw = localStorage.getItem(keyFor(gymId));
      if (!raw) return EMPTY;
      const parsed = JSON.parse(raw);
      return {
        defaultSessionRate: Number(parsed.defaultSessionRate ?? 0),
        packageTemplates: Array.isArray(parsed.packageTemplates) ? parsed.packageTemplates : [],
      };
    } catch {
      return EMPTY;
    }
  },

  set(gymId: string, settings: PTRateSettings): void {
    if (!gymId) return;
    localStorage.setItem(keyFor(gymId), JSON.stringify(settings));
  },

  addTemplate(gymId: string, tpl: Omit<PackageTemplate, 'id'>): PTRateSettings {
    const current = this.get(gymId);
    const next: PTRateSettings = {
      ...current,
      packageTemplates: [
        ...current.packageTemplates,
        { ...tpl, id: crypto.randomUUID() },
      ],
    };
    this.set(gymId, next);
    return next;
  },

  removeTemplate(gymId: string, templateId: string): PTRateSettings {
    const current = this.get(gymId);
    const next: PTRateSettings = {
      ...current,
      packageTemplates: current.packageTemplates.filter((t) => t.id !== templateId),
    };
    this.set(gymId, next);
    return next;
  },

  setDefaultRate(gymId: string, rate: number): PTRateSettings {
    const current = this.get(gymId);
    const next: PTRateSettings = { ...current, defaultSessionRate: rate };
    this.set(gymId, next);
    return next;
  },
};
