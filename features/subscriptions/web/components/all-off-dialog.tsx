'use client';

import { AlertDialog, Button } from '@heroui/react';
import { useState } from 'react';

/**
 * 「すべてOFF」の確認ダイアログ。フィードが空になる操作なので明示的な確認を挟む。
 * ログイン版(SubscriptionList)とゲスト版(GuestSubscriptionList)で共用する。
 * AlertDialog.Trigger は div(role=button)で Button をネストできないため、controlled で開閉する。
 */
export function AllOffDialog({
  disabled,
  onConfirm,
}: {
  disabled: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        isDisabled={disabled}
        onPress={() => setOpen(true)}
        className="bg-bg-surface rounded-sm"
      >
        すべて非表示
      </Button>
      <AlertDialog.Backdrop isOpen={open} onOpenChange={setOpen}>
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
    </>
  );
}
