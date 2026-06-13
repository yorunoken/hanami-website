import { Button } from "@/components/ui/button";
import { Activity, AlertCircle, ArrowDown, ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Fingerprint, Loader2, Lock, LogOut, MessageCircle, Unlink } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SiOsu } from "react-icons/si";
import { Link } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";

import { signIn, signOut, useSession } from "../lib/auth";
import { cn } from "@/lib/utils";

interface LinkStatus {
    linked: boolean;
    banchoId?: string;
    username?: string;
    avatarUrl?: string;
    globalRank?: number | null;
}

interface BotSettings {
    mode: string;
    score_embeds: number;
    embed_type: string;
    score_data: number;
}

type OsuState = "checking" | "linked" | "empty";

export default function Profile() {
    const { data: session, isPending } = useSession();
    const [linkStatus, setLinkStatus] = useState<LinkStatus | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [action, setAction] = useState<"linking" | "unlinking" | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [settings, setSettings] = useState<BotSettings | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [settingsSuccess, setSettingsSuccess] = useState<boolean>(false);

    const hasFetched = useRef(false);

    useEffect(() => {
        if (!session) {
            setIsLoadingStatus(false);
            setIsLoadingSettings(false);
            return;
        }

        if (hasFetched.current) return;
        hasFetched.current = true;

        let isMounted = true;
        setIsLoadingStatus(true);
        setIsLoadingSettings(true);
        setError(null);
        setSettingsError(null);

        fetch("/api/osu-link/status")
            .then((res) => res.json())
            .then((data) => {
                if (!isMounted) return;

                if (data.error) {
                    setError("Could not read osu! link status.");
                    return;
                }

                setLinkStatus(data);
            })
            .catch(() => {
                if (isMounted) setError("Could not read osu! link status.");
            })
            .finally(() => {
                if (isMounted) setIsLoadingStatus(false);
            });

        fetch("/api/osu-link/settings")
            .then((res) => res.json())
            .then((data) => {
                if (!isMounted) return;

                if (data.error) {
                    setSettingsError("Could not read bot configurations.");
                    return;
                }

                setSettings(data);
            })
            .catch(() => {
                if (isMounted) setSettingsError("Could not read bot configurations.");
            })
            .finally(() => {
                if (isMounted) setIsLoadingSettings(false);
            });

        return () => {
            isMounted = false;
        };
    }, [session]);

    const handleLinkOsu = async () => {
        setAction("linking");
        setError(null);

        try {
            const res = await fetch("/api/auth");
            const data = await res.json();

            if (data.url) {
                window.location.href = data.url;
                return;
            }

            setError("Could not start osu! authorization.");
        } catch {
            setError("Could not start osu! authorization.");
        } finally {
            setAction(null);
        }
    };

    const handleUnlinkOsu = async () => {
        setAction("unlinking");
        setError(null);

        try {
            const res = await fetch("/api/osu-link/unlink", { method: "DELETE" });
            const data = await res.json();

            if (data.success) {
                setLinkStatus({ linked: false });
                return;
            }

            setError(data.error || "Could not unlink osu! account.");
        } catch {
            setError("Could not unlink osu! account.");
        } finally {
            setAction(null);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setIsSavingSettings(true);
        setSettingsError(null);
        setSettingsSuccess(false);

        try {
            const res = await fetch("/api/osu-link/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            if (data.success) {
                setSettingsSuccess(true);
                setTimeout(() => setSettingsSuccess(false), 3000);
            } else {
                setSettingsError(data.error || "Could not update bot configurations.");
            }
        } catch {
            setSettingsError("Could not update bot configurations.");
        } finally {
            setIsSavingSettings(false);
        }
    };

    if (isPending) {
        return (
            <PageShell centered>
                <LoadingNote>Loading Dashboard</LoadingNote>
            </PageShell>
        );
    }

    if (!session) {
        return (
            <PageShell centered>
                <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#0f1115]/90 p-8 shadow-2xl backdrop-blur-md">
                    <div className="flex flex-col items-center text-center">
                        <span className="flex size-14 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800">
                            <Lock className="size-6" />
                        </span>

                        <h1 className="mt-5 text-2xl font-bold text-white">Profile Locked</h1>
                        <p className="mt-2 text-sm text-zinc-400">Please authenticate with Discord to continue.</p>
                    </div>

                    <div className="mt-8 space-y-3">
                        <Button
                            onClick={() => signIn.social({ provider: "discord", callbackURL: "/profile" })}
                            className="w-full h-11 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] font-medium text-white transition-colors duration-150"
                        >
                            <MessageCircle className="mr-2 size-5 fill-current" />
                            Login with Discord
                        </Button>

                        <Button asChild variant="ghost" className="w-full h-10 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors duration-150">
                            <Link to="/" className="flex items-center justify-center gap-2 text-sm">
                                <ArrowLeft className="size-4" />
                                Back
                            </Link>
                        </Button>
                    </div>
                </div>
            </PageShell>
        );
    }

    const displayName = session.user.name || "Discord user";
    const initial = displayName.trim().charAt(0).toUpperCase() || "H";
    const osuState: OsuState = isLoadingStatus ? "checking" : linkStatus?.linked ? "linked" : "empty";

    return (
        <PageShell>
            <Header />

            <main className="relative z-10 mx-auto w-full max-w-5xl px-5 pt-26 pb-10 sm:pt-32 sm:pb-16">
                <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight sm:text-4xl">Settings</h1>
                        <p className="text-base text-zinc-400 mt-1">Configure your linked profiles and bot preferences.</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-950 bg-red-950/20 p-4 text-sm text-red-200">
                        <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-400" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 md:gap-4 relative">
                    <div className="flex-1 min-w-0">
                        <IdentityPanel displayName={displayName} email={session.user.email} image={session.user.image} initial={initial} />
                    </div>

                    <ProfileConnector state={osuState} />

                    <div className="flex-1 min-w-0">
                        <OsuPanel
                            action={action}
                            banchoId={linkStatus?.banchoId}
                            username={linkStatus?.username}
                            avatarUrl={linkStatus?.avatarUrl}
                            globalRank={linkStatus?.globalRank}
                            state={osuState}
                            onLink={handleLinkOsu}
                            onUnlink={handleUnlinkOsu}
                        />
                    </div>
                </div>

                <section className="mt-10 rounded-xl border border-zinc-800 bg-[#0f1115]/80 p-6 sm:p-8 shadow-sm backdrop-blur-md">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Bot Configurations</h2>
                        <p className="text-sm text-zinc-400 mt-1">Customize how the Discord bot displays your plays and profiles.</p>
                    </div>

                    {isLoadingSettings ? (
                        <div className="flex flex-col items-center justify-center h-[304px] gap-3">
                            <Loader2 className="size-6 animate-spin text-pink-400" />
                            <span className="text-sm text-zinc-500">Loading configurations...</span>
                        </div>
                    ) : settingsError && !settings ? (
                        <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-950 bg-red-950/20 p-4 text-sm text-red-200">
                            <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-400" />
                            <span>{settingsError}</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveSettings} className="mt-8 space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="mode" className="text-sm font-semibold text-zinc-300">
                                        Default Game Mode
                                    </label>
                                    <select
                                        id="mode"
                                        value={settings?.mode || "osu"}
                                        onChange={(e) => setSettings((prev) => (prev ? { ...prev, mode: e.target.value } : null))}
                                        className="h-10 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 px-3 outline-none focus:border-zinc-700"
                                    >
                                        <option value="osu">None / osu! Standard</option>
                                        <option value="mania">osu! Mania</option>
                                        <option value="taiko">osu! Taiko</option>
                                        <option value="fruits">osu! Catch the Beat (ctb)</option>
                                    </select>
                                    <p className="text-xs text-zinc-500">Specify default osu! mode. Defaults to osu.</p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="embed_type" className="text-sm font-semibold text-zinc-300">
                                        Embed Style
                                    </label>
                                    <select
                                        id="embed_type"
                                        value={settings?.embed_type || "hanami"}
                                        onChange={(e) => setSettings((prev) => (prev ? { ...prev, embed_type: e.target.value } : null))}
                                        className="h-10 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 px-3 outline-none focus:border-zinc-700"
                                    >
                                        <option value="hanami">Hanami (Default)</option>
                                        <option value="bathbot">Bathbot</option>
                                        <option value="owobot">owo</option>
                                    </select>
                                    <p className="text-xs text-zinc-500">Specify score embed style layout type.</p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="score_embeds" className="text-sm font-semibold text-zinc-300">
                                        Score Embeds Size
                                    </label>
                                    <select
                                        id="score_embeds"
                                        value={settings?.score_embeds !== undefined ? settings.score_embeds : 1}
                                        onChange={(e) => setSettings((prev) => (prev ? { ...prev, score_embeds: Number(e.target.value) } : null))}
                                        className="h-10 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 px-3 outline-none focus:border-zinc-700"
                                    >
                                        <option value={1}>Maximized</option>
                                        <option value={0}>Minimized</option>
                                    </select>
                                    <p className="text-xs text-zinc-500">Specify what size score embeds should be (compare, recent...).</p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="score_data" className="text-sm font-semibold text-zinc-300">
                                        Score Data Source
                                    </label>
                                    <select
                                        id="score_data"
                                        value={settings?.score_data !== undefined ? settings.score_data : 0}
                                        onChange={(e) => setSettings((prev) => (prev ? { ...prev, score_data: Number(e.target.value) } : null))}
                                        className="h-10 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 px-3 outline-none focus:border-zinc-700"
                                    >
                                        <option value={0}>Stable (old osu!)</option>
                                        <option value={1}>Lazer (new osu!lazer)</option>
                                    </select>
                                    <p className="text-xs text-zinc-500">Specify score data source. Stable: old osu!, Lazer: new osu!lazer.</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 border-t border-zinc-800/80 pt-6">
                                <Button
                                    type="submit"
                                    disabled={isSavingSettings}
                                    className="w-full sm:w-auto h-10 px-6 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-semibold transition-colors duration-150"
                                >
                                    {isSavingSettings && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    Save Configurations
                                </Button>

                                {settingsSuccess && <span className="text-sm text-emerald-400 font-medium animate-in text-center sm:text-left w-full sm:w-auto">✓ Settings updated successfully.</span>}
                                {settingsError && <span className="text-sm text-red-400 font-medium animate-in text-center sm:text-left w-full sm:w-auto">⚠ {settingsError}</span>}
                            </div>
                        </form>
                    )}
                </section>
            </main>

            <Footer />
        </PageShell>
    );
}

function ProfileConnector({ state }: { state: OsuState }) {
    const isLinked = state === "linked";
    return (
        <div className="flex items-center justify-center shrink-0 self-center z-10">
            {/* Desktop Connector */}
            <div className="hidden md:flex items-center justify-center relative w-16">
                <div className={cn("absolute left-1/2 top-1/2 h-0.5 w-16 -translate-x-1/2 -translate-y-1/2 -z-10 bg-gradient-to-r transition-all duration-500", 
                    isLinked ? "from-[#5865F2]/40 via-pink-500/50 to-pink-500/40" : "from-zinc-800 to-zinc-800"
                )} />
                <div className={cn("flex size-11 items-center justify-center rounded-full border bg-[#0d0e12] shadow-lg transition-all duration-500", 
                    isLinked ? "border-pink-500/40 shadow-pink-500/5 text-pink-400" : "border-zinc-800 text-zinc-500"
                )}>
                    <ArrowRight className="size-5" />
                </div>
            </div>

            {/* Mobile Connector */}
            <div className="flex md:hidden items-center justify-center relative h-16 my-[-12px]">
                <div className={cn("absolute left-1/2 top-1/2 w-0.5 h-16 -translate-x-1/2 -translate-y-1/2 -z-10 bg-gradient-to-b transition-all duration-500", 
                    isLinked ? "from-[#5865F2]/40 via-pink-500/50 to-pink-500/40" : "from-zinc-800 to-zinc-800"
                )} />
                <div className={cn("flex size-11 items-center justify-center rounded-full border bg-[#0d0e12] shadow-lg transition-all duration-500", 
                    isLinked ? "border-pink-500/40 shadow-pink-500/5 text-pink-400" : "border-zinc-800 text-zinc-500"
                )}>
                    <ArrowDown className="size-5" />
                </div>
            </div>
        </div>
    );
}

function IdentityPanel({ displayName, email, image, initial }: { displayName: string; email?: string | null; image?: string | null; initial: string }) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-[#0f1115]/80 p-6 sm:p-8 shadow-sm flex flex-col justify-between backdrop-blur-md">
            <div className="flex items-center gap-5">
                <Avatar image={image} initial={initial} ringColor="border-[#5865F2]/40" />
                <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5865F2]/10 px-3 py-1 text-xs font-semibold text-indigo-300 border border-[#5865F2]/10">Discord</span>
                    <h2 className="mt-2 truncate text-xl font-bold text-white tracking-tight sm:text-2xl">{displayName}</h2>
                    {email && <p className="text-sm text-zinc-500 truncate mt-1">{email}</p>}
                </div>
            </div>

            <div className="mt-8 space-y-4 border-t border-zinc-800/80 pt-6">
                <MetaLine icon={<Activity className="size-4 text-emerald-400" />} label="Status" value="Session Active" tone="green" />
                <MetaLine icon={<MessageCircle className="size-4 text-indigo-400" />} label="Auth Provider" value="Discord OAuth" />
                <MetaLine icon={<Fingerprint className="size-4 text-zinc-400" />} label="Token Scope" value="Identify, Guilds" />
            </div>
        </div>
    );
}

