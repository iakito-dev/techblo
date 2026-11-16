'use client';

import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { filterTags } from './filter-tags';

interface TagCount {
  tag: string;
  count: number;
}

/**
 * タグ一覧(/tags)の本体。タグは最大で直近 40 + 全期間 120 件並び、目当てのタグを目で探すのが辛いため、
 * 名前で絞り込める入力を上に置く。絞り込みはクライアント側の即時フィルタ(URL は変えない)。
 * 全タグのリンク自体はサーバー HTML に含まれる(クローラへの内部リンク集約点。ADR-0040)。
 */
export function TagBrowser({
  recent,
  all,
}: {
  /** 「最近よく書かれているタグ」。全期間と同じ並びのときは呼び出し側で null にして節ごと省く。 */
  recent: TagCount[] | null;
  all: TagCount[];
}) {
  const [query, setQuery] = useState('');
  const filteredRecent = recent ? filterTags(recent, query) : [];
  const filteredAll = filterTags(all, query);
  const isFiltering = query.trim() !== '';
  const noMatch = isFiltering && filteredRecent.length === 0 && filteredAll.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="relative w-full md:max-w-sm">
        <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          placeholder="タグ名で絞り込み"
          aria-label="タグを絞り込む"
          enterKeyHint="search"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
              return;
            }
            if (e.key === 'Escape' && query) {
              e.preventDefault();
              setQuery('');
            }
          }}
          // iOS はフォントが 16px 未満だとフォーカス時に自動ズームするため、md 未満は 16px にする。
          className="h-10 pr-10 pl-8 text-base md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="絞り込みをクリア"
            onClick={() => setQuery('')}
            className="text-fg-subtle hover:bg-bg-surface-2 hover:text-fg-default focus-visible:ring-accent absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {noMatch ? (
        <div className="text-center" role="status">
          <p className="text-fg-default font-bold">「{query.trim()}」に一致するタグはありません</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-accent focus-visible:ring-accent mt-3 rounded-sm text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            絞り込みをクリア
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {filteredRecent.length > 0 && (
            <TagSection heading="最近よく書かれているタグ" note="直近90日" tags={filteredRecent} />
          )}
          {filteredAll.length > 0 && (
            <TagSection heading="すべてのタグ" note="全期間" tags={filteredAll} />
          )}
        </div>
      )}
    </div>
  );
}

function TagSection({ heading, note, tags }: { heading: string; note: string; tags: TagCount[] }) {
  return (
    <section>
      <h2 className="text-fg-default mb-4 text-lg font-semibold">
        {heading}
        <span className="text-fg-muted ml-2 text-xs font-normal">{note}</span>
      </h2>
      <ul className="flex flex-wrap gap-2">
        {tags.map(({ tag, count }) => (
          <li key={tag}>
            <Link
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="border-border-default text-fg-muted hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors"
            >
              {tag}
              <span className="text-fg-muted text-xs tabular-nums">{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
