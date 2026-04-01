import { supabase } from './db/supabase';
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { PTShell } from './components/PTShell';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DashboardView } from './pages/DashboardView';
import { StudentsView } from './pages/StudentsView';
import { StudentDetailView } from './pages/StudentDetailView';
import { ClientDetailView } from './pages/ClientDetailView';
import { PaymentsView } from './pages/PaymentsView';
import { DefaultersView } from './pages/DefaultersView';
import { SettingsView } from './pages/SettingsView';
import StudentPortalAccessView from "./pages/StudentPortalAccessView";
import StudentPortalView from "./pages/StudentPortalView";
import { PlansView } from './pages/PlansView';
import { NewStudentView } from './pages/NewStudentView';
import { LoginView } from './pages/LoginView';
import { RegisterGymView } from './pages/RegisterGymView';
import { RegisterPTView } from './pages/RegisterPTView';
import { PTDashboardView } from './pages/PTDashboardView';
import { AutomationView } from './pages/AutomationView';
import WorkoutPlansView from "./pages/WorkoutPlansView";
import { ShiftsView } from './pages/ShiftsView';
import CheckInView from './pages/CheckInView';
import { SuperAdminApp } from './pages/SuperAdminApp';
import { SubscriptionGuard } from './components/SubscriptionGuard';
import { DemoTour } from './components/DemoTour';
import { ThemeProvider } from './context/ThemeContext';
import { ShiftService } from './services/ShiftService';
import { useToast } from './context/ToastContext';
import { viewToPath, pathToView } from './utils/routes';

import {
  Student,
  Payment,
  Plan,
  ReminderLog,
  ReminderRule,
  MessageTemplate,
  AutomationStatus,
  GymSubscription,
  GymType,
} from '../shared/types';

import { api } from './services/api';

