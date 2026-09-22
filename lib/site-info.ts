/**
 * 運営者・連絡先などの「サイトの素性」を表す定数。
 * プライバシーポリシー / 利用規約 / 運営者情報 ページとフッターで共有し、表記揺れを防ぐ。
 *
 * NOTE: CONTACT_EMAIL は独自ドメインのエイリアス想定のプレースホルダ。
 * 実際に受信できるアドレス(ドメインのメール転送 or 別アドレス)に差し替えること。
 */
export const SITE_OPERATOR = 'テクブロ運営' as const;
export const SITE_NAME = 'テクブロ' as const;
export const CONTACT_EMAIL = 'contact@techblo.dev' as const;

/** 法的ページの最終更新日(表示用)。内容を変えたら手で更新する。 */
export const LEGAL_LAST_UPDATED = '2026年6月19日' as const;
