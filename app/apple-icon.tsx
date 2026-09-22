import { ImageResponse } from 'next/og';

// iOS ホーム画面用アイコン(180x180)。iOS 側で角丸マスクされるため全面塗り。
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// favicon(app/icon.svg)と同じ 2×2 ドットマークを 180 スケールで描く。
// ティールのグラデ地に、対角=白 / 反対角=ミントの 4 ドット。
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15917a"/><stop offset="1" stop-color="#0c5f55"/></linearGradient></defs><rect width="180" height="180" fill="url(#bg)"/><circle cx="64.8" cy="64.8" r="16.2" fill="#ffffff"/><circle cx="115.2" cy="64.8" r="16.2" fill="#c9f0e2"/><circle cx="64.8" cy="115.2" r="16.2" fill="#c9f0e2"/><circle cx="115.2" cy="115.2" r="16.2" fill="#ffffff"/></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {/* biome-ignore lint/performance/noImgElement: ImageResponse(Satori)は data URI の img で SVG を描画する */}
      <img
        width={180}
        height={180}
        alt="テクブロ"
        src={`data:image/svg+xml;utf8,${encodeURIComponent(ICON)}`}
      />
    </div>,
    size,
  );
}