function OsuPanel({
    action,
    banchoId,
    username,
    avatarUrl,
    globalRank,
    state,
    onLink,
    onUnlink,
}: {
    action: "linking" | "unlinking" | null;
    banchoId?: string;
    username?: string;
    avatarUrl?: string;
    globalRank?: number | null;
    state: OsuState;
    onLink: () => void;
    onUnlink: () => void;
}) {
    const isChecking = state === "checking";
    const isLinked = state === "linked";

    return (
        <div
            className={cn(
                "rounded-xl border p-6 sm:p-8 shadow-sm flex flex-col justify-between transition-colors duration-150 backdrop-blur-md",
                isLinked ? "border-pink-500/25 bg-[#120e12]/85" : "border-zinc-800 bg-[#0f1115]/80",
            )}
        >
            <div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        {isChecking ? (
                            <div className="flex size-16 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800">
                                <Loader2 className="size-7 animate-spin text-pink-400" />
                            </div>
                        ) : isLinked ? (
                            <Avatar image={avatarUrl} initial="O" ringColor="border-pink-500/40" />
                        ) : (
                            <div className="flex size-16 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
                                <SiOsu className="size-8" />
                            </div>
                        )}
                        <div className="min-w-0">
                            {isChecking ? (
                                <div className="space-y-2 flex flex-col justify-center">
                                    <div className="h-5 w-24 bg-zinc-800 rounded animate-pulse" />
                                    <div className="h-7 w-36 bg-zinc-800 rounded animate-pulse" />
                                    <div className="h-4 w-28 bg-zinc-800/60 rounded animate-pulse" />
                                </div>
                            ) : isLinked ? (
                                <div className="space-y-2 flex flex-col justify-center">
                                    <div>
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/10 px-3 py-1 text-xs font-semibold text-pink-300 border border-pink-500/10">osu!</span>
                                    </div>
                                    <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl leading-none">
                                        <a
                                            href={`https://osu.ppy.sh/users/${banchoId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group inline-flex items-center gap-1.5 text-white hover:text-pink-400 transition-colors duration-150"
                                        >
                                            <span className="truncate group-hover:underline">{username || "Linked Account"}</span>
                                            <ExternalLink className="size-4 shrink-0 text-zinc-500 group-hover:text-pink-400 transition-colors duration-150" />
                                        </a>
                                    </h2>
                                    <p className="text-sm text-zinc-400 leading-none">
                                        Global Rank: <span className="font-semibold text-zinc-200">{globalRank !== null && globalRank !== undefined ? `#${globalRank.toLocaleString()}` : "Unranked"}</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 flex flex-col justify-center">
                                    <div>
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400 border border-zinc-700">osu! Bancho</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-white tracking-tight sm:text-2xl leading-none">Not Connected</h2>
                                    <div className="h-4" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 border-t border-zinc-800/80 pt-6">
                    {isChecking ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="size-4 rounded-full bg-zinc-800 animate-pulse" />
                                    <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                                </div>
                                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                            </div>
                            <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="size-4 rounded-full bg-zinc-800 animate-pulse" />
                                    <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                                </div>
                                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                            </div>
                        </div>
                    ) : isLinked ? (
                        <div className="space-y-4">
                            <MetaLine icon={<CheckCircle2 className="size-4 text-pink-400" />} label="Link Status" value="Connected" tone="pink" />
                            <MetaLine icon={<SiOsu className="size-4 text-zinc-400" />} label="Bancho ID" value={`#${banchoId || "unknown"}`} />
                        </div>
                    ) : (
                        <div className="h-[96px] flex items-center">
                            <p className="text-base leading-relaxed text-zinc-400">Connect your osu! account to authorize access and query commands directly.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8">
                {isChecking ? (
                    <Button disabled className="w-full h-10 rounded-lg bg-zinc-900 text-zinc-500 border border-zinc-800 text-sm">
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Checking status
                    </Button>
                ) : isLinked ? (
                    <Button
                        onClick={onUnlink}
                        disabled={action === "unlinking"}
                        variant="outline"
                        className="w-full h-10 rounded-lg border-red-900 bg-red-950/10 text-red-400 hover:bg-red-950/20 hover:text-red-300 text-sm font-medium transition-colors"
                    >
                        {action === "unlinking" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Unlink className="mr-2 size-4" />}
                        Disconnect osu! Account
                    </Button>
                ) : (
                    <Button onClick={onLink} disabled={action === "linking"} className="w-full h-10 rounded-lg bg-pink-500 hover:bg-pink-400 font-medium text-white shadow-sm text-sm transition-colors">
                        {action === "linking" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <SiOsu className="mr-2 size-4" />}
                        Connect osu! Account
                    </Button>
                )}
            </div>
        </div>
    );
}

function MetaLine({ icon, label, value, tone = "muted" }: { icon?: ReactNode; label: string; value: string; tone?: "green" | "pink" | "muted" }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-zinc-400">{label}</span>
            </div>
            <span className={cn("font-semibold", tone === "green" ? "text-emerald-400" : tone === "pink" ? "text-pink-400" : "text-zinc-300")}>{value}</span>
        </div>
    );
}

function Avatar({ image, initial, ringColor = "border-zinc-800" }: { image?: string | null; initial: string; ringColor?: string }) {
    if (image) {
        return <img src={image} alt="" className={cn("size-16 shrink-0 rounded-xl border bg-zinc-950 object-cover shadow-sm", ringColor)} />;
    }

    return <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border bg-zinc-900 text-xl font-bold text-white shadow-sm border-zinc-800">{initial}</div>;
}

function LoadingNote({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-[#0f1115] px-8 py-6 text-zinc-300 shadow-lg text-center max-w-xs backdrop-blur-md">
            <Loader2 className="size-7 animate-spin text-pink-500" />
            <div className="space-y-1">
                <p className="text-sm font-bold text-white">{children}</p>
                <p className="text-xs text-zinc-500">Checking credentials...</p>
            </div>
        </div>
    );
}

function PageShell({ centered = false, children }: { centered?: boolean; children: ReactNode }) {
    return (
        <div className="relative min-h-screen bg-[#050507] text-zinc-100 font-sans selection:bg-pink-500/20 selection:text-white">
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
                <img src="/background.webp" alt="" className="h-full w-full scale-105 object-cover opacity-80 blur-sm" />
            </div>
            <div className="pointer-events-none fixed inset-0 z-0 bg-black/72" />
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_18%,rgba(236,72,153,0.18),transparent_32%),linear-gradient(180deg,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.35)_45%,rgba(0,0,0,0.78)_100%)]" />

            <div className={centered ? "relative z-10 flex min-h-screen items-center justify-center p-4" : "relative z-10"}>{children}</div>
        </div>
    );
}
