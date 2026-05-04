import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Activity, Apple, Wallet, HeartPulse, Moon, Battery, Settings, LogOut, Sparkles } from 'lucide-react';
import { MobileHeader, GradientBlob, Card, Fab, BottomSheet } from '../../components/personal/ui';
import { usePersonalProfile } from '../../hooks/usePersonalProfile';
import {
  PersonalActivitiesService,
  PersonalMealsService,
  PersonalAccountsService,
  PersonalTransactionsService,
  PersonalBodyService,
  PersonalSleepService,
  PersonalDailyMetricsService,
} from '../../services/PersonalTrackerService';
import { api } from '../../services/api';
import {
  PersonalActivity, PersonalMealWithFoods, PersonalAccount, PersonalTransaction,
  PersonalBodyMetric, PersonalSleep, PersonalDailyMetrics,
} from '../../../shared/types';

interface Props {
  onLogout: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(): string {
  const d = new Date();
  const dow = d.getDay(); // 0=Dom
  const diff = (dow + 6) % 7; // a Lunes
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfPrevMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString();
}

export const PersonalDashboard: React.FC<Props> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { profile, loading } = usePersonalProfile();
  const [activitiesWeek, setActivitiesWeek] = useState<PersonalActivity[]>([]);
  const [todayMeals, setTodayMeals] = useState<PersonalMealWithFoods[]>([]);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [txsThisMonth, setTxsThisMonth] = useState<PersonalTransaction[]>([]);
  const [txsPrevMonth, setTxsPrevMonth] = useState<PersonalTransaction[]>([]);
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [latestBody, setLatestBody] = useState<PersonalBodyMetric | null>(null);
  const [latestSleep, setLatestSleep] = useState<PersonalSleep | null>(null);
  const [latestDaily, setLatestDaily] = useState<PersonalDailyMetrics | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const monthStart = startOfMonthIso();
    Promise.all([
      PersonalActivitiesService.list(profile.id, { from: startOfWeek() }),
      PersonalMealsService.listByDate(profile.id, todayIso()),
      PersonalAccountsService.list(profile.id),
      PersonalTransactionsService.list(profile.id, { from: monthStart }, 500),
      PersonalTransactionsService.list(profile.id, { from: startOfPrevMonthIso(), to: monthStart }, 500),
      PersonalBodyService.latest(profile.id),
      PersonalSleepService.latest(profile.id),
      PersonalDailyMetricsService.latest(profile.id),
      api.fx.getLatest(),
    ]).then(([acts, meals, acc, txCurr, txPrev, body, sleep, daily, fx]) => {
      setActivitiesWeek(acts);
      setTodayMeals(meals);
      setAccounts(acc);
      setTxsThisMonth(txCurr);
      setTxsPrevMonth(txPrev);
      setLatestBody(body);
      setLatestSleep(sleep);
      setLatestDaily(daily);
      const preferred = profile.preferred_fx_name ?? 'blue';
      setFxRate(fx.find(r => r.name === preferred)?.sell ?? null);
    }).catch(err => console.error('[dashboard] load failed', err));
  }, [profile?.id]);

  const todayCalories = useMemo(
    () => todayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0),
    [todayMeals],
  );
  const todayProtein = useMemo(
    () => Math.round(todayMeals.reduce((sum, m) => sum + (m.protein_g ?? 0), 0)),
    [todayMeals],
  );

  const totalArs = useMemo(() => {
    return accounts.reduce((sum, a) => {
      const bal = Number(a.current_balance) || 0;
      if (a.currency === 'ARS') return sum + bal;
      if (fxRate && a.currency === 'USD') return sum + bal * fxRate;
      return sum;
    }, 0);
  }, [accounts, fxRate]);

  const sumExpensesArs = (txs: PersonalTransaction[]) => txs
    .filter(t => t.kind === 'expense')
    .reduce((s, t) => {
      const amt = Number(t.amount);
      return s + (t.currency === 'ARS' ? amt : (fxRate ? amt * fxRate : amt));
    }, 0);

  const monthSpending = useMemo(() => sumExpensesArs(txsThisMonth), [txsThisMonth, fxRate]);
  const prevMonthSpending = useMemo(() => sumExpensesArs(txsPrevMonth), [txsPrevMonth, fxRate]);
  const spendingDelta = monthSpending - prevMonthSpending;

  const weekKcalBurned = useMemo(
    () => activitiesWeek.reduce((sum, a) => sum + (a.calories_kcal ?? 0), 0),
    [activitiesWeek],
  );

  const displayName = profile?.display_name?.split(' ')[0] ?? 'Mauro';

  return (
    <>
      <MobileHeader
        title=""
        rightSlot={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('settings')}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/60 hover:bg-white text-[var(--color-ink)] transition-colors"
              aria-label="Ajustes"
            >
              <Settings size={18} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-white transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          </div>
        }
      />

      <div className="relative px-5 pb-32">
        <GradientBlob
          className="-top-10 -right-20"
          colors={['#FB923C', '#A855F7']}
          size={320}
          blur={70}
          opacity={0.55}
        />
        <GradientBlob
          className="top-32 -left-32"
          colors={['#60A5FA', '#A855F7']}
          size={240}
          blur={80}
          opacity={0.32}
        />

        <div className="relative">
          <h1 className="font-serif text-[2.6rem] leading-[1.05] text-[var(--color-ink)]">
            Hey {displayName}
          </h1>
          <p className="text-[var(--color-ink-muted)] mt-1.5 text-sm">
            {loading ? 'Cargando tu día…' : 'Tu día en un vistazo'}
          </p>
        </div>

        <div className="relative mt-6 space-y-3">
          <Card onClick={() => navigate('workouts')}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <Activity size={20} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Esta semana</span>
                  <span className="text-[11px] text-[var(--color-ink-muted)]">{activitiesWeek.length} entrenos</span>
                </div>
                <h3 className="font-serif text-2xl text-[var(--color-ink)] leading-tight mt-0.5">Workouts</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-serif text-3xl text-[var(--color-ink)]">{weekKcalBurned}</span>
                  <span className="text-xs text-[var(--color-ink-muted)]">kcal quemadas</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-[var(--color-ink-muted)] mt-1" />
            </div>
          </Card>

          <Card onClick={() => navigate('nutrition')}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Apple size={20} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Hoy</span>
                  <span className="text-[11px] text-[var(--color-ink-muted)]">{todayMeals.length} comidas</span>
                </div>
                <h3 className="font-serif text-2xl text-[var(--color-ink)] leading-tight mt-0.5">Nutrición</h3>
                <div className="mt-2 flex items-baseline gap-3">
                  <div>
                    <span className="font-serif text-3xl text-[var(--color-ink)]">{todayCalories}</span>
                    <span className="text-xs text-[var(--color-ink-muted)] ml-1">kcal</span>
                  </div>
                  <div className="text-xs text-[var(--color-ink-muted)]">
                    <span className="font-semibold text-[var(--color-ink)]">{todayProtein}g</span> proteína
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-[var(--color-ink-muted)] mt-1" />
            </div>
          </Card>

          <Card onClick={() => navigate('money')}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                <Wallet size={20} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Total</span>
                  {accounts.length > 0 && (
                    <span className="text-[11px] text-[var(--color-ink-muted)]">{accounts.length} cuenta{accounts.length === 1 ? '' : 's'}</span>
                  )}
                </div>
                <h3 className="font-serif text-2xl text-[var(--color-ink)] leading-tight mt-0.5">Finanzas</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  {accounts.length > 0 ? (
                    <>
                      <span className="text-xs text-[var(--color-ink-muted)]">$</span>
                      <span className="font-serif text-3xl text-[var(--color-ink)]">{Math.round(totalArs).toLocaleString('es-AR')}</span>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--color-ink-muted)] italic">Creá tu primera cuenta</span>
                  )}
                </div>
                {accounts.length > 0 && monthSpending > 0 && (
                  <p className="text-[11px] text-[var(--color-ink-muted)] mt-1.5">
                    Gastaste <span className="font-semibold text-[var(--color-ink)]">${Math.round(monthSpending).toLocaleString('es-AR')}</span> este mes
                    {prevMonthSpending > 0 && (
                      <span className={spendingDelta >= 0 ? 'text-rose-600 ml-1' : 'text-emerald-600 ml-1'}>
                        ({spendingDelta >= 0 ? '+' : ''}{Math.round((spendingDelta / prevMonthSpending) * 100)}% vs mes anterior)
                      </span>
                    )}
                  </p>
                )}
              </div>
              <ChevronRight size={18} className="text-[var(--color-ink-muted)] mt-1" />
            </div>
          </Card>

          <Card onClick={() => navigate('sleep')}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Moon size={20} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Anoche</span>
                  {latestSleep?.sleep_score != null && (
                    <span className="text-[11px] text-[var(--color-ink-muted)]">score {latestSleep.sleep_score}</span>
                  )}
                </div>
                <h3 className="font-serif text-2xl text-[var(--color-ink)] leading-tight mt-0.5">Sleep</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  {latestSleep?.total_seconds ? (
                    <>
                      <span className="font-serif text-3xl text-[var(--color-ink)]">
                        {Math.floor(latestSleep.total_seconds / 3600)}h{' '}
                        {Math.floor((latestSleep.total_seconds % 3600) / 60)}m
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--color-ink-muted)] italic">Conectá Garmin</span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-[var(--color-ink-muted)] mt-1" />
            </div>
          </Card>

          <Card onClick={() => navigate('vitals')}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                <Battery size={20} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Hoy</span>
                  {latestDaily?.steps != null && (
                    <span className="text-[11px] text-[var(--color-ink-muted)]">
                      {latestDaily.steps.toLocaleString('es-AR')} pasos
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-2xl text-[var(--color-ink)] leading-tight mt-0.5">Vitals</h3>
                <div className="mt-2 flex items-baseline gap-3">
                  {latestDaily?.body_battery_current != null ? (
                    <>
                      <div>
                        <span className="font-serif text-3xl text-[var(--color-ink)]">{latestDaily.body_battery_current}</span>
                        <span className="text-xs text-[var(--color-ink-muted)] ml-1">battery</span>
                      </div>
                      {latestDaily.resting_hr_bpm != null && (
                        <div className="text-xs text-[var(--color-ink-muted)]">
                          <span className="font-semibold text-[var(--color-ink)]">{latestDaily.resting_hr_bpm}</span> bpm rest
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-[var(--color-ink-muted)] italic">Conectá Garmin</span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-[var(--color-ink-muted)] mt-1" />
            </div>
          </Card>

          <Card onClick={() => navigate('body')}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <HeartPulse size={20} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">Última medición</span>
                </div>
                <h3 className="font-serif text-2xl text-[var(--color-ink)] leading-tight mt-0.5">Body</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  {latestBody?.weight_kg ? (
                    <>
                      <span className="font-serif text-3xl text-[var(--color-ink)]">{Number(latestBody.weight_kg).toFixed(1)}</span>
                      <span className="text-xs text-[var(--color-ink-muted)]">kg</span>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--color-ink-muted)] italic">Sin mediciones aún</span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-[var(--color-ink-muted)] mt-1" />
            </div>
          </Card>
        </div>

        <div className="relative mt-6">
          <button
            type="button"
            onClick={() => navigate('/admin/gyms')}
            className="w-full px-5 py-3 rounded-full bg-[var(--color-cream-200)] text-[var(--color-ink)] text-sm font-medium flex items-center justify-center gap-2 hover:bg-[var(--color-cream-300)] transition-colors"
          >
            <Sparkles size={14} />
            Ir al panel entrenApp
          </button>
        </div>
      </div>

      <Fab onClick={() => setQuickAddOpen(true)} ariaLabel="Quick add" />

      <BottomSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="¿Qué querés registrar?">
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            type="button"
            onClick={() => { setQuickAddOpen(false); navigate('workouts?new=1'); }}
            className="aspect-square rounded-3xl bg-orange-50 text-orange-600 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Activity size={24} strokeWidth={1.75} />
            <span className="text-sm font-medium text-[var(--color-ink)]">Workout</span>
          </button>
          <button
            type="button"
            onClick={() => { setQuickAddOpen(false); navigate('nutrition?new=1'); }}
            className="aspect-square rounded-3xl bg-emerald-50 text-emerald-600 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Apple size={24} strokeWidth={1.75} />
            <span className="text-sm font-medium text-[var(--color-ink)]">Comida</span>
          </button>
          <button
            type="button"
            onClick={() => { setQuickAddOpen(false); navigate('money?new=1'); }}
            className="aspect-square rounded-3xl bg-violet-50 text-violet-600 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Wallet size={24} strokeWidth={1.75} />
            <span className="text-sm font-medium text-[var(--color-ink)]">Gasto</span>
          </button>
          <button
            type="button"
            onClick={() => { setQuickAddOpen(false); navigate('body?new=1'); }}
            className="aspect-square rounded-3xl bg-rose-50 text-rose-600 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <HeartPulse size={24} strokeWidth={1.75} />
            <span className="text-sm font-medium text-[var(--color-ink)]">Peso</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
