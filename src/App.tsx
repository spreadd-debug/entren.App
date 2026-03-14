import { CURRENT_USER } from './config/currentUser';
import React, { useState, useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { DashboardView } from './pages/DashboardView';
import { StudentsView } from './pages/StudentsView';
import { StudentDetailView } from './pages/StudentDetailView';
import { PaymentsView } from './pages/PaymentsView';
import { DefaultersView } from './pages/DefaultersView';
import { SettingsView } from './pages/SettingsView';
import StudentPortalAccessView from "./pages/StudentPortalAccessView";
import StudentPortalView from "./pages/StudentPortalView";
import { PlansView } from './pages/PlansView';
import { NewStudentView } from './pages/NewStudentView';
import { LoginView } from './pages/LoginView';
import { RegisterGymView } from './pages/RegisterGymView';
import { AutomationView } from './pages/AutomationView';
import WorkoutPlansView from "./pages/WorkoutPlansView";
import { ShiftsView } from './pages/ShiftsView';
import CheckInView from './pages/CheckInView';
import { SuperAdminApp } from './pages/SuperAdminApp';
import { SubscriptionGuard } from './components/SubscriptionGuard';
import { ThemeProvider } from './context/ThemeContext';
import { ShiftService } from './services/ShiftService';

import {
  Student,
  Payment,
  Plan,
  ReminderLog,
  ReminderRule,
  MessageTemplate,
  AutomationStatus,
  GymSubscription,
} from '../shared/types';

import { api } from './services/api';

type GymView =
  | 'dashboard'
  | 'students'
  | 'student-detail'
  | 'payments'
  | 'defaulters'
  | 'settings'
  | 'register'
  | 'plans'
  | 'new-student'
  | 'automation'
  | 'workouts'
  | 'shifts';

export default function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const isSuperAdmin = sessionStorage.getItem('userRole') === 'superadmin';

  const isStudentPortalMode = window.location.search.includes("student=1");
  const checkinGymId = new URLSearchParams(window.location.search).get('checkin');

  const [studentPortalId, setStudentPortalId] = useState<string | null>(
    localStorage.getItem("studentPortalId")
  );

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
          onSuccess={() => {
            setIsRegistering(false);
            alert('¡Gimnasio registrado con éxito! Ahora podés iniciar sesión.');
          }}
        />
      </ThemeProvider>
    );
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <LoginView
          onLogin={() => setIsAuthenticated(true)}
          onRegisterClick={() => setIsRegistering(true)}
        />
      </ThemeProvider>
    );
  }

  // ── Superadmin: completely separate experience ───────────────────────────────

  if (isSuperAdmin) {
    return (
      <ThemeProvider>
        <SuperAdminApp />
      </ThemeProvider>
    );
  }

  // ── Gym app ──────────────────────────────────────────────────────────────────

  return (
    <ThemeProvider>
      <GymApp />
    </ThemeProvider>
  );
}

// ── GymApp: all gym-specific state and rendering ──────────────────────────────

