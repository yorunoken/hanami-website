import { Button } from "@/components/ui/button";
import { LogOut, MessageCircle } from "lucide-react";
import { SiOsu } from "react-icons/si";
import { Link, useLocation } from "react-router-dom";
import { signIn, signOut, useSession } from "../client/lib/auth";

export default function Header() {
    const { data: session, isPending } = useSession();
    const location = useLocation();
    const isProfilePage = location.pathname === "/profile";

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/8 bg-black/35 backdrop-blur-xl">
            <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
                <Link to="/" className="flex items-center gap-3 text-sm font-semibold text-white">
                    <img src="/hanami-transparent.png" className="size-10" alt="" />
                    <span>Hanami</span>
                </Link>

                {/* Show navigation links only on the homepage */}
                {!isProfilePage && (
                    <div className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
                        <a href="#commands" className="transition-colors hover:text-white">
                            Commands
                        </a>
                        <a href="#source" className="transition-colors hover:text-white">
                            Source
                        </a>
                        <a href="#support" className="transition-colors hover:text-white">
                            Support
                        </a>
                    </div>
                )}

                {!isPending && (
                    <div className="flex items-center gap-2">
                        {isProfilePage ? (
                            session && (
                                <Button
                                    onClick={() =>
                                        signOut({
                                            fetchOptions: {
                                                onSuccess: () => {
                                                    window.location.href = "/";
                                                },
                                            },
                                        })
                                    }
                                    variant="ghost"
                                    className="h-10 rounded-lg px-2 text-red-200 hover:bg-red-500/12 hover:text-red-100 sm:px-3"
                                    aria-label="Log out"
                                >
                                    <LogOut className="size-4" />
                                    <span className="hidden sm:inline">Log out</span>
                                </Button>
                            )
                        ) : session ? (
                            <Button asChild className="h-10 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200">
                                <Link to="/profile">Dashboard</Link>
                            </Button>
                        ) : (
                            <Button onClick={() => signIn.social({ provider: "discord", callbackURL: "/profile" })} className="h-10 rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4]">
                                <MessageCircle className="size-4" />
                                Login
                            </Button>
                        )}
                    </div>
                )}
            </nav>
        </header>
    );
}
