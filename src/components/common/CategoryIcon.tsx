import React from 'react';
import {
  Briefcase,
  Utensils,
  Car,
  Home,
  Zap,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  PiggyBank,
  Gift,
  Laptop,
  TrendingUp,
  Tag,
  Coffee,
  Plane,
  Film,
  Dumbbell,
  Shield,
  Smartphone,
  CreditCard,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Briefcase,
  Utensils,
  Car,
  Home,
  Zap,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  PiggyBank,
  Gift,
  Laptop,
  TrendingUp,
  Tag,
  Coffee,
  Plane,
  Film,
  Dumbbell,
  Shield,
  Smartphone,
  CreditCard,
};

interface CategoryIconProps {
  name?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name = 'Tag', className = 'w-4 h-4' }) => {
  const Component = ICON_MAP[name] || Tag;
  return <Component className={className} />;
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);
