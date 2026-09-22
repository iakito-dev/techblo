import { describe, expect, it } from 'vitest';
import { toNewSubscriptions } from './initialize-user-subscriptions';

describe('toNewSubscriptions', () => {
  it('全 companyId を enabled=true の購読行へマップする', () => {
    expect(toNewSubscriptions('user-1', ['c1', 'c2', 'c3'])).toEqual([
      { userId: 'user-1', companyId: 'c1', enabled: true },
      { userId: 'user-1', companyId: 'c2', enabled: true },
      { userId: 'user-1', companyId: 'c3', enabled: true },
    ]);
  });

  it('空配列なら空を返す', () => {
    expect(toNewSubscriptions('user-1', [])).toEqual([]);
  });
});
