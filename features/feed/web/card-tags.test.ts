import { describe, expect, it } from 'vitest';
import { cardTags } from './card-tags';

describe('cardTags', () => {
  it('絞り込みが無ければ元の順で先頭 3 件を返す', () => {
    expect(cardTags(['A', 'B', 'C', 'D'])).toEqual([
      { tag: 'A', active: false },
      { tag: 'B', active: false },
      { tag: 'C', active: false },
    ]);
  });

  it('絞り込み中のタグを先頭に寄せて active にする(4 件目でも見えるようにする)', () => {
    expect(cardTags(['Go', 'gRPC', 'API', 'React'], 'React')).toEqual([
      { tag: 'React', active: true },
      { tag: 'Go', active: false },
      { tag: 'gRPC', active: false },
    ]);
  });

  it('キュレーションタグは類義語グループの生タグを active にし、元の相対順を保つ', () => {
    expect(cardTags(['設計', 'Next.js', 'React', 'CSS'], 'フロントエンド')).toEqual([
      { tag: 'Next.js', active: true },
      { tag: 'React', active: true },
      { tag: '設計', active: false },
    ]);
  });

  it('一致するタグが無ければ並びは変えない', () => {
    expect(cardTags(['A', 'B'], 'React')).toEqual([
      { tag: 'A', active: false },
      { tag: 'B', active: false },
    ]);
  });

  it('空白だけの絞り込みは無視する', () => {
    expect(cardTags(['A'], '  ')).toEqual([{ tag: 'A', active: false }]);
  });

  it('検索語を含むタグを先頭に寄せる(active にはしない。大文字小文字・全角を区別しない)', () => {
    expect(cardTags(['Go', 'gRPC', 'API', 'SRE'], undefined, 'ｓｒｅ')).toEqual([
      { tag: 'SRE', active: false },
      { tag: 'Go', active: false },
      { tag: 'gRPC', active: false },
    ]);
  });

  it('検索語の部分一致でも寄せ、複数一致は元の相対順を保つ', () => {
    expect(cardTags(['設計', 'Kubernetes', 'API', 'Kubernetes運用'], undefined, 'kube')).toEqual([
      { tag: 'Kubernetes', active: false },
      { tag: 'Kubernetes運用', active: false },
      { tag: '設計', active: false },
    ]);
  });

  it('タグ絞り込みと検索の併用では、絞り込み中のタグを検索一致より前に置く', () => {
    expect(cardTags(['SRE', 'Go', 'React'], 'React', 'sre')).toEqual([
      { tag: 'React', active: true },
      { tag: 'SRE', active: false },
      { tag: 'Go', active: false },
    ]);
  });

  it('空白だけ・長すぎる検索語では並びを変えない', () => {
    expect(cardTags(['A', 'B', 'C', 'D'], undefined, '   ')).toEqual(
      cardTags(['A', 'B', 'C', 'D']),
    );
    expect(cardTags(['A', 'B', 'C', 'D'], undefined, 'D'.repeat(101))).toEqual(
      cardTags(['A', 'B', 'C', 'D']),
    );
  });
});
