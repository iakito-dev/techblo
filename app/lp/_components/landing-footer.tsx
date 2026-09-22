import Link from 'next/link';
import { Logo } from '@/components/layout/logo';

const COLUMNS = [
  {
    heading: 'プロダクト',
    links: [
      { href: '#features', label: '機能' },
      { href: '#companies', label: '対応企業' },
      { href: '/', label: 'フィード' },
    ],
  },
  {
    heading: 'アカウント',
    links: [
      { href: '/login', label: 'ログイン' },
      { href: '/signup', label: '新規登録' },
    ],
  },
  {
    heading: 'サポート',
    links: [
      { href: '/about', label: '運営者情報・お問い合わせ' },
      { href: '/privacy', label: 'プライバシーポリシー' },
      { href: '/terms', label: '利用規約' },
    ],
  },
] as const;

/** LP フッター。ワードマーク + タグライン + リンク列(Dewey のフッターに対応)。 */
export function LandingFooter() {
  return (
    <footer className="border-border-default border-t bg-bg-surface/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-fg-muted text-sm leading-relaxed">
            有名テック企業の技術ブログを、AI要約と人気順で効率的にキャッチアップ。
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.heading} className="flex flex-col gap-3">
            <p className="font-semibold text-fg-default text-sm">{col.heading}</p>
            {col.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-fg-muted text-sm transition-colors hover:text-fg-default"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="border-border-default/60 border-t">
        <div className="mx-auto w-full max-w-6xl space-y-3 px-6 py-6">
          {/*
            商標・免責表記。実企業名を記述的に挙げるため、各社との無関係・RSS 集約である旨・
            ダミー表示である旨を明示してリスクを抑える(法務配慮。LP 全体を包括カバーする)。
          */}
          <p className="text-fg-faint text-xs leading-relaxed [word-break:auto-phrase]">
            記載の会社名・製品名・サービス名およびロゴは各社の商標または登録商標です。テクブロ
            は各社と資本・提携・公認等の関係にあるものではなく、各社が公開する RSS
            フィードの見出し・抜粋・リンクを集約して表示します(記事本文は各社の元記事ページで閲覧)。本ページに掲載した記事・画面・AI要約・利用者の声はすべて表示イメージであり、実在のものではありません。
          </p>
          {/* 年号は new Date() を使わない(Next.js 16 のプリレンダ制約。LP を完全静的に保つ)。
              年は固定リテラルのため年明けは手動更新が必要。 */}
          <p className="text-fg-faint text-xs">
            © 2026 techblo.dev / テクブロ. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
