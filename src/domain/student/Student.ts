export interface Student {
  id: string
  gymId: string

  firstName: string
  lastName: string
  phone?: string
  email?: string

  planId?: string
  dueDate?: string

  status: "active" | "inactive"

  createdAt: string
}