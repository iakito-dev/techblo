/**
 * シードスクリプト: 企業マスタを投入(slug で冪等 upsert)。
 * 実行: bun run db:seed
 */

import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { companies } from '@/db/schema/companies';
import { logger } from '@/lib/observability/logger';

const SEED_COMPANIES = [
  {
    slug: 'lycorp',
    name: 'LINEヤフー',
    rssUrl: 'https://techblog.lycorp.co.jp/ja/feed/index.xml',
    siteUrl: 'https://techblog.lycorp.co.jp/ja',
    brandColor: '#06c755',
    description: 'LINEヤフー株式会社のテックブログ',
  },
  {
    slug: 'mercari',
    name: 'mercari',
    rssUrl: 'https://engineering.mercari.com/blog/feed.xml',
    siteUrl: 'https://engineering.mercari.com/',
    brandColor: '#ff0211',
    description: 'メルカリエンジニアリング',
    // pubDate が JST の壁時計を GMT と誤記しているため、壁時計を JST として解釈する(ADR-0025)
    feedTimezone: 'Asia/Tokyo',
  },
  {
    slug: 'layerx',
    name: 'LayerX',
    rssUrl: 'https://tech.layerx.co.jp/feed',
    siteUrl: 'https://tech.layerx.co.jp/',
    brandColor: '#534dff',
    description: 'LayerX エンジニアブログ',
  },
  {
    slug: 'dena',
    name: 'DeNA',
    rssUrl: 'https://engineering.dena.com/blog/index.xml',
    siteUrl: 'https://engineering.dena.com/',
    brandColor: '#00a040',
    description: 'Blog on DeNA Engineering',
  },
  {
    slug: 'serverworks',
    name: 'Serverworks',
    rssUrl: 'https://blog.serverworks.co.jp/feed',
    siteUrl: 'https://blog.serverworks.co.jp/',
    brandColor: '#d00f30',
    description: 'サーバーワークスエンジニアブログ',
  },
  {
    slug: 'classmethod',
    name: 'Classmethod',
    rssUrl: 'https://dev.classmethod.jp/feed/',
    siteUrl: 'https://dev.classmethod.jp/',
    brandColor: '#000000',
    description: 'DevelopersIO',
    enabled: false,
  },
  {
    slug: 'zozo',
    name: 'ZOZO',
    rssUrl: 'https://techblog.zozo.com/rss',
    siteUrl: 'https://techblog.zozo.com/',
    brandColor: '#000000',
    description: 'ZOZO TECH BLOG',
  },
  {
    slug: 'cyberagent',
    name: 'CyberAgent',
    rssUrl: 'https://developers.cyberagent.co.jp/blog/feed/',
    siteUrl: 'https://developers.cyberagent.co.jp/blog/',
    brandColor: '#2d8c3c',
    description: 'CyberAgent Developers Blog',
  },
  {
    slug: 'smarthr',
    name: 'SmartHR',
    rssUrl: 'https://tech.smarthr.jp/feed',
    siteUrl: 'https://tech.smarthr.jp/',
    brandColor: '#00c4cc',
    description: 'SmartHR Tech Blog',
  },
  {
    slug: 'goodpatch',
    name: 'Goodpatch',
    rssUrl: 'https://goodpatch.com/blog/feed',
    siteUrl: 'https://goodpatch.com/blog',
    brandColor: '#0b6fca',
    description: 'Goodpatch Blog',
  },
  {
    slug: 'newmo',
    name: 'newmo',
    rssUrl: 'https://tech.newmo.me/rss',
    siteUrl: 'https://tech.newmo.me/',
    brandColor: '#00b981',
    description: 'newmo 技術ブログ',
  },
  {
    slug: 'kaminashi',
    name: 'カミナシ',
    rssUrl: 'https://kaminashi-developer.hatenablog.jp/feed',
    siteUrl: 'https://kaminashi-developer.hatenablog.jp/',
    brandColor: '#0081e3',
    description: 'カミナシ エンジニアブログ',
  },
  {
    slug: 'findy',
    name: 'Findy',
    rssUrl: 'https://tech.findy.co.jp/rss',
    siteUrl: 'https://tech.findy.co.jp/',
    brandColor: '#155aa8',
    description: 'Findy Tech Blog',
  },
  {
    slug: 'freee',
    name: 'freee',
    rssUrl: 'https://developers.freee.co.jp/rss',
    siteUrl: 'https://developers.freee.co.jp/',
    brandColor: '#2864f0',
    description: 'freee Developers Hub',
  },
  {
    slug: 'cybozu',
    name: 'Cybozu',
    rssUrl: 'https://blog.cybozu.io/rss',
    siteUrl: 'https://blog.cybozu.io/',
    brandColor: '#0089ce',
    description: 'Cybozu Inside Out',
  },
  {
    slug: 'edash',
    name: 'e-dash',
    rssUrl: 'https://zenn.dev/p/edash_tech_blog/feed',
    siteUrl: 'https://zenn.dev/p/edash_tech_blog',
    brandColor: '#3ea8ff',
    description: 'e-dash Tech Blog',
  },
  {
    slug: 'moneyforward',
    name: 'マネーフォワード',
    rssUrl: 'https://moneyforward-dev.jp/rss',
    siteUrl: 'https://moneyforward-dev.jp/',
    brandColor: '#1a64b4',
    description: 'Money Forward Developers Blog',
  },
  {
    slug: 'cookpad',
    name: 'クックパッド',
    rssUrl: 'https://techlife.cookpad.com/rss',
    siteUrl: 'https://techlife.cookpad.com/',
    brandColor: '#ff7e1d',
    description: 'Cookpad Techlife',
  },
  {
    slug: 'sansan',
    name: 'Sansan',
    rssUrl: 'https://buildersbox.corp-sansan.com/rss',
    siteUrl: 'https://buildersbox.corp-sansan.com/',
    brandColor: '#e50012',
    description: 'Sansan Tech Blog (Builders Box)',
  },
  {
    slug: 'm3',
    name: 'エムスリー',
    rssUrl: 'https://www.m3tech.blog/rss',
    siteUrl: 'https://www.m3tech.blog/',
    brandColor: '#009a44',
    description: 'エムスリー テックブログ',
  },
  {
    slug: 'timee',
    name: 'タイミー',
    rssUrl: 'https://tech.timee.co.jp/rss',
    siteUrl: 'https://tech.timee.co.jp/',
    brandColor: '#d99a00',
    description: 'Timee Product Team Blog',
  },
  {
    slug: 'andpad',
    name: 'ANDPAD',
    rssUrl: 'https://tech.andpad.co.jp/rss',
    siteUrl: 'https://tech.andpad.co.jp/',
    brandColor: '#f08300',
    description: 'ANDPAD Tech Blog',
  },
  {
    slug: 'ubie',
    name: 'Ubie',
    rssUrl: 'https://zenn.dev/p/ubie_dev/feed',
    siteUrl: 'https://zenn.dev/p/ubie_dev',
    brandColor: '#5050d2',
    description: 'Ubie Tech Blog (Zenn)',
  },
  {
    slug: 'base',
    name: 'BASE',
    rssUrl: 'https://devblog.thebase.in/rss',
    siteUrl: 'https://devblog.thebase.in/',
    brandColor: '#1c9e77',
    description: 'BASE Developers Blog',
  },
  {
    slug: 'caddi',
    name: 'CADDi',
    rssUrl: 'https://caddi.tech/feed',
    siteUrl: 'https://caddi.tech/',
    brandColor: '#ff5a1f',
    description: 'CADDi Tech Blog',
  },
  {
    slug: 'sakura',
    name: 'さくらインターネット',
    rssUrl: 'https://knowledge.sakura.ad.jp/rss',
    siteUrl: 'https://knowledge.sakura.ad.jp/',
    brandColor: '#d54f8c',
    description: 'さくらのナレッジ',
  },
  {
    slug: 'eureka',
    name: 'エウレカ',
    rssUrl: 'https://medium.com/feed/eureka-engineering',
    siteUrl: 'https://medium.com/eureka-engineering',
    brandColor: '#f0517a',
    description: 'Eureka Engineering (Medium)',
  },
  {
    slug: 'aws-jp',
    name: 'AWS Japan',
    rssUrl: 'https://aws.amazon.com/jp/blogs/news/feed/',
    siteUrl: 'https://aws.amazon.com/jp/blogs/news/',
    brandColor: '#ff9900',
    description: 'Amazon Web Services ブログ(日本語)',
  },
  {
    slug: 'google-cloud',
    name: 'Google Cloud',
    rssUrl: 'https://cloudblog.withgoogle.com/ja/topics/developers-practitioners/rss/',
    siteUrl: 'https://cloud.google.com/blog/ja/topics/developers-practitioners',
    brandColor: '#4285f4',
    description: 'Google Cloud Blog - デベロッパー(日本語)',
  },
  {
    slug: 'visional',
    name: 'Visional',
    rssUrl: 'https://engineering.visional.inc/index.xml',
    siteUrl: 'https://engineering.visional.inc/blog/',
    brandColor: '#00b4a0',
    description: 'Visional Engineering Blog',
  },
  {
    slug: 'go-inc',
    name: 'GO',
    rssUrl: 'https://techblog.goinc.jp/feed',
    siteUrl: 'https://techblog.goinc.jp/',
    brandColor: '#1a1a1a',
    description: 'GO Tech Blog',
  },
  {
    slug: 'tabelog',
    name: '食べログ',
    rssUrl: 'https://tech-blog.tabelog.com/feed',
    siteUrl: 'https://tech-blog.tabelog.com/',
    brandColor: '#ff9933',
    description: '食べログ Tech Blog',
  },
  {
    slug: 'spotify',
    name: 'Spotify',
    rssUrl: 'https://engineering.atspotify.com/feed/',
    siteUrl: 'https://engineering.atspotify.com/',
    brandColor: '#1db954',
    description: 'Spotify Engineering',
  },
  {
    slug: 'notahotel',
    name: 'NOT A HOTEL',
    rssUrl: 'https://zenn.dev/p/notahotel/feed',
    siteUrl: 'https://zenn.dev/p/notahotel',
    brandColor: '#1a1a1a',
    description: 'NOT A HOTEL のフィード(Zenn)',
  },
  {
    slug: 'reiwatravel',
    name: '令和トラベル',
    // 独自サイト(engineering.reiwatravel.co.jp)は RSS 未配信のため、公式が案内する Zenn publication を使用
    rssUrl: 'https://zenn.dev/p/reiwatravel/feed',
    siteUrl: 'https://engineering.reiwatravel.co.jp',
    brandColor: '#16b364',
    description: '令和トラベル Engineering(Zenn)',
  },
  {
    slug: 'enechain',
    name: 'enechain',
    rssUrl: 'https://techblog.enechain.com/rss',
    siteUrl: 'https://techblog.enechain.com/',
    brandColor: '#0046c8',
    description: 'enechain Tech Blog',
  },
  {
    slug: 'ivry',
    name: 'IVRy',
    // note のマガジン単位 RSS(/m/{key}/rss)。アカウント全体の RSS は採用広報なども混ざるため技術マガジンに絞る
    rssUrl: 'https://note.com/ivry/m/m975eb5b0b0d2/rss',
    siteUrl: 'https://note.com/ivry/m/m975eb5b0b0d2',
    brandColor: '#4f46e5',
    description: 'IVRy のエンジニアブログ(note マガジン)',
  },
  {
    slug: 'anthropic',
    name: 'Anthropic',
    // 公式 RSS が無いため、Anthropic 公式サイトを定期スクレイプして生成されるコミュニティ製フィードを使用
    rssUrl:
      'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml',
    siteUrl: 'https://www.anthropic.com/news',
    brandColor: '#d97757',
    description: 'Anthropic News',
    // 投資・提携・事例など技術記事以外が大半のため取り込み停止(技術記事は anthropic-engineering で取得)
    enabled: false,
  },
  {
    slug: 'anthropic-engineering',
    name: 'Anthropic Engineering',
    rssUrl:
      'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_engineering.xml',
    siteUrl: 'https://www.anthropic.com/engineering',
    brandColor: '#d97757',
    description: 'Anthropic Engineering Blog',
  },
  {
    slug: 'linear',
    name: 'Linear',
    rssUrl: 'https://linear.app/rss/now.xml',
    siteUrl: 'https://linear.app/now',
    brandColor: '#5e6ad2',
    description: 'Linear Blog(Now)',
  },
] as const;

async function main() {
  logger.info('seeding companies', { count: SEED_COMPANIES.length });

  await db
    .insert(companies)
    .values([...SEED_COMPANIES])
    .onConflictDoUpdate({
      target: companies.slug,
      set: {
        name: sql`excluded.name`,
        rssUrl: sql`excluded.rss_url`,
        siteUrl: sql`excluded.site_url`,
        brandColor: sql`excluded.brand_color`,
        description: sql`excluded.description`,
        enabled: sql`excluded.enabled`,
        updatedAt: sql`now()`,
      },
    });

  logger.info('seed complete');
}

main()
  // postgres-js の接続が開いたままだとプロセスが終了しないため、成功時も明示的に終了する
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error('seed failed', { error: e instanceof Error ? e.message : String(e) });
    process.exit(1);
  });
