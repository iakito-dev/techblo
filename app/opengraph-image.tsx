import { ImageResponse } from 'next/og';
import { FONT_FAMILY, loadOgFonts } from '@/shared/og-fonts';

// サイト共通の OGP/Twitter 画像。Next が <meta og:image>/<meta twitter:image> を自動付与する。
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'テクブロ — 有名テック企業の新着ブログをイッキ読み';

// favicon と同じ 2×2 ドットマーク(ティールのグラデ地 + 対角=白 / 反対角=ミント)。
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15917a"/><stop offset="1" stop-color="#0c5f55"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#bg)"/><circle cx="23" cy="23" r="6" fill="#ffffff"/><circle cx="41" cy="23" r="6" fill="#c9f0e2"/><circle cx="23" cy="41" r="6" fill="#c9f0e2"/><circle cx="41" cy="41" r="6" fill="#ffffff"/></svg>`;

// カードの人気度・保存・お気に入りアイコン(実際のフィードカードの footer を模す)。
const FLAME = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path d="M10 1 C 11 6 16 7 13 13 C 15 11 14 17 10 19 C 6 17 5 11 7 13 C 4 7 9 6 10 1 Z" fill="#ff7a1a"/></svg>`;
const BOOKMARK = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path d="M5 3 H19 V22 L12 16 L5 22 Z" fill="none" stroke="#b6b4ad" stroke-width="2" stroke-linejoin="round"/></svg>`;
const HEART = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path d="M12 7 C 12 3 5 3 5 8 C 5 13 12 18 12 18 C 12 18 19 13 19 8 C 19 3 12 3 12 7 Z" fill="none" stroke="#b6b4ad" stroke-width="2" stroke-linejoin="round"/></svg>`;

const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const palette = {
  ink: '#16181D',
  accent: '#0F766E',
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  border: '#E7E5E0',
  muted: '#9A9C9F',
  desc: '#5F6368',
};

const tagStyles = {
  gray: { background: '#EEF1EE', color: '#50635A' },
  blue: { background: '#E9EFF6', color: '#3A5B87' },
};

// 共有カードに載せる代表的な記事(社名は出さず、ジャンルが伝わる AI 系トピックで構成)。
const cards: {
  avatar: string;
  time: string;
  fire: number;
  title: string;
  desc: string;
  tags: { label: string; kind: keyof typeof tagStyles }[];
}[] = [
  {
    avatar: 'linear-gradient(135deg, #6B63FF 0%, #4338CA 100%)',
    time: '3時間前',
    fire: 24,
    title: 'LLMの本番運用でわかった勘所',
    desc: '本番で動かして初めて見えたことを書きました',
    tags: [
      { label: 'LLM', kind: 'gray' },
      { label: '生成AI', kind: 'blue' },
    ],
  },
  {
    avatar: 'linear-gradient(135deg, #22D3CE 0%, #0A8F95 100%)',
    time: '5時間前',
    fire: 17,
    title: 'RAGの検索精度を2倍にした話',
    desc: '分割と再ランキングを見直した記録です',
    tags: [
      { label: 'RAG', kind: 'gray' },
      { label: '検索', kind: 'gray' },
    ],
  },
  {
    avatar: 'linear-gradient(135deg, #FFA83D 0%, #E06F00 100%)',
    time: '昨日',
    fire: 31,
    title: 'AIエージェントの評価基盤を作った',
    desc: '品質をどう測るか社内で考えた内容です',
    tags: [
      { label: 'AIエージェント', kind: 'blue' },
      { label: '評価', kind: 'gray' },
    ],
  },
];

// 描画に使う全文字。Google Fonts のサブセット(text=)で必要グリフだけ取得し、フォント転送量を抑える。
const SUBSET_TEXT = [
  'テクブロ',
  '有名テック企業の新着ブログを、イッキ読み。',
  ...cards.flatMap((c) => [c.time, String(c.fire), c.title, c.desc, ...c.tags.map((t) => t.label)]),
].join('');

export default async function OpengraphImage() {
  const fonts = await loadOgFonts(SUBSET_TEXT);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '46px 60px',
        background: palette.bg,
        fontFamily: FONT_FAMILY,
        color: palette.ink,
      }}
    >
      {/* ロゴ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        {/* biome-ignore lint/performance/noImgElement: ImageResponse(Satori)は data URI の img で SVG を描画する */}
        <img width={56} height={56} alt="" src={dataUri(ICON)} />
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, letterSpacing: -0.5 }}>
          テク
          <div style={{ display: 'flex', color: palette.accent }}>ブロ</div>
        </div>
      </div>

      {/* 見出し */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1.18,
          }}
        >
          有名テック企業の新着ブログを、
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1.18,
            color: palette.accent,
          }}
        >
          イッキ読み。
        </div>
      </div>

      {/* 記事カード(実際のフィードカードを模した 3 枚) */}
      <div style={{ display: 'flex', gap: 24, flex: 1 }}>
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 344,
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 20,
              boxShadow: '0 12px 32px rgba(22,24,29,0.07)',
              padding: 26,
            }}
          >
            {/* アバター + 時刻 / 人気度 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    background: card.avatar,
                  }}
                />
                <div
                  style={{ display: 'flex', fontSize: 16, fontWeight: 400, color: palette.muted }}
                >
                  {card.time}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {/* biome-ignore lint/performance/noImgElement: Satori は data URI の img で SVG を描画する */}
                <img width={19} height={19} alt="" src={dataUri(FLAME)} />
                <div
                  style={{ display: 'flex', fontSize: 16, fontWeight: 500, color: palette.desc }}
                >
                  {card.fire}
                </div>
              </div>
            </div>

            {/* タイトル */}
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: -0.5,
                lineHeight: 1.34,
                marginBottom: 10,
              }}
            >
              {card.title}
            </div>

            {/* 説明 */}
            <div
              style={{
                display: 'flex',
                fontSize: 16,
                fontWeight: 400,
                color: palette.desc,
                lineHeight: 1.5,
              }}
            >
              {card.desc}
            </div>

            {/* タグ */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {card.tags.map((tag) => (
                <div
                  key={tag.label}
                  style={{
                    display: 'flex',
                    fontSize: 15,
                    fontWeight: 500,
                    padding: '5px 13px',
                    borderRadius: 999,
                    background: tagStyles[tag.kind].background,
                    color: tagStyles[tag.kind].color,
                  }}
                >
                  {tag.label}
                </div>
              ))}
            </div>

            {/* フッター(区切り線 + 保存 / お気に入り) */}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
              <div
                style={{ display: 'flex', height: 1, background: '#EEECE6', marginBottom: 14 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                {/* biome-ignore lint/performance/noImgElement: Satori は data URI の img で SVG を描画する */}
                <img width={22} height={22} alt="" src={dataUri(BOOKMARK)} />
                {/* biome-ignore lint/performance/noImgElement: Satori は data URI の img で SVG を描画する */}
                <img width={22} height={22} alt="" src={dataUri(HEART)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>,
    { ...size, fonts },
  );
}
