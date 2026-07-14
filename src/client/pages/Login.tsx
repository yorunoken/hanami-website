import { MessageCircle } from "lucide-react";
import { useState } from "react";

import { signIn, useSession } from "@/client/lib/auth";
import { routes } from "@/client/routes/paths";
import { AuthLayout, AuthPanel } from "@/components/account/account-shell";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { formMessageClass, primaryActionClass } from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";

export default function Login() {
    const { data: session, isPending: isSessionPending } = useSession();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSignIn() {
        setIsRedirecting(true);
        setError(null);
        try {
            await signIn.social({ provider: "discord", callbackURL: "/profile" });
        } catch {
            setError("Discord sign-in could not be started. Please try again.");
            setIsRedirecting(false);
        }
    }

    return (
        <AuthLayout>
            <AuthPanel aria-labelledby="sign-in-title">
                <p className="mb-[1.1rem] font-mono text-[0.72rem] leading-[1.4] font-semibold tracking-[0.14em] text-accent-soft uppercase">
                    Hanami account
                </p>
                <h1 id="sign-in-title">Sign in with Discord</h1>
                <p>
                    Discord provides your account ID, display name, avatar, and email to Hanami. Sign-in is required to link an osu! account
                    and manage bot preferences.
                </p>

                {session ? (
                    <PrefetchLink className={cn(primaryActionClass, "mt-8 w-full")} to={routes.profile}>
                        Continue to account
                    </PrefetchLink>
                ) : (
                    <button
                        className={cn(primaryActionClass, "mt-8 w-full")}
                        type="button"
                        onClick={handleSignIn}
                        disabled={isSessionPending || isRedirecting}
                    >
                        <MessageCircle aria-hidden="true" />
                        {isRedirecting ? "Opening Discord…" : "Continue with Discord"}
                    </button>
                )}

                {error && (
                    <p className={cn(formMessageClass, "text-danger!")} role="alert">
                        {error}
                    </p>
                )}
                <p className="text-[0.78rem] [&_a]:text-white [&_a]:underline-offset-[0.2em]">
                    Continuing does not link an osu! account automatically. Read the{" "}
                    <PrefetchLink to={routes.legalPrivacy}>privacy policy</PrefetchLink> first if you need more detail.
                </p>
            </AuthPanel>
        </AuthLayout>
    );
}
