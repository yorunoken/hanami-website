import { useEffect } from "react";
import { signIn } from "../lib/auth";
import { Loader2 } from "lucide-react";

export default function Login() {
    useEffect(() => {
        signIn.social({ provider: "discord", callbackURL: "/profile" });
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="size-8 animate-spin text-zinc-400" />
                <p className="text-sm text-zinc-400">Redirecting to Discord...</p>
            </div>
        </div>
    );
}
