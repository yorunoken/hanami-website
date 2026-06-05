import { Button } from "@/components/ui/button";
import { ChevronsRight, FileText, Heart, MessageCircle, Code, Shield, Zap } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { SiOsu } from "react-icons/si";

export default function Home() {
    const backgroundUrl = "https://yorunoken.s-ul.eu/hZnMlXzR";

    return (
        <div className="min-h-screen text-zinc-100 relative">
            <div className="fixed inset-0 w-full h-full pointer-events-none -z-20">
                <img src={backgroundUrl} alt="Background" style={{ objectFit: "cover", width: "100%", height: "100%" }} className="blur-sm" />
            </div>
            <div className="fixed inset-0 w-full h-full pointer-events-none bg-black/80 -z-10" />

            <main className="relative container mx-auto px-6 pt-32 pb-16 max-w-5xl">
                <section className="text-center mb-32 flex flex-col items-center">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <SiOsu className="h-12 w-12 text-pink-400" />
                        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-white">Hanami</h1>
                    </div>

                    <p className="text-xl md:text-2xl text-zinc-400 mb-10 max-w-2xl font-light leading-relaxed">
                        Seamlessly link osu! profiles, track recent scores, and fetch top plays directly within Discord. Elegantly designed, lightning fast.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 w-full sm:w-auto">
                        <a href="https://discord.com/oauth2/authorize?client_id=995999045157916763&permissions=265216&scope=bot" target="_blank" rel="noopener noreferrer">
                            <Button size="lg" className="h-14 px-8 bg-pink-600 text-white hover:bg-pink-700 text-lg rounded-full font-medium border-none shadow-none">
                                <ChevronsRight className="mr-2 h-5 w-5" />
                                Add to Discord
                            </Button>
                        </a>
                        <a href="https://discord.gg/RcGjBZkDP6" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="lg" className="h-14 px-8 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-zinc-100 text-zinc-300 text-lg rounded-full shadow-none">
                                <MessageCircle className="mr-2 h-5 w-5" />
                                Community
                            </Button>
                        </a>
                    </div>
                </section>

                <section id="commands" className="mb-32">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold tracking-tight mb-4">Core Commands</h2>
                        <p className="text-zinc-400">Everything you need to showcase your osu! skills.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { name: "/osu", description: "Display an elegant overview of a user's osu! profile." },
                            { name: "/recent", description: "Fetch the most recent play with detailed performance metrics." },
                            { name: "/top", description: "List the highest PP plays for any registered user." },
                        ].map((command) => (
                            <div key={command.name} className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="text-xl font-semibold text-zinc-100 mb-2">{command.name}</h3>
                                    <p className="text-zinc-400 leading-relaxed">{command.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-8">
                        <span className="inline-flex items-center gap-2 text-sm text-zinc-500 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
                            <Code className="h-4 w-4" /> Use <span className="text-pink-300 font-mono">/help</span> to discover more features
                        </span>
                    </div>
                </section>

                <section id="open-source" className="mb-32 grid md:grid-cols-2 gap-8">
                    <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800">
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <FaGithub className="h-6 w-6" /> Open Source
                        </h3>
                        <p className="text-zinc-400 mb-8 leading-relaxed">Hanami is proudly open source. You can host it yourself, contribute new features, or inspect the code to ensure your data is handled safely.</p>
                        <div className="flex gap-4">
                            <a href="https://github.com/hanami-osu/bot" target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary" className="rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700">
                                    View Repository
                                </Button>
                            </a>
                            <a href="https://github.com/hanami-osu/bot/blob/main/TERMS.md" target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" className="rounded-full text-zinc-400 hover:text-zinc-200">
                                    Read Guide
                                </Button>
                            </a>
                        </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-center">
                        <h3 className="text-lg font-medium text-zinc-300 mb-6 uppercase tracking-wider text-sm">Powered By</h3>
                        <div className="space-y-4">
                            {[
                                { name: "Lilybird", desc: "Discord API", url: "https://lilybird.dev/" },
                                { name: "osu-api-extended", desc: "osu! API v2", url: "https://www.npmjs.com/package/osu-api-extended" },
                                { name: "rosu-pp-js", desc: "PP Calculation", url: "https://www.npmjs.com/package/rosu-pp-js" },
                            ].map((lib) => (
                                <a
                                    key={lib.name}
                                    href={lib.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between group block hover:bg-zinc-800/50 p-2 -mx-2 rounded-lg transition-colors"
                                >
                                    <span className="text-zinc-200 font-medium group-hover:text-pink-400 transition-colors">{lib.name}</span>
                                    <span className="text-zinc-500 text-sm">{lib.desc}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Support / Sponsor */}
                <section id="support" className="mb-32">
                    <div className="p-10 rounded-3xl bg-zinc-900/80 border border-pink-500/20 flex flex-col items-center text-center backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />

                        <div className="bg-pink-500/10 p-4 rounded-full mb-6">
                            <Heart className="h-8 w-8 text-pink-500" />
                        </div>

                        <h3 className="text-2xl font-bold mb-4 text-zinc-100">Support the Project</h3>
                        <p className="text-zinc-400 mb-8 max-w-lg leading-relaxed">
                            Hanami is completely free and open-source, but running the servers isn't. If you love the bot, consider sponsoring the project to help keep the lights on!
                        </p>

                        <a href="https://yorunoken.com/support" target="_blank" rel="noopener noreferrer">
                            <Button className="h-14 px-8 bg-pink-600 hover:bg-pink-700 text-white rounded-full font-medium text-lg shadow-none">
                                <Heart className="mr-2 h-5 w-5 fill-current" />
                                Sponsor Hanami
                            </Button>
                        </a>
                    </div>
                </section>

                <footer className="border-t border-zinc-800 pt-12 pb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <SiOsu className="h-5 w-5 text-zinc-600" />
                        <span className="text-zinc-500 font-medium text-sm">Hanami &copy; {new Date().getFullYear()}</span>
                    </div>

                    <div className="flex gap-6 text-sm font-medium">
                        <a href="https://yorunoken.com#support" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-pink-400 transition-colors flex items-center gap-1.5">
                            <Heart className="h-4 w-4" /> Donate
                        </a>
                        <a href="https://github.com/hanami-osu/bot/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-200 transition-colors">
                            Privacy
                        </a>
                        <a href="https://github.com/hanami-osu/bot/blob/main/TERMS.md" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-200 transition-colors">
                            Terms
                        </a>
                    </div>
                </footer>
            </main>
        </div>
    );
}
