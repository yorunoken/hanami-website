import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, Github, Heart, MessageCircle, ShieldCheck, Terminal, Trophy, UserRound, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";

import { signIn, useSession } from "../lib/auth";

const commands = [
    {
        icon: UserRound,
        name: "/osu",
        title: "Profile cards",
        description: "Show rank, accuracy, play count, country, and linked account details.",
    },
    {
        icon: Zap,
        name: "/recent",
        title: "Recent scores",
        description: "Fetch the latest play with mods, combo, hit results, and performance info.",
    },
    {
        icon: Trophy,
        name: "/top",
        title: "Top plays",
        description: "Pull best scores for linked users or any osu! username in the server.",
    },
];

const libraries = [
    { name: "Lilybird", detail: "Discord API", url: "https://lilybird.dev/" },
    { name: "osu-api-extended", detail: "osu! API v2", url: "https://www.npmjs.com/package/osu-api-extended" },
    { name: "rosu-pp-js", detail: "PP calculation", url: "https://www.npmjs.com/package/rosu-pp-js" },
];

export default function Home() {
    const { data: session, isPending } = useSession();

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#050507] text-zinc-100">
            <Background />

            <Header />

            <main className="relative z-10 pt-16">
                <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center px-5 py-16">
                    <div className="grid items-center gap-10 lg:grid-cols-[1fr_420px]">
                        <div>
                            <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-normal text-white sm:text-7xl">Hanami</h1>
                            <p className="mt-5 max-w-2xl text-xl leading-8 text-zinc-300">Link your osu! profile once, then call recent scores, top plays, and profile cards straight from Discord.</p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Button asChild size="lg" className="h-12 rounded-lg bg-pink-500 px-5 text-white shadow-lg shadow-pink-950/30 hover:bg-pink-400">
                                    <a href="https://discord.com/oauth2/authorize?client_id=995999045157916763&permissions=265216&scope=bot" target="_blank" rel="noopener noreferrer">
                                        Add to Discord
                                        <ArrowRight className="size-4" />
                                    </a>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="h-12 rounded-lg border-white/15 bg-black/25 px-5 text-zinc-100 backdrop-blur-md hover:bg-white/10 hover:text-white">
                                    <a href="https://discord.gg/RcGjBZkDP6" target="_blank" rel="noopener noreferrer">
                                        <MessageCircle className="size-4" />
                                        Join Community
                                    </a>
                                </Button>
                                {!isPending && !session && (
                                    <Button
                                        onClick={() => signIn.social({ provider: "discord", callbackURL: "/profile" })}
                                        size="lg"
                                        variant="ghost"
                                        className="h-12 rounded-lg text-zinc-300 hover:bg-white/8 hover:text-white"
                                    >
                                        <ShieldCheck className="size-4" />
                                        Link account
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="relative flex items-center justify-center p-6 lg:p-10 animate-float select-none">
                            <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-pink-500/15 via-purple-600/10 to-cyan-500/15 blur-3xl opacity-70" />

                            <div className="relative z-10 flex items-center justify-center">
                                <img src="hanami-transparent.png" alt="Hanami Logo" className="max-h-[280px] rounded-lg w-auto object-contain filter  drop-shadow-[0_0_20px_rgba(236,72,153,0.2)]" />
                            </div>
                        </div>
                    </div>
                </section>

                <section id="commands" className="border-y border-white/8 bg-black/38 backdrop-blur-md">
                    <div className="mx-auto max-w-5xl px-5 py-16">
                        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-pink-200">Core commands</p>
                                <h2 className="mt-2 text-3xl font-bold text-white">The stuff people actually type.</h2>
                            </div>
                            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-3 py-2 text-sm text-zinc-400">
                                <Terminal className="size-4" />
                                Use <code className="text-pink-200">/help</code> for the full list
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {commands.map((command) => {
                                const Icon = command.icon;

                                return (
                                    <article key={command.name} className="rounded-lg border border-white/10 bg-zinc-950/55 p-5 shadow-lg shadow-black/25 backdrop-blur-sm">
                                        <div className="mb-5 flex items-center justify-between gap-4">
                                            <span className="flex size-10 items-center justify-center rounded-lg bg-pink-400/12 text-pink-200">
                                                <Icon className="size-5" />
                                            </span>
                                            <code className="rounded-lg bg-black/45 px-3 py-1.5 text-sm font-semibold text-pink-100">{command.name}</code>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white">{command.title}</h3>
                                        <p className="mt-2 leading-7 text-zinc-400">{command.description}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section id="source" className="mx-auto grid max-w-5xl gap-6 px-5 py-16 md:grid-cols-[1fr_1fr]">
                    <div className="rounded-lg border border-white/10 bg-black/36 p-6 backdrop-blur-md">
                        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
                            <Github className="size-6" />
                            Open source
                        </h2>
                        <p className="mt-4 leading-8 text-zinc-400">Hanami is public, self-hostable, and inspectable. No mystery box around the Discord and osu! account bridge.</p>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <Button asChild className="h-11 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200">
                                <a href="https://github.com/hanami-osu/bot" target="_blank" rel="noopener noreferrer">
                                    <Github className="size-4" />
                                    Repository
                                </a>
                            </Button>
                            <Button asChild variant="ghost" className="h-11 rounded-lg text-zinc-300 hover:bg-white/8 hover:text-white">
                                <a href="https://github.com/hanami-osu/bot/blob/main/TERMS.md" target="_blank" rel="noopener noreferrer">
                                    <Code2 className="size-4" />
                                    Terms
                                </a>
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/36 p-6 backdrop-blur-md">
                        <h2 className="text-2xl font-bold text-white">Powered by</h2>
                        <div className="mt-5 space-y-2">
                            {libraries.map((library) => (
                                <a
                                    key={library.name}
                                    href={library.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8"
                                >
                                    <span className="font-medium text-zinc-100">{library.name}</span>
                                    <span className="text-zinc-500">{library.detail}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="support" className="border-t border-white/8 bg-black/42 backdrop-blur-md">
                    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Support the project</h2>
                            <p className="mt-2 text-zinc-400">Hanami is free to use. Sponsorship helps with hosting and maintenance.</p>
                        </div>
                        <Button asChild className="h-11 rounded-lg bg-pink-500 text-white hover:bg-pink-400">
                            <a href="https://yorunoken.com#support" target="_blank" rel="noopener noreferrer">
                                <Heart className="size-4" />
                                Sponsor Hanami
                            </a>
                        </Button>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}

function Background() {
    return (
        <>
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
                <img src="/background.webp" alt="" className="h-full w-full scale-105 object-cover opacity-80 blur-sm" />
            </div>
            <div className="pointer-events-none fixed inset-0 z-0 bg-black/72" />
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_18%,rgba(236,72,153,0.18),transparent_32%),linear-gradient(180deg,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.35)_45%,rgba(0,0,0,0.78)_100%)]" />
        </>
    );
}

function CommandLine({ command, response }: { command: string; response: string }) {
    return (
        <div className="rounded-lg border border-white/8 bg-black/36 p-3">
            <code className="text-sm font-semibold text-pink-100">{command}</code>
            <p className="mt-1 text-sm text-zinc-500">{response}</p>
        </div>
    );
}
