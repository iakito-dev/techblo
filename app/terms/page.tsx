import type { Metadata } from 'next';
import { LegalSection, LegalShell } from '@/components/legal/legal-shell';
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, SITE_NAME } from '@/lib/site-info';

const TITLE = '利用規約';
const DESCRIPTION = `${SITE_NAME}の利用規約。サービス内容、禁止事項、免責事項、知的財産権の取り扱いについて定めます。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  openGraph: { type: 'website', url: '/terms', title: TITLE, description: DESCRIPTION },
};

export default function TermsPage() {
  return (
    <LegalShell title={TITLE} lastUpdated={LEGAL_LAST_UPDATED}>
      <p>
        本規約は、{SITE_NAME}
        (以下「本サービス」)の利用条件を定めるものです。利用者は、本サービスを利用することで本規約に同意したものとみなされます。
      </p>

      <LegalSection heading="1. サービス内容">
        <p>
          本サービスは、各企業が公開する RSS
          フィードの見出し・抜粋・リンクを自動で集約し、一覧・要約・保存などの機能とともに表示するものです。記事本文の閲覧は各社の元記事ページで行われます。本サービスは各社と資本・提携・公認等の関係にありません。
        </p>
      </LegalSection>

      <LegalSection heading="2. アカウント">
        <p>
          一部の機能の利用には Google
          アカウントによるログインが必要です。利用者は、自己のアカウントの管理について責任を負うものとします。
        </p>
      </LegalSection>

      <LegalSection heading="3. 禁止事項">
        <p>利用者は、本サービスの利用にあたり次の行為をしてはなりません。</p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>法令または公序良俗に違反する行為</li>
          <li>本サービスのサーバーやネットワークに過度な負荷をかける行為、不正アクセス行為</li>
          <li>本サービスの運営を妨害する行為</li>
          <li>他の利用者または第三者の権利を侵害する行為</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. 知的財産権">
        <p>
          本サービスが集約・表示する各記事およびそれに含まれる文章・画像・ロゴ等の著作権その他の権利は、各記事の発行元(各企業)または正当な権利者に帰属します。記載の会社名・製品名・サービス名およびロゴは各社の商標または登録商標です。
        </p>
      </LegalSection>

      <LegalSection heading="5. 免責事項">
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            本サービスは、集約して表示する情報や AI
            による要約の正確性・完全性・最新性を保証しません。内容は元記事を必ずご確認ください。
          </li>
          <li>
            当方は、本サービスの利用または利用不能によって利用者に生じた損害について、当方に故意または重大な過失がある場合を除き責任を負いません。
          </li>
          <li>本サービスは予告なく内容の変更・中断・終了をすることがあります。</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. 規約の変更">
        <p>
          当方は、必要に応じて本規約を変更することがあります。変更後の規約は本サービス上に表示した時点から効力を生じます。
        </p>
      </LegalSection>

      <LegalSection heading="7. 準拠法・管轄">
        <p>
          本規約は日本法に準拠し、本サービスに関して紛争が生じた場合は、当方の所在地を管轄する裁判所を専属的合意管轄とします。
        </p>
      </LegalSection>

      <LegalSection heading="8. お問い合わせ">
        <p>
          本規約に関するお問い合わせは{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
            {CONTACT_EMAIL}
          </a>{' '}
          までお願いします。
        </p>
      </LegalSection>
    </LegalShell>
  );
}
