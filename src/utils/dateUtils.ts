
import { StudentStatus } from '../types';

/**
 * Calculates the next due date adding a specific number of days to the payment date.
 */
export const calculateNextDueDate = (paymentDate: string, days: number = 30): string => {
  const date = new Date(paymentDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

/**
 * Determines the student status based on the next due date.
 * AL DIA: > 3 days before due date
 * POR VENCER: <= 3 days before due date
 * VENCIDO: due date < today
 */
export const getStudentStatus = (nextDueDate: string): StudentStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(nextDueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 3) return 'expiring';
  return 'active';
};

/**
 * Formats a date string to a more readable format (DD/MM/YYYY)
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Calculates days late
 */
export const getDaysLate = (nextDueDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(nextDueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};
