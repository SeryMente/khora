"use client";
import { useEffect, useState } from "react";
import IntervaloSonoroMark from "./IntervaloSonoroMark";
import { useBootVariant } from "../../../lib/brand/use-boot-variant";
/** Local waiting state, not another welcome screen or a progress simulation. */
export default function KhoraPending({ active = true, label = "Cargando sección.", delayMs = 300 }: { active?: boolean; label?: string; delayMs?: number }) {
    const variant = useBootVariant();
    const [shown, setShown] = useState(false);
    const [slow, setSlow] = useState(false);
    const delay = Number.isFinite(delayMs) ? Math.max(0, Math.min(1000, delayMs)) : 300;
    useEffect(() => {
        setShown(false); setSlow(false);
        if (!active) return;
        const reveal = setTimeout(() => setShown(true), delay);
        const prolonged = setTimeout(() => setSlow(true), 8000);
        return () => { clearTimeout(reveal); clearTimeout(prolonged); };
    }, [active, delay]);
    if (!active) return null;
    return <div className="khora-pending" aria-busy="true" data-testid="khora-pending">
        {shown && <div className="khora-pending-content" role="status" aria-live="polite" aria-atomic="true">
            <IntervaloSonoroMark variant={variant} />
            <div><p>{label}</p>{slow && <p className="khora-pending-slow">Está tardando más de lo habitual.</p>}</div>
        </div>}
    </div>;
}
