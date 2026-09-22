/**
 * 構造化ログ。本番では JSON、開発では人間可読。
 * console.log を直接呼ばず、必ずこのモジュールを使う(docs/principles/code.md)。
 */

type LogContext = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', msg: string, ctx?: LogContext) {
  if (process.env.NODE_ENV === 'production') {
    console.log(
      JSON.stringify({
        level,
        msg,
        ...ctx,
        ts: new Date().toISOString(),
      }),
    );
  } else {
    console.log(`[${level}] ${msg}`, ctx ?? '');
  }
}

export const logger = {
  info: (msg: string, ctx?: LogContext) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit('error', msg, ctx),
};
