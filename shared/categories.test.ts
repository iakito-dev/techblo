import { describe, expect, it } from 'vitest';
import {
  CATEGORY_DEFINITIONS,
  getCategoryDefinition,
  isArticleCategory,
  SHELF_CATEGORIES,
} from './categories';
import { articleCategorySchema } from './category-schema';

describe('articleCategorySchema', () => {
  it('7カテゴリすべてを受理する', () => {
    for (const key of ['ai', 'infra', 'devex', 'app', 'security', 'org', 'event']) {
      expect(articleCategorySchema.safeParse(key).success).toBe(true);
    }
  });

  it('未知の値は拒否する', () => {
    expect(articleCategorySchema.safeParse('unknown').success).toBe(false);
  });
});

describe('isArticleCategory', () => {
  it('7カテゴリすべてを受理し、未知の値・文字列以外は拒否する', () => {
    for (const key of ['ai', 'infra', 'devex', 'app', 'security', 'org', 'event']) {
      expect(isArticleCategory(key)).toBe(true);
    }
    expect(isArticleCategory('unknown')).toBe(false);
    expect(isArticleCategory(undefined)).toBe(false);
    expect(isArticleCategory(1)).toBe(false);
  });
});

describe('CATEGORY_DEFINITIONS', () => {
  it('7件・key が一意', () => {
    expect(CATEGORY_DEFINITIONS).toHaveLength(7);
    const keys = CATEGORY_DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('event のみ isShelf=false', () => {
    for (const def of CATEGORY_DEFINITIONS) {
      expect(def.isShelf).toBe(def.key !== 'event');
    }
  });
});

describe('SHELF_CATEGORIES', () => {
  it('棚6カテゴリを定義どおりの並び順で含む(event は含まない)', () => {
    expect(SHELF_CATEGORIES).toEqual(['ai', 'infra', 'devex', 'app', 'security', 'org']);
  });
});

describe('getCategoryDefinition', () => {
  it('key に対応する定義を返す', () => {
    expect(getCategoryDefinition('ai').label).toBe('AI・機械学習');
    expect(getCategoryDefinition('event').isShelf).toBe(false);
  });
});
