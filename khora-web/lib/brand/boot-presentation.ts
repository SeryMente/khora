/** Cosmetic presentation only. Never a session, authorization or identity signal. */
export function isTechnicalEntry(pathname: string): boolean {
    return /^\/(auth|oauth|api|ui-review)(\/|$)|^\/(offline|capturar\/compartir)\/?$/.test(pathname);
}
export function shouldPresentBoot(type: string, pathname: string, internalReferrer: boolean, handoff: boolean): boolean {
    return !isTechnicalEntry(pathname) && type !== "reload" && type !== "back_forward" && !internalReferrer && !handoff;
}
// Self-contained so the decision runs in <head>, before the SSR surface can paint.
function prepareBoot() {
    const root = document.documentElement;
    let show = false;
    try {
        const technical = /^\/(auth|oauth|api|ui-review)(\/|$)|^\/(offline|capturar\/compartir)\/?$/.test(location.pathname);
        const type = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type || "navigate";
        let handoff = false;
        try {
            handoff = sessionStorage.getItem("khora.boot.handoff") === "1";
            if (technical) sessionStorage.setItem("khora.boot.handoff", "1");
            else sessionStorage.removeItem("khora.boot.handoff");
        } catch { /* Storage denial must not prevent access. */ }
        const internal = !!document.referrer && new URL(document.referrer).origin === location.origin;
        show = !technical && type !== "reload" && type !== "back_forward" && !internal && !handoff;
    } catch { /* Unknown navigation: do not obstruct the product. */ }
    root.dataset.khoraBoot = show ? "show" : "skip";
    if (show) window.setTimeout(() => {
        if (root.dataset.khoraBootComplete !== "true") {
            root.dataset.khoraBoot = "skip";
            root.dataset.khoraBootComplete = "true";
        }
    }, 2500);
}
export const BOOT_PRESENTATION_SCRIPT = `(${prepareBoot.toString()})();`;
