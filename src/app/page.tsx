"use client";

import PrivacyPolicy from "@/components/legal/privacy-policy";
import TermsOfService from "@/components/legal/tos";
import { Modal } from "@/components/modal";
import { motion } from "framer-motion";
import { ChevronsRight, FileText, Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";

export default function Component() {
    const [activeModal, setActiveModal] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const module_ = urlParams.get("module");
        if (module_ === "tos") {
            setActiveModal("tos");
        } else if (module_ === "privacy") {
            setActiveModal("privacy");
        }
    }, []);

    const background = "https://yorunoken.s-ul.eu/hZnMlXzR";
    return (
        <div className="min-h-screen text-purple-100">
            <div className="fixed inset-0 w-full h-full pointer-events-none opacity-20 blur-sm">
                <Image src={background} alt="Floral Background" fill style={{ objectFit: "cover" }} />
            </div>

            <main className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <section className="text-center mb-12 sm:mb-16">
                    <motion.h2 className="text-3xl sm:text-5xl font-bold mb-4" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        Welcome to Hanami
                    </motion.h2>
                    <motion.p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-400" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                        A specialized Discord bot for osu! written in TypeScript using the Bun runtime engine.
                    </motion.p>
                    <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <motion.button
                            className="bg-purple-600 hover:bg-purple-700 font-bold py-2 px-4 rounded-full flex items-center justify-center transition duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onTap={() => window.open("https://discord.com/oauth2/authorize?client_id=995999045157916763&permissions=265216&scope=bot", "_blank", "noopener noreferrer")}
                        >
                            Invite to Server <ChevronsRight className="ml-2 h-5 w-5" />
                        </motion.button>
                        <motion.button
                            className="bg-gray-700 hover:bg-gray-600 font-bold py-2 px-4 rounded-full flex items-center justify-center transition duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onTap={() => window.open("https://discord.gg/RcGjBZkDP6", "_blank", "noopener noreferrer")}
                        >
                            Support Server <MessageCircle className="ml-2 h-5 w-5" />
                        </motion.button>
                        <motion.button
                            className="bg-gray-800 hover:bg-gray-700 font-bold py-2 px-4 rounded-full flex items-center justify-center transition duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onTap={() => window.open("https://github.com/yorunoken/HanamiBot", "_blank", "noopener noreferrer")}
                        >
                            View on GitHub <FaGithub className="ml-2 h-5 w-5" />
                        </motion.button>
                    </div>
                </section>

                <section id="commands" className="mb-12 sm:mb-16">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">Commands</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {[
                            { name: "/osu", description: "Get a user's osu! profile" },
                            { name: "/recent", description: "Get a user's most recent osu! score" },
                            { name: "/top", description: "Get a user's osu! top plays" },
                        ].map((command, index) => (
                            <motion.div
                                key={command.name}
                                className="bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg hover:shadow-purple-500/20 transition duration-300"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <h4 className="text-lg sm:text-xl font-semibold mb-2 text-purple-400">{command.name}</h4>
                                <p className="text-sm sm:text-base text-gray-400">{command.description}</p>
                            </motion.div>
                        ))}
                    </div>
                    <p className="text-center mt-4 sm:mt-6 text-sm sm:text-base text-gray-400">
                        Use <code className="bg-gray-700 px-2 py-1 rounded text-purple-300">/help</code> in your guild for more information.
                    </p>
                </section>

                <section id="libraries" className="mb-12 sm:mb-16">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">Main Libraries</h3>
                    <motion.ul className="space-y-3 sm:space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                        {[
                            { name: "Lilybird", description: "To communicate with Discord's API" },
                            { name: "osu-web.js", description: "To communicate with osu! servers" },
                            { name: "rosu-pp's JavaScript bind", description: "To calculate pp, bpm values, and other values" },
                        ].map((library, index) => (
                            <motion.li
                                key={library.name}
                                className="flex items-start sm:items-center space-x-2"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <span className="text-purple-400 text-xl">•</span>
                                <div>
                                    <span className="font-semibold text-gray-200">{library.name}</span>
                                    <span className="block sm:inline sm:ml-1 text-sm sm:text-base text-gray-400">- {library.description}</span>
                                </div>
                            </motion.li>
                        ))}
                    </motion.ul>
                </section>

                <section className="text-center mb-12 sm:mb-16">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">Support</h3>
                    <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-400">I am eternally grateful for donations. It enables me to keep going and create more projects.</p>
                    <div className="flex flex-col sm:flex-row justify-center">
                        <motion.button
                            className="bg-purple-600 hover:bg-purple-700 font-bold py-2 px-4 rounded-full flex items-center justify-center transition duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onTap={() => window.open("https://yorunoken.com/support", "_blank", "noopener noreferrer")}
                        >
                            Support Me <Heart className="ml-2 h-5 w-5" />
                        </motion.button>
                    </div>
                </section>

                <section id="contributing" className="text-center mb-12 sm:mb-16">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4">Contributing</h3>
                    <p className="text-sm sm:text-base text-gray-400 mb-6">
                        We welcome contributions! Please read our{" "}
                        <a href="https://github.com/YoruNoKen/HanamiBot/blob/main/CONTRIBUTING.md" className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer">
                            CONTRIBUTING.md
                        </a>{" "}
                        file for more information.
                    </p>
                </section>

                <section id="legal" className="text-center mb-12 sm:mb-16">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Legal</h3>
                    <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <motion.button
                            className="bg-gray-700 hover:bg-gray-600 font-bold py-2 px-4 rounded-full flex items-center justify-center transition duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveModal("tos")}
                        >
                            Terms of Service <FileText className="ml-2 h-5 w-5" />
                        </motion.button>
                        <motion.button
                            className="bg-gray-700 hover:bg-gray-600 font-bold py-2 px-4 rounded-full flex items-center justify-center transition duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveModal("privacy")}
                        >
                            Privacy Policy <FileText className="ml-2 h-5 w-5" />
                        </motion.button>
                    </div>
                </section>
            </main>

            {activeModal === "tos" && <Modal title="Terms of Service" content={<TermsOfService />} onClose={() => setActiveModal(null)} />}
            {activeModal === "privacy" && <Modal title="Privacy Policy" content={<PrivacyPolicy />} onClose={() => setActiveModal(null)} />}
        </div>
    );
}
