import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronsRight, FileText, Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FaGithub } from "react-icons/fa";
import { SiOsu } from "react-icons/si";

export default function HomePage() {
    const backgroundUrl = "https://yorunoken.s-ul.eu/hZnMlXzR";

    return (
        <div className="min-h-screen text-white relative">
            <div className="fixed inset-0 w-full h-full pointer-events-none">
                <Image src={backgroundUrl} alt="Floral Background" fill style={{ objectFit: "cover" }} priority sizes="100vw" quality={75} className="blur-xs" />
            </div>

            <div className="fixed inset-0 w-full h-full pointer-events-none bg-black opacity-70" />

            <main className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
                <section className="text-center mb-16">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <SiOsu className="h-10 w-10 text-pink-400" />
                        <h1 className="text-5xl font-bold text-white">Hanami Bot</h1>
                    </div>

                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">A Discord bot for osu! players. Get profiles, recent scores, and top plays directly in your server.</p>

                    <div className="flex flex-wrap justify-center gap-4">
                        <Link href="https://discord.com/oauth2/authorize?client_id=995999045157916763&permissions=265216&scope=bot" target="_blank" rel="noopener noreferrer">
                            <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                                <ChevronsRight className="mr-2 h-5 w-5" />
                                Add to Discord
                            </Button>
                        </Link>
                        <Link href="https://discord.gg/RcGjBZkDP6" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="lg">
                                <MessageCircle className="mr-2 h-5 w-5" />
                                Support Server
                            </Button>
                        </Link>
                        <Link href="https://github.com/yorunoken/HanamiBot" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="lg">
                                <FaGithub className="mr-2 h-5 w-5" />
                                GitHub
                            </Button>
                        </Link>
                    </div>
                </section>

                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-center mb-8">Commands</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { name: "/osu", description: "Get a user's osu! profile" },
                            { name: "/recent", description: "Get a user's most recent score" },
                            { name: "/top", description: "Get a user's top plays" },
                        ].map((command) => (
                            <Card key={command.name} className="bg-gray-900/50 border-gray-700 hover:bg-gray-900/70 hover:border-gray-600 transition-all duration-200 hover:shadow-lg">
                                <CardHeader>
                                    <CardTitle className="text-purple-400">{command.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-gray-300">{command.description}</CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <p className="text-center mt-6 text-gray-400">
                        Use <code className="bg-gray-800 px-2 py-1 rounded text-purple-300">/help</code> for more commands
                    </p>
                </section>

                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-center mb-8">Built With</h2>
                    <div className="space-y-4 max-w-2xl mx-auto">
                        {[
                            { name: "Lilybird", description: "Discord API integration" },
                            { name: "osu-api-extended", description: "osu! API wrapper" },
                            { name: "rosu-pp-js", description: "Performance point calculations" },
                        ].map((library) => (
                            <div key={library.name} className="flex items-center gap-4 p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                <div>
                                    <span className="font-medium text-white">{library.name}</span>
                                    <span className="text-gray-400 ml-2">— {library.description}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="text-center mb-16">
                    <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                        <Card className="bg-gray-900/30 border-gray-700 hover:bg-gray-900/50 hover:border-gray-600 transition-all duration-200 hover:shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-center gap-2 text-pink-400">
                                    <Heart className="h-5 w-5" />
                                    Support
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-300 mb-4">Help keep the bot running</p>
                                <Link href="https://yorunoken.com/support" target="_blank" rel="noopener noreferrer">
                                    <Button className="bg-pink-600 hover:bg-pink-700">Donate</Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-900/30 border-gray-700 hover:bg-gray-900/50 hover:border-gray-600 transition-all duration-200 hover:shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-center gap-2 text-blue-400">
                                    <FileText className="h-5 w-5" />
                                    Contributing
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-300 mb-4">Help improve the bot</p>
                                <Link href="https://github.com/yorunoken/HanamiBot/blob/main/TERMS.md" target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline">Guide</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section className="text-center">
                    <div className="flex justify-center gap-6 text-sm text-gray-400">
                        <Link href="https://github.com/yorunoken/HanamiBot/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="https://github.com/yorunoken/HanamiBot/blob/main/TERMS.md" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">
                            Terms of Service
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
