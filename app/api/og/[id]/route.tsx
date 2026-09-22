import { ImageResponse } from 'next/og';
import { getArticleById } from '@/features/feed/web/queries';
import { FONT_FAMILY, loadOgFonts } from '@/shared/og-fonts';

// favicon と同じ 2×2 ドットマーク(ティールのグラデ地 + 対角=白 / 反対角=ミント)。
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15917a"/><stop offset="1" stop-color="#0c5f55"/></linearGradient></defs><rect width="44" height="44" rx="10" fill="url(#bg)"/><circle cx="16" cy="16" r="5.5" fill="#ffffff"/><circle cx="28" cy="16" r="5.5" fill="#c9f0e2"/><circle cx="16" cy="28" r="5.5" fill="#c9f0e2"/><circle cx="28" cy="28" r="5.5" fill="#ffffff"/></svg>`;

const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const palette = {
  ink: '#16181D',
  accent: '#0F766E',
  bg: '#FAFAF8',
  muted: '#9A9C9F',
};

const clamp = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

const formatDate = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

/**
 * 企業ファビコンを取得して data URI 化する(企業アバターに使う)。
 * 企業マスタにロゴが無いため、記事 URL のドメインから Google favicon サービスで取得する
 * (CompanyFavicon と同じ方針)。OG 生成を巻き込んで落とさないよう失敗は握りつぶす。
 */
async function loadFavicon(articleUrl: string): Promise<string | null> {
  try {
    const domain = new URL(articleUrl).hostname;
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * 記事のフォールバック OGP 画像(1200x630)を生成する。
 * 元記事に OGP 画像がある記事はここを通さず元画像をそのまま使うため(generateMetadata 側で分岐)、
 * このルートは「元画像がない記事」専用のプレースホルダ生成を担い、タイトルを主役に据える(ADR-0029)。
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const article = await getArticleById(id);
  const favicon = article ? await loadFavicon(article.url) : null;

  const brand = article?.company.brandColor ?? palette.accent;
  const company = article?.company.name ?? 'テクブロ';
  const author = article?.author ?? null;
  const dateStr = article ? formatDate(article.publishedAt) : '';
  const meta = [author, dateStr].filter(Boolean).join(' ・ ');
  const title = clamp(article?.title ?? 'テクブロ', 80);

  const fontText = ['テクブロ', company, meta, title].join('');
  const fonts = await loadOgFonts(fontText);

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
        position: 'relative',
      }}
    >
      {/* テクブロのティールの装飾(右下)。余白を埋める。企業によらず色を揃える。 */}
      <div
        style={{
          position: 'absolute',
          right: -40,
          bottom: -70,
          width: 340,
          height: 340,
          borderRadius: 170,
          background: palette.accent,
          opacity: 0.1,
        }}
      />

      {/* ヘッダー: 企業ファビコン + 企業名 / 著者・日付、右に テクブロ ロゴ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {favicon ? (
            // biome-ignore lint/performance/noImgElement: Satori は data URI の img で画像を描画する
            <img
              width={44}
              height={44}
              alt=""
              src={favicon}
              style={{ borderRadius: 10, background: '#FFFFFF', border: '1px solid #E7E5E0' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: 44,
                height: 44,
                borderRadius: 22,
                background: brand,
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: palette.ink }}>
              {company}
            </div>
            {meta ? (
              <div style={{ display: 'flex', fontSize: 20, color: palette.muted }}>{meta}</div>
            ) : null}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: palette.ink }}>
            テク
            <div style={{ display: 'flex', color: palette.accent }}>ブロ</div>
          </div>
          {/* biome-ignore lint/performance/noImgElement: ImageResponse(Satori)は data URI の img で SVG を描画する */}
          <img width={44} height={44} alt="" src={dataUri(ICON)} />
        </div>
      </div>

      {/* タイトル(主役)。縦中央に大きく置く。 */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            fontSize: 60,
            fontWeight: 700,
            color: palette.ink,
            lineHeight: 1.28,
            letterSpacing: -1.5,
          }}
        >
          {title}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts,
      headers: {
        // 記事内容はほぼ不変。生成コストを抑えるため CDN/ブラウザにキャッシュさせる。
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
