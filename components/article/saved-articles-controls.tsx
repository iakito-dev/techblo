'use client';

import { Button, Dropdown, Label } from '@heroui/react';
import { ArrowUpDown, ChevronDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { SavedSort } from './saved-articles-filter';

const SORT_OPTIONS: { value: SavedSort; label: string }[] = [
  { value: 'savedAt', label: '保存した順(新しい順)' },
  { value: 'publishedAtDesc', label: '公開日が新しい順' },
  { value: 'publishedAtAsc', label: '公開日が古い順' },
];

/**
 * 保存一覧の絞り込み入力。クライアント側の即時絞り込みなので、IME 変換中の中間文字列でも
 * 結果が揺れるだけで害はなく、composition の特別扱いはしない(URL 更新を伴うフィード検索と違う)。
 */
export function SavedSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="relative w-full lg:max-w-md">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-subtle" />
      <Input
        type="search"
        value={value}
        placeholder="タイトル・企業名・タグで絞り込み"
        aria-label="保存した記事を絞り込む"
        enterKeyHint="search"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
            return;
          }
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            onChange('');
          }
        }}
        // iOS はフォントが 16px 未満だとフォーカス時に自動ズームするため、lg 未満は 16px にする。
        className="h-9 pr-9 pl-8 text-base lg:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="絞り込みをクリア"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-fg-subtle transition-colors hover:bg-bg-surface-2 hover:text-fg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export function SavedSortDropdown({
  sort,
  onSelect,
}: {
  sort: SavedSort;
  onSelect: (next: SavedSort) => void;
}) {
  const currentLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? '保存した順(新しい順)';
  return (
    <Dropdown>
      <Button
        variant="outline"
        aria-label="並び替え"
        className="h-9 shrink-0 gap-1.5 rounded-sm bg-bg-surface font-medium text-sm shadow-xs"
      >
        <ArrowUpDown className="size-4 shrink-0 text-fg-muted" />
        <span className="whitespace-nowrap">{currentLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-fg-subtle" />
      </Button>
      <Dropdown.Popover className="w-52 rounded-sm">
        <Dropdown.Menu
          aria-label="並び替え"
          className="rounded-sm"
          selectionMode="single"
          selectedKeys={[sort]}
          onSelectionChange={(keys) => {
            if (keys === 'all') return;
            const key = [...keys][0];
            if (key) onSelect(key as SavedSort);
          }}
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <Dropdown.Item key={value} id={value} textValue={label}>
              <Label>{label}</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
