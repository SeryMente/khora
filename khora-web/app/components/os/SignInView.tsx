import IntervaloSonoroMark from "./IntervaloSonoroMark";
import SignInSubmit from "./SignInSubmit";
export default function SignInView({ action, error = false }: { action: () => void | Promise<void>; error?: boolean }) {
    return <main className="khora-auth"><section aria-labelledby="khora-auth-title" className="khora-auth-panel">
        <div className="khora-auth-brand"><IntervaloSonoroMark variant={0} /><span>Khora</span></div>
        <h1 id="khora-auth-title">Entra a tu espacio.</h1>
        <p className="khora-auth-intro">Continúa con tu cuenta para abrir Khora.</p>
        {error && <p className="khora-auth-error" role="alert">No se pudo completar el acceso. Inténtalo de nuevo con tu cuenta.</p>}
        <form action={action}><SignInSubmit /></form>
        <p className="khora-auth-note">La verificación se realiza con tu proveedor de identidad mediante OpenID Connect.</p>
    </section></main>;
}
