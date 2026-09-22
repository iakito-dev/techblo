import type { Metadata } from 'next';
import { LegalSection, LegalShell } from '@/components/legal/legal-shell';
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, SITE_NAME, SITE_OPERATOR } from '@/lib/site-info';

const TITLE = 'プライバシーポリシー';
const DESCRIPTION = `${SITE_NAME}における個人情報・Cookie等の取り扱い方針。取得する情報、利用目的、第三者提供、外部サービスへの送信について説明します。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/privacy' },
  openGraph: { type: 'website', url: '/privacy', title: TITLE, description: DESCRIPTION },
};

export default function PrivacyPage() {
  return (
    <LegalShell title={TITLE} lastUpdated={LEGAL_LAST_UPDATED}>
      <p>
        {SITE_OPERATOR}(以下「当方」)は、{SITE_NAME}
        (以下「本サービス」)の提供にあたり、利用者の個人情報を以下の方針に従って取り扱います。
      </p>

      <LegalSection heading="1. 取得する情報">
        <p>本サービスは、サービスの提供に必要な範囲で次の情報を取得します。</p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            <strong className="font-medium text-fg-default">Google アカウント情報</strong>: Google
            アカウントでログインした際に、メールアドレス・氏名(表示名)・プロフィール画像を取得します。
          </li>
          <li>
            <strong className="font-medium text-fg-default">利用者が保存したデータ</strong>:
            ブックマーク、お気に入り、購読する企業の設定、既読状態など、本サービス上での操作内容。
          </li>
          <li>
            <strong className="font-medium text-fg-default">Cookie・セッション情報</strong>:
            ログイン状態を維持するための認証用 Cookie。
          </li>
          <li>
            <strong className="font-medium text-fg-default">利用状況・不具合情報</strong>:
            ページの閲覧状況やエラー発生時の技術情報(後述の外部サービスを通じて取得)。
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. 利用目的">
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>本サービスの提供・本人認証・保存データの同期のため</li>
          <li>本サービスの機能改善、品質向上、不具合の調査・対応のため</li>
          <li>利用規約に反する行為への対応のため</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. 外部サービスへの送信・第三者提供">
        <p>
          本サービスは、運用のために以下の外部サービスを利用しており、上記情報の一部がこれらに送信されます。各社のプライバシーポリシーが適用されます。
        </p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            <strong className="font-medium text-fg-default">Google(認証)</strong>:
            ログイン(OAuth)に利用します。
          </li>
          <li>
            <strong className="font-medium text-fg-default">
              Vercel(ホスティング・アクセス解析)
            </strong>
            : 本サービスの配信およびアクセス状況の把握に利用します。
          </li>
          <li>
            <strong className="font-medium text-fg-default">Neon(データベース)</strong>:
            アカウント情報および保存データの保管に利用します。
          </li>
          <li>
            <strong className="font-medium text-fg-default">Sentry(エラー監視)</strong>:
            不具合の検知・調査のために技術情報を送信します。
          </li>
        </ul>
        <p>法令に基づく場合を除き、当方は利用者本人の同意なく個人情報を第三者へ提供しません。</p>
      </LegalSection>

      <LegalSection heading="4. Cookie の利用">
        <p>
          本サービスはログイン状態の維持のために Cookie を使用します。ブラウザの設定で Cookie
          を無効化できますが、その場合ログインを伴う機能が利用できないことがあります。
        </p>
      </LegalSection>

      <LegalSection heading="5. 安全管理">
        <p>
          当方は、取得した情報の漏えい・滅失・毀損を防止するため、通信の暗号化(HTTPS)等の合理的な安全管理措置を講じます。
        </p>
      </LegalSection>

      <LegalSection heading="6. 開示・訂正・削除の請求">
        <p>
          利用者は、自己の個人情報の開示・訂正・利用停止・削除を請求できます。アカウントおよび保存データの削除をご希望の場合を含め、末尾のお問い合わせ先までご連絡ください。
        </p>
      </LegalSection>

      <LegalSection heading="7. 本ポリシーの変更">
        <p>
          当方は、必要に応じて本ポリシーを変更することがあります。重要な変更がある場合は本サービス上で告知します。
        </p>
      </LegalSection>

      <LegalSection heading="8. お問い合わせ窓口">
        <p>
          本ポリシーに関するお問い合わせは{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
            {CONTACT_EMAIL}
          </a>{' '}
          までお願いします。
        </p>
      </LegalSection>
    </LegalShell>
  );
}