function GymApp() {
  const gymId = '11111111-1111-1111-1111-111111111111';

  const currentUserRole = CURRENT_USER.role;
  const canViewFinancials = currentUserRole === 'admin';
  const canManageSettings = currentUserRole === 'admin';

  const [currentView, setCurrentView] = useState<GymView>('dashboard');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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
    setCurrentView(view as GymView);
    if (view !== 'student-detail') setSelectedStudent(null);
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setCurrentView('student-detail');
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
      if (selectedStudent?.id === paymentData.studentId) {
        setSelectedStudent(updatedStudents.find((s: any) => s.id === paymentData.studentId) ?? null);
      }
    } catch (error: any) {
      console.error('Error registering payment:', error);
      alert(`No se pudo registrar el pago: ${error?.message ?? 'Error desconocido'}`);
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
        alert(`Ya existe un alumno con ese teléfono: ${dupName}`);
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
      setCurrentView('students');
    } catch (error: any) {
      console.error('Error creating student:', error);
      alert(`No se pudo crear el alumno: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const handleUpdateStudent = async (id: string, updates: any) => {
    const phone = updates.telefono ?? updates.phone ?? '';
    if (phone.trim()) {
      const dup = findDuplicatePhone(phone, id);
      if (dup) {
        const dupName = `${(dup as any).nombre ?? ''} ${(dup as any).apellido ?? ''}`.trim();
        alert(`Ya existe un alumno con ese teléfono: ${dupName}`);
        return;
      }
    }
    try {
      await api.students.update(id, updates);
      const updatedStudents = await api.students.getAll(gymId);
      setStudents(updatedStudents);
      setSelectedStudent(updatedStudents.find((s: any) => s.id === id) ?? null);
    } catch (error: any) {
      console.error('Error updating student:', error);
      alert(`No se pudo guardar los cambios: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await api.students.delete(id);
      const updatedStudents = await api.students.getAll(gymId);
      setStudents(updatedStudents);
      setSelectedStudent(null);
      setCurrentView('students');
    } catch (error: any) {
      console.error('Error deleting student:', error);
      alert(`No se pudo eliminar el alumno: ${error?.message ?? 'Error desconocido'}`);
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

  const renderView = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={handleNavigate}
            students={students}
            payments={payments}
            onSelectStudent={handleSelectStudent}
            canViewFinancials={canViewFinancials}
            shiftsEnabled={shiftsEnabled}
            todayShifts={todayShifts}
          />
        );
      case 'students':
        return <StudentsView onSelectStudent={handleSelectStudent} students={students} onNavigate={handleNavigate} />;
      case 'student-detail':
        return selectedStudent ? (
          <StudentDetailView
            student={selectedStudent}
            payments={payments.filter((p: any) => (p.studentId ?? p.student_id) === selectedStudent.id)}
            plans={plans}
            onBack={() => setCurrentView('students')}
            onRegisterPayment={handleRegisterPayment}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        ) : (
          <StudentsView onSelectStudent={handleSelectStudent} students={students} onNavigate={handleNavigate} />
        );
      case 'payments':
        return (
          <PaymentsView
            payments={payments}
            canViewFinancials={canViewFinancials}
            students={students}
            plans={plans}
            onRegisterPayment={handleRegisterPayment}
          />
        );
      case 'defaulters':
        return <DefaultersView students={students} plans={plans} onRegisterPayment={handleRegisterPayment} />;
      case 'shifts':
        return <ShiftsView gymId={gymId} students={students} />;
      case 'settings':
        return (
          <SettingsView
            onNavigate={handleNavigate}
            canManageSettings={canManageSettings}
            shiftsEnabled={shiftsEnabled}
            onToggleShifts={handleToggleShifts}
          />
        );
      case 'automation':
        return (
          <AutomationView
            rules={reminderRules}
            templates={messageTemplates}
            logs={reminderLogs}
            status={automationStatus}
            onBack={() => setCurrentView('settings')}
            onRunAutomation={handleRunAutomation}
            onUpdateRule={() => {}}
            onUpdateTemplate={() => {}}
          />
        );
      case 'plans':
        return (
          <PlansView
            plans={plans}
            onBack={() => setCurrentView('settings')}
            onSavePlan={handleSavePlan}
            onDeletePlan={handleDeletePlan}
          />
        );
      case 'workouts':
        return <WorkoutPlansView />;
      case 'new-student':
        return (
          <NewStudentView
            plans={plans}
            onBack={() => setCurrentView('students')}
            onCreateStudent={handleCreateStudent}
          />
        );
      default:
        return (
          <DashboardView
            onNavigate={handleNavigate}
            students={students}
            payments={payments}
            onSelectStudent={handleSelectStudent}
            canViewFinancials={canViewFinancials}
            shiftsEnabled={shiftsEnabled}
            todayShifts={todayShifts}
          />
        );
    }
  };

  return (
    <AppShell
      currentView={currentView === 'student-detail' ? 'students' : currentView}
      onNavigate={handleNavigate}
      title={getViewTitle()}
      shiftsEnabled={shiftsEnabled}
    >
      <SubscriptionGuard subscription={gymSubscription}>
        {renderView()}
      </SubscriptionGuard>
    </AppShell>
  );
}
