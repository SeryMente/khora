import { signIn } from "@/auth";
import SignInView from "../../components/os/SignInView";
export default async function SignInPage({ searchParams }: {
    searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
    const params = await searchParams;
    const raw = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl;
    const callbackUrl = raw?.startsWith("/") ? raw : "/";
    return <SignInView error={Boolean(params.error)} action={async () => {
        "use server";
        await signIn("oidc", { redirectTo: callbackUrl });
    }} />;
}
