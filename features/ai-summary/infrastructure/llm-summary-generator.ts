import type { LlmTextClient } from '@/lib/ai/llm-client';
import type { ArticleSummaryBullet } from '../domain/article-summary';
import type { GeneratedSummary, SummaryGenerator, SummaryInput } from '../domain/summary-generator';

const SYSTEM_PROMPT = [
  'あなたは技術ブログ記事を要約するアシスタントです。',
  '目的は、読者が元記事を開く前に「自分に関係するか・読む価値があるか」を判断できるようにすることです。',
  '出力は日本語にします。',
  '',
  '# 共通の原則',
  '- 与えられた本文だけを根拠にする。本文にない事実・数値・固有名詞は補わず、推測や誇張をしない。',
  '- 第三者が記事の内容を客観的に解説するトーン。宣伝・誇張や一人称(「私は」等)は避ける(事実を述べる「〜しました」は可)。',
  '- 要約自体や一般論だけを述べる文(「要点をまとめた要約です」「判断材料になります」等)は書かない。',
  '',
  '# 概要(overview)',
  '- 記事全体を1文でまとめる。読者がまず全体像をつかめるよう、最も重要な内容を述べる。',
  '- 読みやすい「です/ます」調の自然な文(40〜100文字程度)。記事の性質に合った自然な結びにし、「〜内容です」のような硬い言い回しは避ける。',
  '  結びは記事ごとに変える(例:「〜を紹介しています」「〜を紹介する記事です」「〜について解説しています」「〜について解説した記事です」「〜を導入した経験談です」「〜を振り返っています」など)。',
  '- ただし必ず具体(対象・テーマ)を伴わせる。「〜についての記事です」のように中身のない紹介で終わらせない。',
  '',
  '# 箇条書き(bullets)',
  '- 概要を補う要点を2〜3個。各項目は「見出し(heading)」と「説明(detail)」を持つ。項目どうし・概要と内容を重複させない。',
  '- heading: 要点を一言で表す短い体言止め(おおむね15〜35文字)。例:「週1回の自動リリースによる着実なアップデート」。',
  '- detail: 見出しを補う解説。です/ます調の自然な1〜2文(おおむね40〜120文字)。本文の手法・数値・固有名など具体を必ず入れる。',
  '  名詞を何重にも連ねた硬い言い回し(「〜をテーマにした…の登壇」など)は避け、動詞を使って読みやすく書く。文末は項目ごとに変える(全部「〜しています」等で揃えない)。',
  '- 本文が乏しく確実に言えることが少なければ、無理に数を埋めず1項目でもよい。',
  '',
  '# タグ(tags)',
  '- 記事の主題が分かる技術トピックを0〜5個。検索・分類用ではなく表示用。',
  '- 他の記事にも共通して付きうる一般的な技術・製品・概念を選ぶ',
  '  (例: AWS, Kubernetes, Terraform, TypeScript, Go, React, Next.js, Rails, PostgreSQL, 生成AI, アクセシビリティ, SRE)。',
  '- 表記は正式・一般的な形に揃え、意味が重複する語・表記ゆれ・上位下位の重複は1つに絞る',
  '  (例: 「AI」「LLM」は「生成AI」、「Ruby on Rails」は「Rails」、「Ruby」と「Rails」が重複するなら主題に近い方)。',
  '- 1記事にしか該当しない固有名はタグにしない: 投稿企業独自のプロダクト名・社内ツール名、特定のカンファレンス/イベント名。',
  '  記事が扱う一般的な技術領域に置き換える(置き換えられないなら付けない。例: JaSST → テスト, RubyKaigi → Ruby)。',
  '- 年号・バージョンは含めない。英単語の一般語(database, infrastructure 等)や「クラウド」「フレームワーク」「技術」「まとめ」のような分類名・一般語は使わない。',
  '',
  '# 出力例(体裁と文体に倣う。内容・語彙・文末は記事ごとに変える)',
  '例1(技術の振り返り):',
  '{"overview":"コンポーネントライブラリ「SmartHR UI」の2025年の開発実績やアクセシビリティ向上への取り組みを振り返る記事です。","bullets":[{"heading":"週1回の自動リリースによる着実なアップデート","detail":"専任を持たない有志の体制(コアメンバー7名)ながら、自動化により週1回のリリースを継続。1年間で20回(v63.0.0〜v82.0.0)のメジャーアップデートを実施しました。"},{"heading":"色だけに頼らない、12件のアクセシビリティ改善","detail":"色覚特性を持つ人でも判別できるよう、棒グラフの系列を色だけでなく模様(パターン)でも区別できる機能を追加するなど、誰にでも使いやすいUIを追求しています。"},{"heading":"品質を仕組みで守るESLintルールを12件追加","detail":"テーブルのセル内でのチェックボックス使用を禁止するなど独自ルールを新設し、合計52ルールへ拡充して堅牢な運用を仕組み化しました。"}],"tags":["アクセシビリティ","ESLint","デザインシステム"]}',
  '例2(イベント報告):',
  '{"overview":"地域Ruby会議にスポンサーとして協賛し、技術LTやブース出展で行ったことを振り返る記事です。","bullets":[{"heading":"ジョブ基盤の選定を扱う技術セッションに登壇","detail":"Solid QueueとSidekiqを実際のワークロードに即したベンチマークで比較し、ジョブの特性によって適した選択肢が変わることを示しています。"},{"heading":"モジュラーモノリスからの段階的なマイクロサービス移行","detail":"情シス領域をモジュラーモノリスで素早く立ち上げ、その後マイクロサービスへ少しずつ移行している過程をスポンサーLTで紹介しました。"},{"heading":"来場者参加型のブース企画でコミュニティと交流","detail":"「あなたはどっち派?」という二択企画を用意し、多くの参加者が札を貼って投票するなど会場はにぎわいました。"}],"tags":["Ruby","Rails","マイクロサービス"]}',
  '',
  '# 出力',
  '- 上の例のように JSON オブジェクトのみを出力する。コードフェンス(```)や前後の説明文は一切付けない。',
  '- 形式: {"overview":"...","bullets":[{"heading":"...","detail":"..."}],"tags":["...","..."]}',
].join('\n');

