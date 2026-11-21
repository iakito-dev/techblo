/** 企業で絞ったフィードの紹介行(CompanyFeedIntro)に出す内容。 */
export type CompanyFeedIntroView = {
  /** 紹介文。企業名と同じ・空なら null(見出しの繰り返しになるため出さない)。 */
  description: string | null;
  /** 公式ブログの URL(http/https のときだけ。それ以外は null でリンクを出さない)。 */
  siteUrl: string | null;
  /** リンク文言に使うホスト名(先頭の www. は落とす)。 */
  siteHost: string | null;
  /** 企業別 RSS(/companies/<slug>/feed.xml)。 */
  rssPath: string;
};

export function resolveCompanyFeedIntro(company: {
  slug: string;
  name: string;
  description: string | null;
  siteUrl: string;
}): CompanyFeedIntroView {
  const description = company.description?.trim() || null;
  let siteUrl: string | null = null;
  let siteHost: string | null = null;
  try {
    const url = new URL(company.siteUrl);
    // 企業マスタは開発者管理だが、javascript: 等を href に流さないよう http(s) に限る。
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      siteUrl = url.href;
      siteHost = url.hostname.replace(/^www\./, '');
    }
  } catch {
    // 不正な URL はリンクを出さない(紹介文と RSS だけ出す)。
  }
  return {
    description: description && description !== company.name.trim() ? description : null,
    siteUrl,
    siteHost,
    rssPath: `/companies/${encodeURIComponent(company.slug)}/feed.xml`,
  };
}
