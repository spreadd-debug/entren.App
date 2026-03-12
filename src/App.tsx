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
import { ThemeProvider } from './context/ThemeContext';

import {
  Student,
  Payment,
  Plan,
  ReminderLog,
  ReminderRule,
  MessageTemplate,
  AutomationStatus,
} from '../shared/types';

import { api } from './services/api';

type View =
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
  | 'workouts';

export default function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const gymId = '11111111-1111-1111-1111-111111111111';

  const currentUserRole = CURRENT_USER.role;
  const canViewFinancials = currentUserRole === 'admin';
  const canManageSettings = currentUserRole === 'admin';
  const isStudentPortalMode = window.location.search.includes("student=1");

const [studentPortalId, setStudentPortalId] = useState<string | null>(
  localStorage.getItem("studentPortalId")
);

  useEffect(() => {

    if (!isAuthenticated) return;

    const fetchData = async () => {

      setIsLoading(true);

      const results = await Promise.allSettled([
        api.students.getAll(gymId),
        api.payments.getAll(gymId),
        api.plans.getAll(gymId),
        api.automation.getLogs(gymId),
        api.automation.getStatus(gymId),
      ]);

      const [studentsRes, paymentsRes, plansRes, logsRes, statusRes] = results;

      if (studentsRes.status === 'fulfilled') {
        setStudents(Array.isArray(studentsRes.value) ? studentsRes.value : []);
      } else {
        console.error('Error fetching students:', studentsRes.reason);
        setStudents([]);
      }

      if (paymentsRes.status === 'fulfilled') {
        setPayments(Array.isArray(paymentsRes.value) ? paymentsRes.value : []);
      } else {
        console.error('Error fetching payments:', paymentsRes.reason);
        setPayments([]);
      }

      if (plansRes.status === 'fulfilled') {
        setPlans(Array.isArray(plansRes.value) ? plansRes.value : []);
      } else {
        console.error('Error fetching plans:', plansRes.reason);
        setPlans([]);
      }

      if (logsRes.status === 'fulfilled') {
        setReminderLogs(Array.isArray(logsRes.value) ? logsRes.value : []);
      } else {
        console.error('Error fetching automation logs:', logsRes.reason);
        setReminderLogs([]);
      }

      if (statusRes.status === 'fulfilled') {
        setAutomationStatus(statusRes.value ?? null);
      } else {
        console.error('Error fetching automation status:', statusRes.reason);
        setAutomationStatus(null);
      }

      setIsLoading(false);
    };

    fetchData();

  }, [isAuthenticated]);

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

  const handleNavigate = (view: string) => {

    setCurrentView(view as View);

    if (view !== 'student-detail') {
      setSelectedStudent(null);
    }

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

      await api.payments.register({
        ...paymentData,
        gymId,
      });

      const [updatedStudents, updatedPayments] = await Promise.all([
        api.students.getAll(gymId),
        api.payments.getAll(gymId),
      ]);

      setStudents(updatedStudents);
      setPayments(updatedPayments);

      if (selectedStudent?.id === paymentData.studentId) {

        const updatedStudent =
          updatedStudents.find((s: any) => s.id === paymentData.studentId) ?? null;

        setSelectedStudent(updatedStudent);

      }

    } catch (error) {

      console.error('Error registering payment:', error);

    }

  };

  const handleSavePlan = async (plan: Partial<Plan>) => {

    try {

      if ((plan as any).id) {
        await api.plans.update((plan as any).id, plan);
      } else {
        await api.plans.create({ ...plan, gym_id: gymId });
      }

      const updatedPlans = await api.plans.getAll(gymId);
      setPlans(updatedPlans);

    } catch (error) {

      console.error('Error saving plan:', error);

    }

  };

  const handleDeletePlan = async (id: string) => {

    try {

      await api.plans.delete(id);

      const updatedPlans = await api.plans.getAll(gymId);
      setPlans(updatedPlans);

    } catch (error) {

      console.error('Error deleting plan:', error);

    }

  };

  const handleCreateStudent = async (
    studentData: Partial<Student>,
    registerPayment: boolean
  ) => {

    try {

      const newStudent: any = await api.students.create({
        ...studentData,
        gym_id: gymId,
      });

      if (registerPayment) {

        const selectedPlan: any = plans.find(
          (p: any) => p.id === (newStudent.plan_id ?? newStudent.planId)
        );

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

    } catch (error) {

      console.error('Error creating student:', error);

    }

  };

  const handleUpdateStudent = async (id: string, updates: any) => {

    try {

      await api.students.update(id, updates);

      const updatedStudents = await api.students.getAll(gymId);
      setStudents(updatedStudents);

      const updatedStudent =
        updatedStudents.find((s: any) => s.id === id) ?? null;

      setSelectedStudent(updatedStudent);

    } catch (error) {

      console.error('Error updating student:', error);

    }

  };

  const handleDeleteStudent = async (id: string) => {

    try {

      await api.students.delete(id);

      const updatedStudents = await api.students.getAll(gymId);
      setStudents(updatedStudents);

      setSelectedStudent(null);
      setCurrentView('students');

    } catch (error) {

      console.error('Error deleting student:', error);

    }

  };

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

  const renderView = () => {

    if (isLoading) {
      return <div className="flex items-center justify-center h-screen">Cargando...</div>;
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
          />
        );

      case 'students':
        return (
          <StudentsView
            onSelectStudent={handleSelectStudent}
            students={students}
            onNavigate={handleNavigate}
          />
        );

      case 'student-detail':
        return selectedStudent ? (
          <StudentDetailView
            student={selectedStudent}
            payments={payments.filter(
              (p: any) => (p.studentId ?? p.student_id) === selectedStudent.id
            )}
            plans={plans}
            onBack={() => setCurrentView('students')}
            onRegisterPayment={handleRegisterPayment}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        ) : (
          <StudentsView
            onSelectStudent={handleSelectStudent}
            students={students}
            onNavigate={handleNavigate}
          />
        );

      case 'payments':
        return <PaymentsView payments={payments} canViewFinancials={canViewFinancials} />;

      case 'defaulters':
        return (
          <DefaultersView
            students={students}
            plans={plans}
            onRegisterPayment={handleRegisterPayment}
          />
        );

        case 'settings':
  return (
    <SettingsView
      onNavigate={handleNavigate}
      canManageSettings={canManageSettings}
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
          />
        );

    }

  };

  const getViewTitle = () => {

    switch (currentView) {

      case 'dashboard':
        return 'Panel General';

      case 'students':
        return 'Alumnos';

      case 'student-detail':
        return 'Detalle de Alumno';

      case 'payments':
        return 'Gestión de Pagos';

      case 'defaulters':
        return 'Morosos y Deudas';

      case 'settings':
        return 'Ajustes';

      case 'automation':
        return 'Automatización';

      case 'plans':
        return 'Planes y Precios';

      case 'workouts':
        return 'Rutinas';

      case 'new-student':
        return 'Nuevo Alumno';

      default:
        return 'entrenApp';

    }

  };

  return (
    <ThemeProvider>
      <AppShell
        currentView={currentView === 'student-detail' ? 'students' : currentView}
        onNavigate={handleNavigate}
        title={getViewTitle()}
      >
        {renderView()}
      </AppShell>
    </ThemeProvider>
  );

}