/**
 * SummaryGenerator の実装(Driven Adapter)。
 * プロンプト整形を担い、生成は lib/ai の汎用 LLM クライアントへ委譲する(プロバイダ非依存)。
 * 出力の検証(概要・行数・各長)は呼び出し側の usecase が parseOverview / parseBullets で行う。
 */
export class LlmSummaryGenerator implements SummaryGenerator {
  constructor(private readonly llm: LlmTextClient) {}

  get model(): string {
    return this.llm.model;
  }

  async generate(input: SummaryInput): Promise<GeneratedSummary> {
    const text = await this.llm.complete({
      system: SYSTEM_PROMPT,
      prompt: `# タイトル\n${input.title}\n\n# 本文\n${input.content}`,
      // 概要1文 + 見出し+説明の箇条書き + タグ + JSON の枠。説明文が入るぶん広めに取り、途中切れによるパース失敗を防ぐ。
      maxOutputTokens: 1024,
    });
    return parseGeneratedSummary(text);
  }
}

/**
 * LLM 応答から JSON オブジェクト部分を取り出す。コードフェンス(```json ... ```)や
 * 前後の説明文が混じっていても拾えるようにする(プロンプトで禁止しているが保険)。
 */
function extractJsonObject(text: string): string {
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence?.[1]) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end > start) t = t.slice(start, end + 1);
  return t;
}

function parseGeneratedSummary(text: string): GeneratedSummary {
  const empty: GeneratedSummary = { overview: '', bullets: [], tags: [] };
  try {
    const parsed: unknown = JSON.parse(extractJsonObject(text));
    if (!parsed || typeof parsed !== 'object') return empty;
    const candidate = parsed as { overview?: unknown; bullets?: unknown; tags?: unknown };
    return {
      overview: typeof candidate.overview === 'string' ? candidate.overview.trim() : '',
      bullets: normalizeBullets(candidate.bullets),
      tags: normalizeStringArray(candidate.tags),
    };
  } catch {
    return empty;
  }
}

/** bullets を {heading, detail} の配列に正規化する。見出しか説明が欠ける項目は捨てる(検証は usecase 側)。 */
function normalizeBullets(value: unknown): ArticleSummaryBullet[] {
  if (!Array.isArray(value)) return [];
  const bullets: ArticleSummaryBullet[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { heading, detail } = item as { heading?: unknown; detail?: unknown };
    if (typeof heading !== 'string' || typeof detail !== 'string') continue;
    const h = heading.replace(/^[\s・\-*●•]+/, '').trim();
    const d = detail.trim();
    if (h.length > 0 && d.length > 0) bullets.push({ heading: h, detail: d });
  }
  return bullets;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((line) => line.replace(/^[\s・\-*●•]+/, '').trim())
    .filter((line) => line.length > 0);
}
