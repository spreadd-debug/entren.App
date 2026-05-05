import {
  ShoppingBasket, Coffee, UtensilsCrossed, Fuel, Car, Bus, Home, Plug, Wifi,
  Shirt, HeartPulse, Pill, Dumbbell, Sparkles, Film, Smartphone, PawPrint,
  Gift, Plane, GraduationCap, Receipt, Tag, Briefcase, Laptop, TrendingUp,
  Undo2, ShoppingBag, PiggyBank, type LucideIcon,
} from 'lucide-react';

// Mapping nombre → componente lucide. La columna `icon` de personal_categories
// guarda el nombre como string (ej. 'Coffee') y acá lo resolvemos al componente.
// Si el string no matchea (categoría custom sin ícono), cae al Tag genérico.
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // expense
  ShoppingBasket, Coffee, UtensilsCrossed, Fuel, Car, Bus, Home, Plug, Wifi,
  Shirt, HeartPulse, Pill, Dumbbell, Sparkles, Film, Smartphone, PawPrint,
  Gift, Plane, GraduationCap, Receipt,
  // income
  Briefcase, Laptop, TrendingUp, Undo2, ShoppingBag, PiggyBank,
  // fallback
  Tag,
};

export function resolveCategoryIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Tag;
  return CATEGORY_ICON_MAP[iconName] ?? Tag;
}
