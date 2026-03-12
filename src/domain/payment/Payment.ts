export interface Payment {
  id: string

  gymId: string
  studentId: string
  planId: string

  amount: number

  dueDate: string
  paidAt?: string

  status: "pending" | "paid" | "overdue"

  createdAt: string
}