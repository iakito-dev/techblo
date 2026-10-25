'use client';

import { AlertDialog, Button } from '@heroui/react';
import { Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CompanyFavicon } from '@/components/ui/company-favicon';
import { SettingsSection } from '@/components/ui/settings-section';
import type { CompanyId } from '@/shared/type-utils';
import type { SubscriptionSetting } from '../../application/dto';
import { toggleSubscriptionAction } from '../actions';
import { trackSubscriptionChange } from '../track-subscription';
import { SubscriptionToggle } from './subscription-toggle';

/** 保存成功チェックの表示時間(ms)。 */
const SAVED_FLASH_MS = 1500;

/**
 * 「購読企業」セクション(見出しの購読数 + 検索 + 一括操作 + 2カラムグリッド)。
 *
 * 購読状態は一覧でリフトして持つ(件数表示・一括操作・各行トグルで共有)。
 * 各変更は楽観更新し、失敗時はロールバック + エラートースト、成功時はトグル横に一瞬チェックを出す。
 * すべて OFF はフィードが空になる操作なので確認ダイアログを挟む。
 * 並びは企業名順(サーバーの取得順)を維持し、グリッドは行優先(左→右、上→下)。
 */
export function SubscriptionList({ settings }: { settings: SubscriptionSetting[] }) {
  const [enabledMap, setEnabledMap] = useState<ReadonlyMap<CompanyId, boolean>>(
    () => new Map(settings.map((s) => [s.companyId, s.enabled])),
  );
  const [savedFlash, setSavedFlash] = useState<ReadonlySet<CompanyId>>(new Set());
  const flashTimers = useRef(new Map<CompanyId, ReturnType<typeof setTimeout>>());
  const [query, setQuery] = useState('');
  const [bulkPending, setBulkPending] = useState(false);

  const isEnabled = (s: SubscriptionSetting) => enabledMap.get(s.companyId) ?? s.enabled;
  const enabledCount = settings.filter(isEnabled).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return settings;
    return settings.filter((s) => s.name.toLowerCase().includes(q));
  }, [settings, query]);

  function flashSaved(companyId: CompanyId) {
    const prevTimer = flashTimers.current.get(companyId);
    if (prevTimer) clearTimeout(prevTimer);
    setSavedFlash((prev) => new Set(prev).add(companyId));
    flashTimers.current.set(
      companyId,
      setTimeout(() => {
        setSavedFlash((prev) => {
          const next = new Set(prev);
          next.delete(companyId);
          return next;
        });
        flashTimers.current.delete(companyId);
      }, SAVED_FLASH_MS),
    );
  }

  function setEnabled(setting: SubscriptionSetting, next: boolean) {
    setEnabledMap((prev) => new Map(prev).set(setting.companyId, next));
    void toggleSubscriptionAction({ companyId: setting.companyId, enabled: next }).then(
      (result) => {
        if (result.ok) {
          flashSaved(setting.companyId);
          trackSubscriptionChange(setting, next, { isGuest: false, bulk: false });
        } else {
          setEnabledMap((prev) => new Map(prev).set(setting.companyId, !next));
          toast.error(`「${setting.name}」の更新に失敗しました`);
        }
      },
    );
  }

  async function bulkSet(next: boolean) {
    const targets = settings.filter((s) => isEnabled(s) !== next);
    if (targets.length === 0) return;
    setBulkPending(true);
    setEnabledMap((prev) => {
      const map = new Map(prev);
      for (const t of targets) map.set(t.companyId, next);
      return map;
    });
    const results = await Promise.all(
      targets.map((t) =>
        toggleSubscriptionAction({ companyId: t.companyId, enabled: next }).catch(() => null),
      ),
    );
    const failed = targets.filter((_, i) => !results[i]?.ok);
    targets.forEach((t, i) => {
      if (results[i]?.ok) trackSubscriptionChange(t, next, { isGuest: false, bulk: true });
    });
    if (failed.length > 0) {
      setEnabledMap((prev) => {
        const map = new Map(prev);
        for (const t of failed) map.set(t.companyId, !next);
        return map;
      });
      toast.error(`${failed.length}社の更新に失敗しました`);
    } else {
      toast.success(next ? 'すべての企業を表示しました' : 'すべての企業を非表示にしました');
    }
    setBulkPending(false);
  }

  return (
    <SettingsSection
      title={`表示する企業(${enabledCount}/${settings.length})`}
      description="フィードに表示する企業を選びます。非表示にした企業の記事は表示されません。"
    >
      {/* 検索 + 一括操作。リストが長くてもスクロールで流れないようセクション上部に吸着する。
          z-20 + 下のリストを isolate で別スタッキングに閉じ込め、行トグル(relative z-10)が
          吸着バーを突き抜けないようにする。 */}
      <div className="sticky top-16 z-20 -mx-1 bg-bg-app px-1 pt-1 pb-3 lg:top-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* 検索はモバイルでは出さない(縦1カラムで一覧でき、一括操作を主にするため)。lg+ のみ表示。 */}
          <div className="relative hidden min-w-44 flex-1 lg:block">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="企業名で検索"
              aria-label="企業名で検索"
              className="h-9 w-full rounded-sm border border-border-default bg-bg-surface pr-3 pl-8 text-sm shadow-xs outline-none placeholder:text-fg-subtle focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            isDisabled={bulkPending || enabledCount === settings.length}
            onPress={() => void bulkSet(true)}
            className="rounded-sm bg-bg-surface"
          >
            すべて表示
          </Button>
          <AllOffDialog
            disabled={bulkPending || enabledCount === 0}
            onConfirm={() => void bulkSet(false)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-fg-muted text-sm">該当する企業がありません</p>
      ) : (
        <ul
          aria-busy={bulkPending}
          className={`isolate grid grid-cols-1 gap-2.5 transition-opacity md:grid-cols-2 ${
            bulkPending ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {filtered.map((s) => {
            const enabled = isEnabled(s);
            return (
              <li
                key={s.companyId}
                title={s.siteUrl}
                className="relative flex items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-3.5 py-3 shadow-xs transition-colors hover:bg-bg-surface-2/60"
              >
                {/* セル全体をクリック領域にする透明ボタン。アクセシブルな操作は Switch 側が担う
                    (tabIndex=-1 + aria-hidden でフォーカス・読み上げの重複を避ける)。
                    Switch は z-10 で上に乗るためトグル直接クリックと二重発火しない。 */}
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setEnabled(s, !enabled)}
                  className="absolute inset-0 cursor-pointer rounded-lg"
                />
                {/* OFF の行は沈めて購読中/停止中を一覧で判別できるようにする */}
                <span
                  className={`flex min-w-0 flex-1 items-center gap-2.5 transition-opacity ${
                    enabled ? '' : 'opacity-60'
                  }`}
                >
                  <CompanyFavicon url={s.siteUrl} name={s.name} />
                  <span className="truncate font-medium text-sm">{s.name}</span>
                </span>
                <span className="relative z-10">
                  <SubscriptionToggle
                    name={s.name}
                    enabled={enabled}
                    justSaved={savedFlash.has(s.companyId)}
                    onChange={(next) => setEnabled(s, next)}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SettingsSection>
  );
}

/**
 * 「すべてOFF」の確認ダイアログ。フィードが空になる操作なので明示的な確認を挟む。
 * AlertDialog.Trigger は div(role=button)で Button をネストできないため、controlled で開閉する。
 */
function AllOffDialog({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        isDisabled={disabled}
        onPress={() => setOpen(true)}
        className="rounded-sm bg-bg-surface"
      >
        すべて非表示
      </Button>
      <AlertDialog isOpen={open} onOpenChange={setOpen}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>すべての企業を非表示にしますか?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                すべての企業を非表示にすると、フィードに記事が表示されなくなります。
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="outline" onPress={() => setOpen(false)}>
                  キャンセル
                </Button>
                <Button
                  variant="danger"
                  onPress={() => {
                    setOpen(false);
                    onConfirm();
                  }}
                >
                  すべて非表示にする
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
