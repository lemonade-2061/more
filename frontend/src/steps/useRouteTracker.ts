import { useCallback, useRef, useState } from 'react';

export type RoutePoint = { lat: number; lng: number; t: number };

// 精度がこれより悪い測位は捨てる (屋内のデタラメな点で経路が毛玉になるのを防ぐ)
const MAX_ACCURACY_M = 50;
// 前の点からこれ以上動いていなければ記録しない (静止中のジッタ対策)
const MIN_MOVE_M = 3;

// 2点間の距離 (m)。ハバサイン公式
export function distanceM(a: RoutePoint, b: RoutePoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// 計測中の GPS 経路を記録するフック。
// 屋内や GPS 拒否時は点が貯まらないだけで、歩数計測には影響しない (完全におまけ扱い)。
export function useRouteTracker() {
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const watchIdRef = useRef<number | null>(null);

  const start = useCallback(() => {
    setPoints([]);
    if (!('geolocation' in navigator)) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.accuracy > MAX_ACCURACY_M) return;
        const p: RoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          t: pos.timestamp,
        };
        setPoints((prev) => {
          const last = prev[prev.length - 1];
          if (last && distanceM(last, p) < MIN_MOVE_M) return prev;
          return [...prev, p];
        });
      },
      () => {
        // 拒否・測位失敗は無視 (経路なしで続行)
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    );
  }, []);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  return { points, start, stop };
}
