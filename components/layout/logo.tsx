import Link from 'next/link';
import { cn } from '@/shared/utils';

/**
 * ロゴの 2×2 ドット幾何マーク単体。対角=インク / 反対角=ティール。
 * ワードマークを置く余白が無い場所(モバイルフィードの検索行)で、アプリの識別子として使う。
 * 装飾扱い(aria-hidden)なので、単体で置くときは近くにアクセシブルな名前を持つ要素を用意しない。
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('grid shrink-0 grid-cols-2 gap-1', className)}>
      <span className="size-[7px] rounded-full bg-fg-default" />
      <span className="size-[7px] rounded-full bg-accent" />
      <span className="size-[7px] rounded-full bg-accent" />
      <span className="size-[7px] rounded-full bg-fg-default" />
    </span>
  );
}

/**
 * テクブロ のロゴ。左に 2×2 ドットの幾何マーク、右にワードマークを置く。
 * マークは対角をインク・反対角をティールにし「複数ソースの集約」を象徴する。
 * ワードマークは「テク」太インク + 「ブロ」細ティールでメリハリを付ける。
 * `showOrigin` で由来(Tech Blog Reader)サブテキストの表示を切り替える:
 * 余白のあるサイドバーでは表示、省スペースのモバイルヘッダーでは非表示。
 * 英字サブは Outfit(font-editorial)で組み、和文ワードマークと対比させる。
 * カタカナのため Outfit ではなく Noto Sans JP を当てる。
 */
export function Logo({
  className,
  showOrigin = false,
}: {
  className?: string;
  showOrigin?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="テクブロ ホーム"
      className={cn('inline-flex items-center gap-3', className)}
    >
      <LogoMark />
      <span className="inline-flex flex-col gap-[0.25rem]">
        <span
          style={{ fontFamily: 'var(--font-noto-sans-jp), var(--font-sans)' }}
          className="inline-flex items-baseline text-[1.375rem] leading-none tracking-[0.015em]"
        >
          <span className="font-bold text-fg-default">テク</span>
          <span className="font-medium text-accent">ブロ</span>
        </span>
        {showOrigin && (
          // 由来表示(tech blog 由来)。"Tech" のみティールにする。
          // ワードマーク幅に対して中央寄せする。
          <span className="text-center font-editorial text-[0.6875rem] text-fg-subtle leading-none tracking-[0.06em]">
            <span className="mr-[0.25em] text-accent">Tech</span>Blog Reader
          </span>
        )}
      </span>
    </Link>
  );
}
