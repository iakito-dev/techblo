import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalSection, LegalShell } from '@/components/legal/legal-shell';
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, SITE_NAME, SITE_OPERATOR } from '@/lib/site-info';

const TITLE = '運営者情報・お問い合わせ';
const DESCRIPTION = `${SITE_NAME}の運営者情報とお問い合わせ窓口。サービスの概要と連絡先を掲載しています。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: { type: 'website', url: '/about', title: TITLE, description: DESCRIPTION },
};

export default function AboutPage() {
  return (
    <LegalShell title={TITLE} lastUpdated={LEGAL_LAST_UPDATED}>
      <LegalSection heading="本サービスについて">
        <p>
          {SITE_NAME}(techblo)は、有名テック企業の公式技術ブログを毎日自動で集約し、AI
          要約や人気順とともに表示する、日本のエンジニア向けの情報収集サービスです。気になる記事をブックマーク・お気に入りに保存し、表示する企業を購読設定でカスタマイズできます。
        </p>
      </LegalSection>

      <LegalSection heading="運営者">
        <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-2">
          <dt className="text-fg-muted">運営</dt>
          <dd className="text-fg-default">{SITE_OPERATOR}</dd>
          <dt className="text-fg-muted">連絡先</dt>
          <dd>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
              {CONTACT_EMAIL}
            </a>
          </dd>
        </dl>
      </LegalSection>

      <LegalSection heading="お問い合わせ">
        <p>
          ご質問・不具合のご報告・掲載内容に関するお問い合わせ(掲載停止のご依頼を含む)は、上記メールアドレスまでご連絡ください。アカウントや保存データの削除をご希望の場合も同様です。
        </p>
      </LegalSection>

      <LegalSection heading="関連ページ">
        <p>
          個人情報の取り扱いは{' '}
          <Link href="/privacy" className="text-accent hover:underline">
            プライバシーポリシー
          </Link>
          、ご利用条件は{' '}
          <Link href="/terms" className="text-accent hover:underline">
            利用規約
          </Link>{' '}
          をご確認ください。
        </p>
      </LegalSection>
    </LegalShell>
  );
}
