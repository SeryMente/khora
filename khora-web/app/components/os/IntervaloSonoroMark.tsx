import { intervaloGeometry, INTERVALO_VERSION } from "../../../lib/brand/intervalo-sonoro";

/** Six bars, one interval, one exception. All variation stays inside this grammar. */
export default function IntervaloSonoroMark({ variant = 0 }: { variant?: number }) {
    const model = intervaloGeometry(variant);
    return (
        <svg className="khora-splash-mark" viewBox="0 0 160 100" aria-hidden="true"
            focusable="false" data-testid="intervalo-sonoro" data-variant={model.index}
            data-brand-version={INTERVALO_VERSION} data-cut-bar={model.cutBar}>
            {model.bars.map((bar, i) => <rect key={i} {...bar} fill="currentColor" />)}
            <path className="khora-splash-cut" d={model.cut} />
        </svg>
    );
}
