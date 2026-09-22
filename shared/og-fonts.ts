// OGP 画像(next/og の ImageResponse)用フォントローダー。
// opengraph-image / api/og など複数の生成元で共有する。

const FONT_FAMILY = 'Noto Sans JP';

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 700;
  style: 'normal';
};

async function loadWeight(weight: number, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(FONT_FAMILY)}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const fontUrl = css.match(/src:\s*url\((https:\/\/[^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error(`failed to parse font css for weight ${weight}`);
  const res = await fetch(fontUrl);
  if (!res.ok) throw new Error(`failed to fetch font for weight ${weight}`);
  return res.arrayBuffer();
}

/**
 * OGP 画像用に Noto Sans JP(400/500/700)を Google Fonts から取得する。
 * UA を付けないと CSS2 は woff2 ではなく ttf を返すので Satori がそのまま使える。
 * text に渡した文字だけサブセット取得して転送量を抑える。
 * 取得に失敗しても画像生成は止めない(デフォルトフォントにフォールバックさせる)。
 */
async function loadOgFonts(text: string): Promise<OgFont[] | undefined> {
  try {
    const [regular, medium, bold] = await Promise.all([
      loadWeight(400, text),
      loadWeight(500, text),
      loadWeight(700, text),
    ]);
    return [
      { name: FONT_FAMILY, data: regular, weight: 400, style: 'normal' },
      { name: FONT_FAMILY, data: medium, weight: 500, style: 'normal' },
      { name: FONT_FAMILY, data: bold, weight: 700, style: 'normal' },
    ];
  } catch {
    return undefined;
  }
}

export type { OgFont };
export { FONT_FAMILY, loadOgFonts };
