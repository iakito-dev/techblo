import type { LlmTextClient } from '@/lib/ai/llm-client';
import type { CategoryClassifier, ClassifyInput } from '../domain/category-classifier';

const SYSTEM_PROMPT = [
  'あなたはテックブログ記事を職能領域(カテゴリ)ごとに整理するアシスタントです。',
  '入力はタイトル・概要(1文)・タグのみで、本文は与えられません。',
  '',
  'この記事を、次の7つのカテゴリのうち ちょうど1つ に分類し、category にキーを出力してください。',
  '判断基準は「この記事を読んだ人が持ち帰る知見は、会社のどの職能領域(チーム)のものか」です。',
  '使われている技術やツールではなく、記事の主題(学びの中身)で決めてください。',
  '',
  '# カテゴリ',
  '- ai — AI・機械学習: LLM/エージェント/MLモデル/検索・推薦/データ基盤・統計を「作る・評価する・業務に導入する」話。',
  '  例: エージェント基盤の内製、RAG、LLM-as-a-judge による評価、Feature Store、ETL 基盤移行、A/Bテストの統計、LLM SDK の解説、問い合わせ調査エージェントの構築、AI社員の導入事例',
  '- infra — クラウド・インフラ: システムを動かす基盤の話。',
  '  例: AWS/Google Cloud のサービス解説や週刊アップデート、VPC/LB/DNS/Firewall 製品の設定、Kubernetes、Terraform、監視・オブザーバビリティ・SLO、FinOps、バックアップ、証明書、DB のバージョン移行・HA・エンジン側チューニング、Linux',
  '- app — アプリケーション開発: プロダクトのコードを書く話(バックエンド・フロントエンド・モバイル)。',
  '  例: 言語ランタイムの変更、API 設計・スキーマ駆動、DDD・モノリス分割、SQL チューニング、React/SSR 移行、SwiftUI/Android のアーキテクチャ、課金基盤の移行',
  '- security — セキュリティ: 認証認可・脆弱性・脅威・攻撃対策・セキュリティガバナンスの話。',
  '  例: IdP 移行、OAuth/MCP の認可設計、脅威モデリング、脆弱性管理(Inspector 等)、AI によるセキュリティスキャン体制、AI セキュリティフレームワーク',
  '- devex — 開発生産性: コードを書く・テストする・届ける「やり方」の話。',
  '  例: Claude Code / Cursor / Kiro などコーディングエージェントの使い方・設定・コスト、エージェント主体の開発フロー、エージェント向けのドキュメント/コンテキスト整備(llms.txt, MCP)、AI生成コードの品質検証、CI/CD 改善、テスト自動化、QA 組織の進め方、dotfiles、開発作業の自動化',
  '- org — プロダクト・組織・キャリア: 人・チーム・仕事の進め方・プロダクト戦略・UX/デザイン・採用・キャリアの話。技術や AI は背景に留まる。',
  '  例: PdM 論、UX/UI デザイン事例、ブランディング、チーム紹介、面接・インターン受け入れ、入社/退職エントリ、AI時代のエンジニア像、業務プロセス改善プロジェクトの進め方、業務再設計',
  '- event — イベント・コミュニティ: カンファレンス・勉強会・学会に関する告知やレポート。',
  '  例: 協賛・登壇の告知、参加レポート、月次イベント予定、ハンズオン/ワークショップの開催報告、LT会、スカラシップ、学習プログラムや支援プログラムの発表',
  '',
  '# 判定手順(上から順に、最初に当てはまったものを選ぶ)',
  '1. 記事の主題がイベント・カンファレンス・勉強会の告知や参加/開催レポートなら event。',
  '   ただし「デモの裏側」「イベントで扱った技術の解説」のように技術の中身が主題なら、その技術のカテゴリへ。',
  '2. 主題が人・チーム・仕事の進め方・プロダクト戦略・デザイン・キャリアで、技術やAIは背景なら org。',
  '3. 主題がセキュリティ(認証認可・脆弱性・脅威・攻撃対策・ガバナンス)なら security。AI が手段でも security。',
  '4. AI が登場する場合、「AI に何をさせているか」で分ける:',
  '   - コードを書く・レビューする・開発作業をする、またはコーディングエージェントの設定・運用・コスト → devex',
  '   - それ以外の仕事をする仕組みを作る・評価する・導入する、モデルやデータ基盤を作る → ai',
  '   - AI アプリ/エージェント/LLM 基盤を載せるクラウドやKubernetesは手段なので infra にはしない',
  '5. CI/CD・テスト・QA・開発環境・開発作業の自動化が主題なら devex。',
  '6. DB の話は、エンジン側(バージョン移行・HA・エンジン設定・DBRE 作業)なら infra、アプリ側(SQL・スキーマ・ドメイン設計)なら app。',
  '7. クラウド・ネットワーク・Kubernetes・IaC・監視・バックアップ・証明書など基盤の話なら infra。',
  '8. 残りのプロダクトコード(バックエンド・フロントエンド・モバイル)の話は app。',
  '',
  '# 出力',
  '- JSON オブジェクトのみを出力する。コードフェンス(```)や前後の説明文は一切付けない。',
  '- 形式: {"category":"ai"}(category は ai | infra | app | security | devex | org | event のいずれか1つ)',
].join('\n');

/**
 * CategoryClassifier の実装(Driven Adapter)。
 * プロンプト整形を担い、生成は lib/ai の汎用 LLM クライアントへ委譲する(プロバイダ非依存)。
 * 出力の検証(enum チェック)は呼び出し側の usecase が parseCategory で行う。
 */
export class LlmCategoryClassifier implements CategoryClassifier {
  constructor(private readonly llm: LlmTextClient) {}

  get model(): string {
    return this.llm.model;
  }

  async classify(input: ClassifyInput): Promise<string> {
    const text = await this.llm.complete({
      system: SYSTEM_PROMPT,
      prompt: `# タイトル\n${input.title}\n\n# 概要\n${input.overview}\n\n# タグ\n${input.tags.join(', ')}`,
      // {"category":"..."} のみの短い出力なので小さく取る。
      maxOutputTokens: 64,
    });
    return parseCategoryText(text);
  }
}

/**
 * LLM 応答から category 文字列を取り出す。コードフェンス(```json ... ```)や前後の説明文が
 * 混じっていても拾えるようにする(プロンプトで禁止しているが保険。llm-summary-generator.ts と同様)。
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

function parseCategoryText(text: string): string {
  try {
    const parsed: unknown = JSON.parse(extractJsonObject(text));
    if (!parsed || typeof parsed !== 'object') return '';
    const candidate = (parsed as { category?: unknown }).category;
    return typeof candidate === 'string' ? candidate.trim() : '';
  } catch {
    return '';
  }
}
