export type ShinePreset = 'palette1' | 'palette2' | 'palette3' | 'palette4' | 'palette5';

const SHINE_PRESET_COLORS: Record<ShinePreset, string[]> = {
  palette1: ['#3B82F6', '#8B5CF6', '#F97316'],
  palette2: ['#3B82F6', '#8B5CF6', '#F472B6'],
  palette3: ['#10B981', '#06B6D4', '#3B82F6'],
  palette4: ['#F59E0B', '#F97316', '#EF4444'],
  palette5: ['#22D3EE', '#A78BFA', '#34D399'],
};

export const SHINE_PRESETS: { key: ShinePreset; colors: string[] }[] = [
  { key: 'palette1', colors: SHINE_PRESET_COLORS.palette1 },
  { key: 'palette2', colors: SHINE_PRESET_COLORS.palette2 },
  { key: 'palette3', colors: SHINE_PRESET_COLORS.palette3 },
  { key: 'palette4', colors: SHINE_PRESET_COLORS.palette4 },
  { key: 'palette5', colors: SHINE_PRESET_COLORS.palette5 },
];

export function getShineColors(preset: ShinePreset): string[] {
  return SHINE_PRESET_COLORS[preset] || SHINE_PRESET_COLORS.palette2;
}
