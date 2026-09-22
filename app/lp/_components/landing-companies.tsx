import { LP_COMPANIES } from './faux-ui';
import { Reveal } from './reveal';

/**
 * 対応企業の一覧帯(Dewey の "Trusted by …" に対応)。
 * 集約対象の実社名を「テキストのみ」で記述的に挙げる(ロゴ/ファビコンは出さない)。
 * 各社とは無関係である旨はフッターの免責で明示する(掲載許可は得ていないため)。
 */
export function LandingCompanies() {
  return (
    <section id="companies" className="border-border-default/60 border-y bg-bg-surface/40 py-12">
      <Reveal className="w-full">
        <p className="px-6 text-center font-medium text-fg-faint text-xs uppercase tracking-[0.18em]">
          集約しているテックブログ(一部)
        </p>
        {/*
          無限マーキー: 同じ並びを2セット並べ、-50% 平行移動でシームレスにループ。
          hover で一時停止。reduced-motion 時は折り返し中央寄せ(globals.css)。
        */}
        <div className="lp-marquee mt-7 overflow-hidden">
          <ul className="lp-marquee-track items-center gap-x-10">
            {LP_COMPANIES.map((name) => (
              <li
                key={name}
                className="shrink-0 font-semibold text-fg-secondary text-sm sm:text-base"
              >
                {name}
              </li>
            ))}
            {/* ループ用の複製(読み上げ重複を避けるため aria-hidden)。 */}
            {LP_COMPANIES.map((name) => (
              <li
                key={`dup-${name}`}
                aria-hidden="true"
                className="lp-marquee-dupe shrink-0 font-semibold text-fg-secondary text-sm sm:text-base"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
