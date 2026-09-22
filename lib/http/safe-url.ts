import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { err, ok, type Result } from '@/shared/result';

/**
 * ユーザー入力 URL を外部 fetch する際の SSRF 対策。
 *
 * 企業RSS(運営管理)と違い、マイフィードの URL はユーザーが自由に入力する。
 * そのまま fetch するとループバック/プライベート/リンクローカル/クラウドメタデータ(169.254.169.254)
 * など内部リソースへ到達できてしまうため、登録時・取得時にホストを検証して内部宛てを拒否する。
 *
 * 注意: ホスト名解決後のチェックのため DNS rebinding(解決後に内部 IP へ差し替える攻撃)は完全には
 * 防げない。MVP では実用上十分とし、必要なら将来 resolve 済み IP へ直接接続する方式に強化する。
 */

const MAX_URL_LENGTH = 2048;

/** IPv4 文字列を 32bit 整数へ。失敗時は null。 */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

function isBlockedIpv4(ip: string): boolean {
  const v = ipv4ToInt(ip);
  if (v === null) return true; // パースできない=安全側で拒否
  const inRange = (base: string, maskBits: number): boolean => {
    const baseInt = ipv4ToInt(base);
    if (baseInt === null) return false;
    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
    return (v & mask) === (baseInt & mask);
  };
  return (
    inRange('0.0.0.0', 8) || // 現在のネットワーク
    inRange('10.0.0.0', 8) || // プライベート
    inRange('100.64.0.0', 10) || // CGNAT
    inRange('127.0.0.0', 8) || // ループバック
    inRange('169.254.0.0', 16) || // リンクローカル(クラウドメタデータ含む)
    inRange('172.16.0.0', 12) || // プライベート
    inRange('192.0.0.0', 24) || // IETF プロトコル割当
    inRange('192.168.0.0', 16) || // プライベート
    inRange('198.18.0.0', 15) || // ベンチマーク
    inRange('224.0.0.0', 4) || // マルチキャスト
    inRange('240.0.0.0', 4) // 予約
  );
}

function isBlockedIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0] ?? ip.toLowerCase(); // ゾーン ID を除去
  // IPv4-mapped (::ffff:a.b.c.d) は埋め込み v4 で判定
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1] ?? '');
  if (addr === '::1' || addr === '::') return true; // ループバック / 未指定
  if (
    addr.startsWith('fe8') ||
    addr.startsWith('fe9') ||
    addr.startsWith('fea') ||
    addr.startsWith('feb')
  )
    return true; // fe80::/10 リンクローカル
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // fc00::/7 ULA
  return false;
}

/** IP 文字列が内部宛て(到達禁止)か。DNS なしで判定できる純関数(テスト対象)。 */
export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isBlockedIpv4(ip);
  if (kind === 6) return isBlockedIpv6(ip);
  return true; // IP として解釈できないものは拒否
}

/**
 * URL の形式・スキームを検証する(DNS を引かない同期チェック)。
 * http/https のみ許可し、認証情報埋め込み(user:pass@)を拒否する。
 */
export function parsePublicHttpUrl(raw: string): Result<URL, string> {
  if (raw.length > MAX_URL_LENGTH) return err('URL が長すぎます');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return err('URL の形式が正しくありません');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return err('http または https の URL を指定してください');
  }
  if (url.username || url.password) {
    return err('認証情報を含む URL は登録できません');
  }
  return ok(url);
}

/**
 * ユーザー入力 URL が外部 fetch して安全か検証する。
 * 形式チェック → ホスト名を解決 → 解決した全 IP が内部宛てでないことを確認する。
 */
export async function assertPublicHttpUrl(raw: string): Promise<Result<string, string>> {
  const parsed = parsePublicHttpUrl(raw);
  if (!parsed.ok) return parsed;
  const url = parsed.value;

  // ホスト名が IP リテラルならそのまま判定。それ以外は解決して全アドレスを検査する。
  if (isIP(url.hostname)) {
    return isBlockedIp(url.hostname) ? err('到達できないホストです') : ok(url.toString());
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch {
    return err('ホスト名を解決できませんでした');
  }
  if (addresses.length === 0) return err('ホスト名を解決できませんでした');
  if (addresses.some((a) => isBlockedIp(a.address))) {
    return err('到達できないホストです');
  }
  return ok(url.toString());
}
