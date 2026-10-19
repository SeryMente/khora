"use client";
import { useFormStatus } from "react-dom";
export default function SignInSubmit() {
    const { pending } = useFormStatus();
    return <><button className="khora-auth-submit" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Abriendo el acceso…" : "Continuar con mi cuenta"}
    </button><p className="khora-auth-status" role="status" aria-live="polite">{pending ? "Esperando al proveedor de identidad." : ""}</p></>;
}
