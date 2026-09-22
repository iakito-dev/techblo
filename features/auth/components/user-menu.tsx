'use client';

import { Avatar, Button, Dropdown, Header, Label } from '@heroui/react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from '../client';

type Props = {
  name: string | null;
  email: string;
  image: string | null;
  /** full: アバター + 名前/メールの全幅行(サイドバー下部用)。既定はアイコンのみ(モバイル上部バー用)。 */
  full?: boolean;
};

/** ログイン済みユーザーのアバター + ドロップダウン(HeroUI Dropdown / ログアウト)。 */
export function UserMenu({ name, email, image, full = false }: Props) {
  const router = useRouter();
  const initial = (name ?? email).charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.refresh();
  }

  const avatar = (
    <Avatar size="sm">
      {image ? <Avatar.Image src={image} alt="" /> : null}
      <Avatar.Fallback className="bg-bg-inverse font-medium text-fg-inverse text-sm">
        {initial}
      </Avatar.Fallback>
    </Avatar>
  );

  return (
    <Dropdown>
      {full ? (
        <Button
          variant="ghost"
          aria-label="アカウントメニュー"
          className="h-auto w-full justify-start gap-2.5 rounded-md px-2 py-2 text-left"
        >
          {avatar}
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-sm">{name ?? email}</span>
            {name && <span className="truncate text-fg-muted text-xs">{email}</span>}
          </span>
        </Button>
      ) : (
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label="アカウントメニュー"
          className="overflow-hidden rounded-full p-0"
        >
          {avatar}
        </Button>
      )}
      <Dropdown.Popover className="min-w-[224px]">
        <Dropdown.Menu
          aria-label="アカウントメニュー"
          onAction={(key) => {
            if (key === 'signout') void handleSignOut();
          }}
        >
          <Dropdown.Section>
            <Header className="flex flex-col gap-0.5 px-3 py-2">
              {name && <span className="truncate font-medium text-sm">{name}</span>}
              <span className="truncate text-fg-muted text-xs">{email}</span>
            </Header>
            <Dropdown.Item id="signout" textValue="ログアウト">
              <LogOut className="size-4" />
              <Label>ログアウト</Label>
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
