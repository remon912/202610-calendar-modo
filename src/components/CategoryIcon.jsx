import { createElement } from 'react';
import { BookOpen, Dumbbell, GraduationCap, Languages, Sprout, Target } from 'lucide-react';

const ICONS = { reading: BookOpen, exercise: Dumbbell, study: GraduationCap, language: Languages, habit: Sprout, etc: Target };

export default function CategoryIcon({ id, size = 16 }) {
  return createElement(ICONS[id] || Target, { size });
}