export default function App() {

  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegisteringPT, setIsRegisteringPT] = useState(false);
  const [authTick, setAuthTick] = useState(0); // forces re-render after sessionStorage-based logins
  const [studentPortalId, setStudentPortalId] = useState<string | null>(
    localStorage.getItem("studentPortalId")
  );
  const isSuperAdmin = sessionStorage.getItem('userRole') === 'superadmin';
  const isDemo = sessionStorage.getItem('userRole') === 'demo';
  const isGymTest = sessionStorage.getItem('userRole') === 'gym_test';
  const isStudentDemo = sessionStorage.getItem('userRole') === 'student_demo';
  const checkinGymId = new URLSearchParams(window.location.search).get('checkin');
  const DEMO_GYM_ID = '11111111-1111-1111-1111-111111111111';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      setSessionLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = isSuperAdmin || isDemo || isGymTest || isStudentDemo || supabaseUser !== null;
  const gymId = (isDemo || isGymTest) ? DEMO_GYM_ID : (supabaseUser?.user_metadata?.gym_id ?? null);
  const userRole = (supabaseUser?.user_metadata?.role ?? 'admin') as string;
  const gymType = (supabaseUser?.user_metadata?.gym_type ?? 'gym') as GymType;
  const mustChangePassword = supabaseUser?.user_metadata?.must_change_password === true;

  const isStudentPortalMode = window.location.search.includes("student=1");

  // While checking session, show nothing (avoids flash of login screen)
  if (sessionLoading && !isSuperAdmin && !isDemo && !isGymTest) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }
  // ── Special URL modes (no auth needed) ──────────────────────────────────────

  if (checkinGymId) {
    return (
      <ThemeProvider>
        <CheckInView gymId={checkinGymId} />
      </ThemeProvider>
    );
  }

  if (isStudentPortalMode) {
    if (!studentPortalId) {
      return (
        <ThemeProvider>
          <StudentPortalAccessView
            onSuccess={(studentId) => {
              localStorage.setItem("studentPortalId", studentId);
              setStudentPortalId(studentId);
            }}
          />
        </ThemeProvider>
      );
    }
    return (
      <ThemeProvider>
        <StudentPortalView
          studentId={studentPortalId}
          onLogout={() => {
            localStorage.removeItem("studentPortalId");
            setStudentPortalId(null);
          }}
        />
      </ThemeProvider>
    );
  }

  // ── Register flow ────────────────────────────────────────────────────────────

  if (isRegistering) {
    return (
      <ThemeProvider>
        <RegisterGymView
          onBack={() => setIsRegistering(false)}
          onSuccess={() => setIsRegistering(false)}
        />
      </ThemeProvider>
    );
  }

  if (isRegisteringPT) {
    return (
      <ThemeProvider>
        <RegisterPTView
          onBack={() => setIsRegisteringPT(false)}
          onSuccess={() => setIsRegisteringPT(false)}
        />
      </ThemeProvider>
    );
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <LoginView
          onLogin={() => setAuthTick(t => t + 1)}
          onRegisterClick={() => setIsRegistering(true)}
          onRegisterPTClick={() => setIsRegisteringPT(true)}
        />
      </ThemeProvider>
    );
  }

  // ── Superadmin: completely separate experience ───────────────────────────────

  const handleLogout = async () => {
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('gymId');
    sessionStorage.removeItem('studentId');
    setAuthTick(t => t + 1);
    await supabase.auth.signOut();
  };

  if (isSuperAdmin) {
    return (
      <ThemeProvider>
        <SuperAdminApp onLogout={handleLogout} />
      </ThemeProvider>
    );
  }

  if (isStudentDemo) {
    const demoStudentId = sessionStorage.getItem('studentId') ?? DEMO_STUDENT_ID;
    return (
      <ThemeProvider>
        <StudentPortalView
          studentId={demoStudentId}
          onLogout={handleLogout}
        />
      </ThemeProvider>
    );
  }

  // ── Must change password (first login) ───────────────────────────────────────

  if (mustChangePassword) {
    return (
      <ThemeProvider>
        <ChangePasswordModal
          onSuccess={async () => {
            // Refresh the session so user_metadata is up to date
            const { data } = await supabase.auth.getSession();
            setSupabaseUser(data.session?.user ?? null);
          }}
        />
      </ThemeProvider>
    );
  }

  // ── Personal Trainer app ─────────────────────────────────────────────────────

  if (gymType === 'personal_trainer') {
    return (
      <ThemeProvider>
        <PTApp
          gymId={gymId!}
          onLogout={handleLogout}
        />
      </ThemeProvider>
    );
  }

  // ── Gym app ──────────────────────────────────────────────────────────────────

  return (
    <ThemeProvider>
      <GymApp
        gymId={gymId!}
        userRole={userRole}
        onLogout={handleLogout}
        isDemo={isDemo}
        onRegister={() => setIsRegistering(true)}
      />
    </ThemeProvider>
  );
}

// ── GymApp: all gym-specific state and rendering ──────────────────────────────

const DEMO_STUDENT_ID = 'bbbb0001-0000-0000-0000-000000000001';

