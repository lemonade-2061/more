// 距離の表示用フォーマット。1000m 以上は km にする (1500 → "1.5", "km")
export function formatDistanceParts(meters: number): { value: string; unit: 'm' | 'km' } {
  if (Math.abs(meters) < 1000) {
    return { value: String(Math.round(meters)), unit: 'm' };
  }
  const km = meters / 1000;
  // 1.0km → "1km"、1.53km → "1.5km" (小数1桁、末尾の .0 は落とす)
  const value = (Math.round(km * 10) / 10).toString();
  return { value, unit: 'km' };
}

export function formatDistance(meters: number): string {
  const { value, unit } = formatDistanceParts(meters);
  return `${value}${unit}`;
}
