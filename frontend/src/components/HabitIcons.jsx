import {
  Star, Heart, Zap, Book, Dumbbell, Droplets, Brain, Moon,
  Sun, Music, Code, Coffee,
} from 'lucide-react';

const ICON_MAP = {
  star: Star, heart: Heart, zap: Zap, book: Book,
  dumbbell: Dumbbell, droplets: Droplets, brain: Brain,
  moon: Moon, sun: Sun, music: Music, code: Code, coffee: Coffee,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP);

export const COLOR_OPTIONS = [
  '#6366f1', '#ec4899', '#f97316', '#22c55e',
  '#06b6d4', '#a855f7', '#eab308', '#ef4444',
];

export function HabitIcon({ icon, color, size = 20, bgSize = 44 }) {
  const Icon = ICON_MAP[icon] || Star;
  return (
    <div
      className="habit-icon-wrap"
      style={{
        width: bgSize,
        height: bgSize,
        background: color + '22',
        border: `1px solid ${color}44`,
      }}
    >
      <Icon size={size} color={color} strokeWidth={2} />
    </div>
  );
}

export function IconPicker({ value, onChange }) {
  return (
    <div className="icon-picker">
      {ICON_OPTIONS.map((icon) => {
        const Icon = ICON_MAP[icon];
        return (
          <button
            key={icon}
            type="button"
            className={`icon-option ${value === icon ? 'selected' : ''}`}
            onClick={() => onChange(icon)}
            title={icon}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}

export function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {COLOR_OPTIONS.map((color) => (
        <button
          key={color}
          type="button"
          className={`color-swatch ${value === color ? 'selected' : ''}`}
          style={{ background: color }}
          onClick={() => onChange(color)}
          title={color}
        />
      ))}
    </div>
  );
}