function GymApp({ gymId, userRole, onLogout, isDemo = false, onRegister }: {
  gymId: string;
  userRole: string;
  onLogout: () => void;
  isDemo?: boolean;
  onRegister?: () => void;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserRole = userRole;
  const canViewFinancials = currentUserRole === 'admin';
  const canManageSettings = currentUserRole === 'admin';

  const currentView = pathToView(location.pathname);

  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  const [gymSubscription, setGymSubscription] = useState<GymSubscription | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [shiftsEnabled, setShiftsEnabled] = useState(false);
  const [todayShifts, setTodayShifts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      const results = await Promise.allSettled([
        api.students.getAll(gymId),
        api.payments.getAll(gymId),
        api.plans.getAll(gymId),
        api.automation.getLogs(gymId),
        api.automation.getStatus(gymId),
        ShiftService.getSettings(gymId),
        api.subscriptions.getByGymId(gymId),
      ]);

      const [studentsRes, paymentsRes, plansRes, logsRes, statusRes, gymSettingsRes, subscriptionRes] = results;

      if (studentsRes.status === 'fulfilled') {
        setStudents(Array.isArray(studentsRes.value) ? studentsRes.value : []);
      } else {
        console.error('Error fetching students:', studentsRes.reason);
      }

      if (paymentsRes.status === 'fulfilled') {
        setPayments(Array.isArray(paymentsRes.value) ? paymentsRes.value : []);
      } else {
        console.error('Error fetching payments:', paymentsRes.reason);
      }

      if (plansRes.status === 'fulfilled') {
        setPlans(Array.isArray(plansRes.value) ? plansRes.value : []);
      } else {
        console.error('Error fetching plans:', plansRes.reason);
      }

      if (logsRes.status === 'fulfilled') {
        setReminderLogs(Array.isArray(logsRes.value) ? logsRes.value : []);
      } else {
        console.error('Error fetching automation logs:', logsRes.reason);
      }

      if (statusRes.status === 'fulfilled') {
        setAutomationStatus(statusRes.value ?? null);
      } else {
        console.error('Error fetching automation status:', statusRes.reason);
      }

      if (gymSettingsRes.status === 'fulfilled') {
        const enabled = gymSettingsRes.value?.shifts_enabled ?? false;
        setShiftsEnabled(enabled);
        if (enabled) {
          const todayDow = new Date().getDay();
          ShiftService.getShiftsWithStudents(gymId).then(all => {
            setTodayShifts(all.filter(s => s.day_of_week === todayDow));
          }).catch(() => {});
        }
      }

      if (subscriptionRes.status === 'fulfilled') {
        setGymSubscription(subscriptionRes.value);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleRunAutomation = async () => {
    try {
      const data = await api.automation.run(gymId);
      const [status, logs] = await Promise.all([
        api.automation.getStatus(gymId),
        api.automation.getLogs(gymId),
      ]);
      setAutomationStatus(status);
      setReminderLogs(logs);
      return data?.result ?? data;
    } catch (error) {
      console.error('Error running automation:', error);
    }
  };

  const handleToggleShifts = async (enabled: boolean) => {
    setShiftsEnabled(enabled);
    try {
      await ShiftService.upsertSettings(gymId, { shifts_enabled: enabled });
    } catch (err) {
      console.error('Error saving shifts setting:', err);
      setShiftsEnabled(!enabled);
    }
  };

  const handleNavigate = (view: string) => {
    navigate(viewToPath(view));
  };

  const handleSelectStudent = (student: Student) => {
    navigate(viewToPath('student-detail', { studentId: student.id }));
  };

  const handleRegisterPayment = async (paymentData: {
    studentId: string;
    amount: number;
    method: 'cash' | 'transfer' | 'mercadopago';
    date: string;
    nextDueDate: string;
  }) => {
    try {
      await api.payments.register({ ...paymentData, gymId });
      const [updatedStudents, updatedPayments] = await Promise.all([
        api.students.getAll(gymId),
        api.payments.getAll(gymId),
      ]);
      setStudents(updatedStudents);
      setPayments(updatedPayments);
    } catch (error: any) {
      console.error('Error registering payment:', error);
      toast.error(`No se pudo registrar el pago: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const handleSavePlan = async (plan: Partial<Plan>) => {
    try {
      if ((plan as any).id) {
        await api.plans.update((plan as any).id, plan);
      } else {
        await api.plans.create({ ...plan, gym_id: gymId });
      }
      setPlans(await api.plans.getAll(gymId));
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await api.plans.delete(id);
      setPlans(await api.plans.getAll(gymId));
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

  const findDuplicatePhone = (phone: string, excludeId?: string) => {
    const cleaned = normalizePhone(phone);
    if (cleaned.length < 6) return null;
    return students.find((s: any) => {
      if (excludeId && s.id === excludeId) return false;
      const p = normalizePhone((s as any).telefono ?? (s as any).phone ?? '');
      return p.length >= 6 && p === cleaned;
    }) ?? null;
  };

  const handleCreateStudent = async (studentData: Partial<Student>, registerPayment: boolean) => {
    const phone = (studentData as any).telefono ?? (studentData as any).phone ?? '';
    if (phone.trim()) {
      const dup = findDuplicatePhone(phone);
      if (dup) {
        const dupName = `${(dup as any).nombre ?? ''} ${(dup as any).apellido ?? ''}`.trim();
        toast.error(`Ya existe un alumno con ese teléfono: ${dupName}`);
        return;
      }
    }
    try {
      const newStudent: any = await api.students.create({ ...studentData, gym_id: gymId });
      if (registerPayment) {
        const selectedPlan: any = plans.find((p: any) => p.id === (newStudent.plan_id ?? newStudent.planId));
        await api.payments.register({
          student_id: newStudent.id,
          gym_id: gymId,
          monto: Number(selectedPlan?.precio ?? selectedPlan?.price ?? 0),
          metodo_pago: 'cash',
          fecha_pago: new Date().toISOString().split('T')[0],
          next_due_date: newStudent.next_due_date ?? newStudent.nextDueDate,
        });
      }
      const [updatedStudents, updatedPayments] = await Promise.all([
        api.students.getAll(gymId),
        api.payments.getAll(gymId),
      ]);
      setStudents(updatedStudents);
      setPayments(updatedPayments);
      navigate('/students');
    } catch (error: any) {
      console.error('Error creating student:', error);
      toast.error(`No se pudo crear el alumno: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const handleUpdateStudent = async (id: string, updates: any) => {
    const phone = updates.telefono ?? updates.phone ?? '';
    if (phone.trim()) {
      const dup = findDuplicatePhone(phone, id);
      if (dup) {
        const dupName = `${(dup as any).nombre ?? ''} ${(dup as any).apellido ?? ''}`.trim();
        toast.error(`Ya existe un alumno con ese teléfono: ${dupName}`);
        return;
      }
    }
    try {
      await api.students.update(id, updates);
      const updatedStudents = await api.students.getAll(gymId);
      setStudents(updatedStudents);
    } catch (error: any) {
      console.error('Error updating student:', error);
      toast.error(`No se pudo guardar los cambios: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await api.students.delete(id, gymId);
      const updatedStudents = await api.students.getAll(gymId);
      setStudents(updatedStudents);
      navigate('/students');
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error(`No se pudo eliminar el alumno: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':     return 'Panel General';
      case 'students':      return 'Alumnos';
      case 'student-detail': return 'Detalle de Alumno';
      case 'payments':      return 'Gestión de Pagos';
      case 'defaulters':    return 'Morosos y Deudas';
      case 'settings':      return 'Ajustes';
      case 'automation':    return 'Automatización';
      case 'plans':         return 'Planes y Precios';
      case 'workouts':      return 'Rutinas';
      case 'shifts':        return 'Turnos';
      case 'new-student':   return 'Nuevo Alumno';
      default:              return 'entrenApp';
    }
  };

  // Loading state
  const loadingEl = isLoading
    ? <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
    : null;

  // ── Student detail wrapper (reads :studentId from URL params) ───────────────
  const StudentDetailRoute = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const student = students.find((s: any) => s.id === studentId) ?? null;

    if (isLoading) return loadingEl;
    if (!student) return <Navigate to="/students" replace />;

    return (
      <StudentDetailView
        student={student}
        payments={payments.filter((p: any) => (p.studentId ?? p.student_id) === student.id)}
        plans={plans}
        gymId={gymId}
        onBack={() => navigate('/students')}
        onRegisterPayment={handleRegisterPayment}
        onUpdateStudent={handleUpdateStudent}
        onDeleteStudent={handleDeleteStudent}
      />
    );
  };

  // ── Demo student portal preview (full-screen, outside AppShell) ─────────────
  if (currentView === 'student-portal') {
    return (
      <>
        <StudentPortalView
          studentId={DEMO_STUDENT_ID}
          onLogout={() => handleNavigate('workouts')}
        />
        {isDemo && (
          <DemoTour
            onNavigate={handleNavigate}
            onExit={onLogout}
            onRegister={onRegister ?? (() => {})}
          />
        )}
      </>
    );
  }

  return (
    <>
      <AppShell
        currentView={currentView === 'student-detail' ? 'students' : currentView}
        onNavigate={handleNavigate}
        title={getViewTitle()}
        shiftsEnabled={shiftsEnabled}
        canViewFinancials={canViewFinancials}
        onLogout={onLogout}
      >
        <SubscriptionGuard subscription={gymSubscription}>
          <Routes>
            <Route path="/" element={
              loadingEl ?? (
                <DashboardView
                  onNavigate={handleNavigate}
                  students={students}
                  payments={payments}
                  onSelectStudent={handleSelectStudent}
                  canViewFinancials={canViewFinancials}
                  shiftsEnabled={shiftsEnabled}
                  todayShifts={todayShifts}
                />
              )
            } />
            <Route path="/students" element={
              loadingEl ?? (
                <StudentsView onSelectStudent={handleSelectStudent} students={students} onNavigate={handleNavigate} />
              )
            } />
            <Route path="/students/new" element={
              loadingEl ?? (
                <NewStudentView
                  plans={plans}
                  onBack={() => navigate('/students')}
                  onCreateStudent={handleCreateStudent}
                />
              )
            } />
            <Route path="/students/:studentId" element={<StudentDetailRoute />} />
            <Route path="/payments" element={
              loadingEl ?? (
                <PaymentsView
                  payments={payments}
                  canViewFinancials={canViewFinancials}
                  students={students}
                  plans={plans}
                  onRegisterPayment={handleRegisterPayment}
                />
              )
            } />
            <Route path="/defaulters" element={
              loadingEl ?? (
                <DefaultersView students={students} plans={plans} onRegisterPayment={handleRegisterPayment} />
              )
            } />
            <Route path="/workouts" element={
              loadingEl ?? <WorkoutPlansView gymId={gymId} />
            } />
            <Route path="/shifts" element={
              loadingEl ?? <ShiftsView gymId={gymId} students={students} />
            } />
            <Route path="/settings" element={
              loadingEl ?? (
                <SettingsView
                  onNavigate={handleNavigate}
                  canManageSettings={canManageSettings}
                  shiftsEnabled={shiftsEnabled}
                  onToggleShifts={handleToggleShifts}
                  gymId={gymId}
                  gymName={gymSubscription?.gym_name}
                />
              )
            } />
            <Route path="/automation" element={
              loadingEl ?? (
                <AutomationView
                  rules={reminderRules}
                  templates={messageTemplates}
                  logs={reminderLogs}
                  status={automationStatus}
                  subscription={gymSubscription}
                  onBack={() => navigate('/settings')}
                  onRunAutomation={handleRunAutomation}
                  onUpdateRule={() => {}}
                  onUpdateTemplate={() => {}}
                />
              )
            } />
            <Route path="/plans" element={
              loadingEl ?? (
                <PlansView
                  plans={plans}
                  onBack={() => navigate('/settings')}
                  onSavePlan={handleSavePlan}
                  onDeletePlan={handleDeletePlan}
                />
              )
            } />
            <Route path="/portal-preview" element={
              <StudentPortalView
                studentId={DEMO_STUDENT_ID}
                onLogout={() => navigate('/workouts')}
              />
            } />
            {/* Catch-all: redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SubscriptionGuard>
      </AppShell>

      {isDemo && (
        <DemoTour
          onNavigate={handleNavigate}
          onExit={onLogout}
          onRegister={onRegister ?? (() => {})}
        />
      )}
    </>
  );
}

// ── PTApp: Personal Trainer experience ──────────────────────────────────────

function PTApp({ gymId, onLogout }: {
  gymId: string;
  onLogout: () => void;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const currentView = pathToView(location.pathname);

  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gymSubscription, setGymSubscription] = useState<GymSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const results = await Promise.allSettled([
        api.students.getAll(gymId),
        api.plans.getAll(gymId),
        api.subscriptions.getByGymId(gymId),
      ]);

      const [studentsRes, plansRes, subscriptionRes] = results;

      if (studentsRes.status === 'fulfilled') setStudents(Array.isArray(studentsRes.value) ? studentsRes.value : []);
      if (plansRes.status === 'fulfilled') setPlans(Array.isArray(plansRes.value) ? plansRes.value : []);
      if (subscriptionRes.status === 'fulfilled') setGymSubscription(subscriptionRes.value);

      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleNavigate = (view: string) => {
    navigate(viewToPath(view, { pt: true }));
  };

  const handleSelectStudent = (student: Student) => {
    navigate(viewToPath('student-detail', { studentId: student.id, pt: true }));
  };

  const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

  const findDuplicatePhone = (phone: string, excludeId?: string) => {
    const cleaned = normalizePhone(phone);
    if (cleaned.length < 6) return null;
    return students.find((s: any) => {
      if (excludeId && s.id === excludeId) return false;
      const p = normalizePhone((s as any).telefono ?? (s as any).phone ?? '');
      return p.length >= 6 && p === cleaned;
    }) ?? null;
  };

  const handleCreateStudent = async (studentData: Partial<Student>, registerPayment: boolean) => {
    const phone = (studentData as any).telefono ?? (studentData as any).phone ?? '';
    if (phone.trim()) {
      const dup = findDuplicatePhone(phone);
      if (dup) {
        const dupName = `${(dup as any).nombre ?? ''} ${(dup as any).apellido ?? ''}`.trim();
        toast.error(`Ya existe un cliente con ese teléfono: ${dupName}`);
        return;
      }
    }
    try {
      await api.students.create({ ...studentData, gym_id: gymId });
      setStudents(await api.students.getAll(gymId));
      navigate('/clients');
    } catch (error: any) {
      toast.error(`No se pudo crear el cliente: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const handleUpdateStudent = async (id: string, updates: any) => {
    const phone = updates.telefono ?? updates.phone ?? '';
    if (phone.trim()) {
      const dup = findDuplicatePhone(phone, id);
      if (dup) {
        const dupName = `${(dup as any).nombre ?? ''} ${(dup as any).apellido ?? ''}`.trim();
        toast.error(`Ya existe un cliente con ese teléfono: ${dupName}`);
        return;
      }
    }
    try {
      await api.students.update(id, updates);
      setStudents(await api.students.getAll(gymId));
    } catch (error: any) {
      toast.error(`No se pudo guardar los cambios: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await api.students.delete(id, gymId);
      setStudents(await api.students.getAll(gymId));
      navigate('/clients');
    } catch (error: any) {
      toast.error(`No se pudo eliminar el cliente: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':      return 'Panel General';
      case 'students':       return 'Clientes';
      case 'student-detail': return 'Detalle de Cliente';
      case 'workouts':       return 'Rutinas';
      case 'settings':       return 'Ajustes';
      case 'new-student':    return 'Nuevo Cliente';
      default:               return 'entrenApp PT';
    }
  };

  const loadingEl = isLoading
    ? <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
    : null;

  const PTStudentDetailRoute = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const student = students.find((s: any) => s.id === studentId) ?? null;

    if (isLoading) return loadingEl;
    if (!student) return <Navigate to="/clients" replace />;

    return (
      <ClientDetailView
        student={student}
        plans={plans}
        gymId={gymId}
        onBack={() => navigate('/clients')}
        onUpdateStudent={handleUpdateStudent}
        onDeleteStudent={handleDeleteStudent}
      />
    );
  };

  return (
    <PTShell
      currentView={currentView === 'student-detail' ? 'students' : currentView}
      onNavigate={handleNavigate}
      title={getViewTitle()}
      onLogout={onLogout}
    >
      <SubscriptionGuard subscription={gymSubscription}>
        <Routes>
          <Route path="/" element={
            loadingEl ?? (
              <PTDashboardView
                onNavigate={handleNavigate}
                students={students}
                onSelectStudent={handleSelectStudent}
              />
            )
          } />
          <Route path="/clients" element={
            loadingEl ?? (
              <StudentsView onSelectStudent={handleSelectStudent} students={students} onNavigate={handleNavigate} gymType="personal_trainer" />
            )
          } />
          <Route path="/clients/new" element={
            loadingEl ?? (
              <NewStudentView
                plans={plans}
                onBack={() => navigate('/clients')}
                onCreateStudent={handleCreateStudent}
                gymType="personal_trainer"
              />
            )
          } />
          <Route path="/clients/:studentId" element={<PTStudentDetailRoute />} />
          <Route path="/workouts" element={
            loadingEl ?? <WorkoutPlansView gymId={gymId} />
          } />
          <Route path="/settings" element={
            loadingEl ?? (
              <SettingsView
                onNavigate={handleNavigate}
                canManageSettings={true}
                shiftsEnabled={false}
                onToggleShifts={() => {}}
                gymId={gymId}
                gymName={gymSubscription?.gym_name}
              />
            )
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SubscriptionGuard>
    </PTShell>
  );
}
