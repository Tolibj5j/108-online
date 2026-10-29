import { Crown, WifiOff } from 'lucide-react';

const PALETTES: [string, string][] = [
  ['#f59e0b', '#b45309'],
  ['#38bdf8', '#1d4ed8'],
  ['#f472b6', '#be185d'],
  ['#34d399', '#047857'],
  ['#a78bfa', '#6d28d9'],
  ['#fb7185', '#b91c1c'],
  ['#facc15', '#a16207'],
  ['#2dd4bf', '#0f766e'],
  ['#c084fc', '#7e22ce'],
  ['#fdba74', '#c2410c'],
  ['#93c5fd', '#3730a3'],
  ['#86efac', '#15803d'],
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : [...(parts[0] ?? '?')].slice(0, 2).join('');
  return letters.toLocaleUpperCase();
}

interface Props {
  name: string;
  avatar: number;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  offline?: boolean;
  host?: boolean;
}

const SIZES = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-base', lg: 'h-16 w-16 text-xl' };

export function Avatar({ name, avatar, size = 'md', active = false, offline = false, host = false }: Props) {
  const [from, to] = PALETTES[((avatar % PALETTES.length) + PALETTES.length) % PALETTES.length]!;
  return (
    <div className="relative shrink-0">
      {active && <span className="turn-ring absolute -inset-1.5 rounded-full" aria-hidden />}
      <div
        className={`relative flex items-center justify-center rounded-full font-display font-bold text-white shadow-lg ring-2 ${
          active ? 'ring-gold-300' : 'ring-black/40'
        } ${SIZES[size]} ${offline ? 'grayscale opacity-60' : ''}`}
        style={{ background: `radial-gradient(circle at 30% 25%, ${from}, ${to})` }}
      >
        <span className="drop-shadow">{initials(name)}</span>
      </div>
      {host && (
        <span className="absolute -right-1 -top-1.5 rounded-full bg-wood-900 p-0.5 ring-1 ring-gold-500" title="Xost">
          <Crown className="h-3.5 w-3.5 text-gold-400" />
        </span>
      )}
      {offline && (
        <span className="absolute -bottom-1 -right-1 rounded-full bg-red-900 p-0.5 ring-1 ring-red-400" title="Ulanmagan">
          <WifiOff className="h-3 w-3 text-red-100" />
        </span>
      )}
    </div>
  );
}
