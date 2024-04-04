"use client";

import { Card } from "@components/Card";
import Header from "../components/Header";

export default function Home() {
    return (
        <>
            <Header />
            <main className="flex flex-col items-center text-center justify-between px-8 py-20">
                <div className="text-center pb-10 px-4 2xl:px-96 xl:px-64 lg:px-32">
                    <p className="text-2xl">
                        <span className="text-purple-500 font-bold">osu!</span> bot with <span className="text-purple-500 font-bold">everything</span> you want.
                    </p>
                    <p className="text-lg">
                        Hanami is a simple osu! bot full with features: <br />
                        Score sharing, replay rendering, osu!capital integration, minigames, lots of configuration and more!
                    </p>
                </div>

                <div className="flex flex-row pb-10">
                    <a className="px-3" href="https://discord.com/oauth2/authorize?client_id=995999045157916763&permissions=265216&scope=bot" target="_blank" rel="noopener noreferrer">
                        <div className="bg-blue-600 bg-opacity-70 p-4 ring-2 ring-blue-500 rounded-xl hover:cursor-pointer hover:bg-opacity-80 hover:ring-gray-100 transition-all">
                            <span className="text-white">Add to Discord</span>
                        </div>
                    </a>
                    <a className="px-6" href="https://discord.gg/RcGjBZkDP6" target="_blank" rel="noopener noreferrer">
                        <div className="bg-blue-500 bg-opacity-10 p-4 rounded-xl ring-2 ring-blue-500 hover:cursor-pointer hover:bg-opacity-15 hover:ring-gray-100 transition-all">
                            <span className="text-white">Support server</span>
                        </div>
                    </a>
                </div>

                <div className="pb-10">
                    <h1 className="text-3xl">Features</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 gap-x-8 lg:gap-x-32 pt-4 pb-10">
                        <Card title="Score Sharing" commands={["/recent", "/top", "/recentbest"]}>
                            Share your scores with your friends and impress them! <br />
                            There are plenty commands to spread your scores!
                        </Card>
                        <Card title="Leaderboards" commands={["/leaderboard"]}>
                            Get any scores from any leaderboard! <br />
                            Also works for country leaderboards. (Turkiye only)
                        </Card>
                        <Card title="Misc" commands={["/background", "/banner"]}>
                            Misc commands, also known as random commands. <br />
                            These commands include a variety of features.
                        </Card>
                        <Card title="Scren Sharing" commands={["/config score_embeds", "/config embed_type"]}>
                            Many config commands, being able to choose what embed you want, <br />
                            Or selecting how big you want the embed to be, and more!
                        </Card>
                    </div>
                </div>

                <div id="support-me" className="pb-10">
                    <h1 className="text-3xl">Support me</h1>
                    <p>blah blah</p>
                </div>
            </main>
        </>
    );
}
