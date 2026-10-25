'use client';

import { AlertDialog, Button, Switch } from '@heroui/react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CompanyFavicon } from '@/components/ui/company-favicon';
import { SettingsSection } from '@/components/ui/settings-section';
import type { UserFeedSetting } from '../../application/dto';
import {
  addUserFeedAction,
  refreshUserFeedAction,
  removeUserFeedAction,
  toggleUserFeedAction,
} from '../actions';

/**
 * 「マイフィード」セクション(ログイン専用)。
 * URL を登録すると即時取得し、メインフィード(新着順)に自分の記事だけがマージされる(ADR-0014)。
 *
 * トグルは楽観更新(失敗時ロールバック)。追加/削除/更新は成功後に router.refresh() で一覧を再取得する
 * (件数・最終取得・エラー表示をサーバーの真実に同期させる)。
 */
export function UserFeedList({ feeds, limit }: { feeds: UserFeedSetting[]; limit: number }) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [adding, startAdd] = useTransition();
  const [enabledMap, setEnabledMap] = useState<ReadonlyMap<string, boolean>>(
    () => new Map(feeds.map((f) => [f.id, f.enabled])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserFeedSetting | null>(null);

  const atLimit = feeds.length >= limit;

  function submit() {
    const value = url.trim();
    if (!value || adding) return;
    startAdd(async () => {
      const result = await addUserFeedAction(value);
      if (result.ok) {
        toast.success(`フィードを追加しました(${result.value.added} 件の記事)`);
        setUrl('');
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  function toggle(feed: UserFeedSetting, next: boolean) {
    const prev = enabledMap.get(feed.id) ?? feed.enabled;
    setEnabledMap((m) => new Map(m).set(feed.id, next));
    void (async () => {
      const result = await toggleUserFeedAction({ id: feed.id, enabled: next });
      if (!result.ok) {
        setEnabledMap((m) => new Map(m).set(feed.id, prev)); // ロールバック
        toast.error(result.error.message);
      }
    })();
  }

  function refresh(feed: UserFeedSetting) {
    if (busyId) return;
    setBusyId(feed.id);
    void (async () => {
      const result = await refreshUserFeedAction(feed.id);
      if (result.ok) {
        toast.success(
          result.value.added > 0
            ? `${result.value.added} 件の新着を取り込みました`
            : '新着はありませんでした',
        );
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
      setBusyId(null);
    })();
  }

  function confirmRemove(feed: UserFeedSetting) {
    setPendingDelete(null);
    setBusyId(feed.id);
    void (async () => {
      const result = await removeUserFeedAction(feed.id);
      if (result.ok) {
        toast.success('フィードを削除しました');
        router.refresh();
      } else {
        toast.error(result.error.message);
        setBusyId(null);
      }
    })();
  }

  return (
    <SettingsSection
      title={`マイフィード(${feeds.length}/${limit})`}
      description="好きなブログやサイトの RSS / Atom を登録すると、新着記事がフィード画面に表示されるようになります。"
    >
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/feed.xml"
          aria-label="RSS / Atom の URL"
          disabled={adding || atLimit}
          className="h-9 min-w-44 flex-1 rounded-sm border border-border-default bg-bg-surface px-3 text-sm shadow-xs outline-none placeholder:text-fg-subtle focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        />
        <Button
          type="submit"
          size="sm"
          isDisabled={adding || atLimit || url.trim().length === 0}
          isPending={adding}
          className="rounded-sm"
        >
          <Plus aria-hidden="true" className="size-4" />
          登録
        </Button>
      </form>
      {atLimit && (
        <p className="text-fg-muted text-sm">
          登録上限({limit} 件)に達しています。不要なフィードを削除してください。
        </p>
      )}

      {feeds.length === 0 ? (
        <p className="py-8 text-center text-fg-muted text-sm">
          まだ登録がありません。上の欄に RSS の URL を入力して登録してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {feeds.map((feed) => {
            const enabled = enabledMap.get(feed.id) ?? feed.enabled;
            const busy = busyId === feed.id;
            return (
              <li
                key={feed.id}
                className={`flex items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-3.5 py-3 shadow-xs ${
                  busy ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                <span
                  className={`flex min-w-0 flex-1 items-center gap-2.5 ${enabled ? '' : 'opacity-60'}`}
                >
                  <CompanyFavicon url={feed.siteUrl ?? feed.rssUrl} name={feed.title} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-sm">{feed.title}</span>
                    <span className="truncate text-fg-subtle text-xs" title={feed.rssUrl}>
                      {feed.rssUrl}
                    </span>
                    {feed.lastError && (
                      <span className="truncate text-danger text-xs">
                        取得エラー: {feed.lastError}
                      </span>
                    )}
                  </span>
                </span>
                <Switch
                  isSelected={enabled}
                  onChange={(next) => toggle(feed, next)}
                  aria-label={`「${feed.title}」をフィードに表示`}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  aria-label={`「${feed.title}」を更新`}
                  isDisabled={busy}
                  onPress={() => refresh(feed)}
                >
                  <RefreshCw aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  aria-label={`「${feed.title}」を削除`}
                  isDisabled={busy}
                  onPress={() => setPendingDelete(feed)}
                >
                  <Trash2 aria-hidden="true" className="size-4 text-danger" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        isOpen={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>フィードを削除しますか?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                「{pendingDelete?.title}」と取り込んだ記事を削除します。元に戻せません。
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="outline" onPress={() => setPendingDelete(null)}>
                  キャンセル
                </Button>
                <Button
                  variant="danger"
                  onPress={() => pendingDelete && confirmRemove(pendingDelete)}
                >
                  削除する
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </SettingsSection>
  );
}
