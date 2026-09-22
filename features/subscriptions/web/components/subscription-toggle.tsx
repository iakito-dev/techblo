'use client';

import { Switch } from '@heroui/react';
import { Check } from 'lucide-react';

/**
 * 購読 ON/OFF のトグルスイッチ(HeroUI Switch / controlled)。
 * 状態と保存処理は SubscriptionList が持つ(検索・一括操作・件数表示と共有するため)。
 * justSaved の間はチェックを出し、保存が成功したことを控えめにフィードバックする。
 */
export function SubscriptionToggle({
  name,
  enabled,
  justSaved,
  onChange,
}: {
  name: string;
  enabled: boolean;
  justSaved: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <Check
        aria-hidden="true"
        className={`size-4 text-accent transition-opacity duration-300 ${
          justSaved ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <Switch isSelected={enabled} onChange={onChange} aria-label={`「${name}」の購読`}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch>
    </span>
  );
}
