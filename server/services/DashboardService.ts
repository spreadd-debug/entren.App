
import { StudentService } from './StudentService';
import { PaymentService } from './PaymentService';
import { DashboardStats } from '../../shared/types';

export const DashboardService = {
  async getStats(gymId: string): Promise<DashboardStats> {
    const students = await StudentService.getAll(gymId);
    const payments = await PaymentService.getAll(gymId);

    const activeCount = students.filter(s => s.status === 'active').length;
    const expiredCount = students.filter(s => s.status === 'expired').length;
    const expiringCount = students.filter(s => s.status === 'expiring').length;

    // Monthly income (current month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyIncome = payments
      .filter(p => {
        const pDate = new Date(p.date);
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingStudents = students
      .filter(s => s.status === 'expired' || s.status === 'expiring')
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

    return {
      activeCount,
      expiredCount,
      expiringCount,
      monthlyIncome,
      pendingStudents
    };
  }
};
