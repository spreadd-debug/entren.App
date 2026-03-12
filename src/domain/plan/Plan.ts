export interface Plan {
  id: string
  gymId: string

  name: string
  price: number
  billingCycle: "monthly" | "weekly"

  createdAt: string
}