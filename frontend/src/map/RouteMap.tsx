import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RoutePoint } from '../steps/useRouteTracker';

interface RouteMapProps {
  points: RoutePoint[];
}

// 歩いた経路を OpenStreetMap 上にポリラインで表示する (GPS が取れた時だけ出す)
export default function RouteMap({ points }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || points.length < 2) return;

    const map = L.map(containerRef.current, { zoomControl: false });
    mapRef.current = map;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    const line = L.polyline(latlngs, { color: '#ff6b00', weight: 5 }).addTo(map);
    // マーカー画像はバンドラでパスが壊れやすいので circleMarker で始点/終点を打つ
    L.circleMarker(latlngs[0], { radius: 7, color: '#2a9d8f', fillOpacity: 1 })
      .addTo(map)
      .bindTooltip('スタート');
    L.circleMarker(latlngs[latlngs.length - 1], { radius: 7, color: '#e63946', fillOpacity: 1 })
      .addTo(map)
      .bindTooltip('ゴール');
    map.fitBounds(line.getBounds(), { padding: [24, 24] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points]);

  //記録点が2つ以下のとき地図を表示せず記録できなかったことを表示
  if (points.length < 2) {
    return(
      <div style={{ width: '100%', maxWidth: 440, margin: '16px auto 0' }}>
        <p style={{ margin: '0 0 4px', fontWeight: 'bold' }}>今回のルート</p>
        <p style={{ color: '#888', fontSize: 14 }}>
          GPSの記録がありませんでした (記録点: {points.length}個)。
          屋内や短時間の計測では取得できないことがあります。
        </p>
      </div>
    ); 
  }

  return (
    <div style={{ width: '100%', maxWidth: 440, margin: '16px auto 0' }}>
      <p style={{ margin: '0 0 4px', fontWeight: 'bold' }}>今回のルート</p>
      <div
        ref={containerRef}
        style={{ height: 240, borderRadius: 16, overflow: 'hidden' }}
      />
    </div>
  );
}
