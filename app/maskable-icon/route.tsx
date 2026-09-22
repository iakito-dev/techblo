import { ImageResponse } from 'next/og';

/**
 * Android アダプティブアイコン用の maskable PNG(512x512)。
 * 端末がマスク(円/角丸/雫など)で切り抜くため、ドットマークは安全領域(中央 80%)に収め、
 * 地はティールのグラデを全面に敷く(どの形に切られてもティールが残る)。
 * favicon(app/icon.svg)と同じ 2×2 ドットマークを縮小配置している。
 */
export function GET() {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15917a"/><stop offset="1" stop-color="#0c5f55"/></linearGradient></defs><rect width="512" height="512" fill="url(#bg)"/><circle cx="200" cy="200" r="42" fill="#ffffff"/><circle cx="312" cy="200" r="42" fill="#c9f0e2"/><circle cx="200" cy="312" r="42" fill="#c9f0e2"/><circle cx="312" cy="312" r="42" fill="#ffffff"/></svg>`;

  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {/* biome-ignore lint/performance/noImgElement: ImageResponse(Satori)は data URI の img で SVG を描画する */}
      <img
        width={512}
        height={512}
        alt="テクブロ"
        src={`data:image/svg+xml;utf8,${encodeURIComponent(icon)}`}
      />
    </div>,
    { width: 512, height: 512 },
  );
}
