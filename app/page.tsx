"use client";

import { Card } from "@components/Card";
import Image from "next/image";
import Coffee from "@public/coffe.png";
import { useEffect, useRef } from "react";
import Header from "@components/Header";

const scoreSharingDescription = [
    "This command is a great way of showing the most recent score you did with your friends.",
    "Use this to show everyone your best plays!",
    "This command is useful if you want to see your most recent best scores.",
];
const leaderboardDescription = ["Leader"];
const miscDescription = ["this is bg", "this is banner"];
const configurationDescription = ["this is config score mebeds", "this is config embed type"];
const helpDescription = ["this is help", "this is commands"];

let skipScrolling = false;
export const enableSkipping = () => (skipScrolling = true);
const disableSkipping = () => (skipScrolling = false);

export default function Home() {
    const mainRef = useRef<HTMLDivElement | null>(null);
    const commandsRef = useRef<HTMLDivElement | null>(null);
    const supportMeRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let prevScrollPos = window.scrollY;

        const handleScroll = () => {
            const currentScrollPos = window.scrollY;
            const scrollDirection = currentScrollPos > prevScrollPos ? "down" : "up";

            if (skipScrolling === false) {
                if (scrollDirection === "down") {
                    scrollDown(currentScrollPos);
                } else {
                    scrollUp(currentScrollPos);
                }
            }

            prevScrollPos = currentScrollPos;
        };

        const scrollDown = (scrollPosition: number) => {
            const mainOffsetTop = mainRef.current?.offsetTop ?? 0;
            const commandsOffsetTop = commandsRef.current?.offsetTop ?? 0;
            const supportMeOffsetTop = supportMeRef.current?.offsetTop ?? 0;

            if (scrollPosition > mainOffsetTop && scrollPosition < commandsOffsetTop) {
                commandsRef.current?.scrollIntoView({ behavior: "smooth" });
            } else if (scrollPosition > commandsOffsetTop && scrollPosition < supportMeOffsetTop) {
                supportMeRef.current?.scrollIntoView({ behavior: "smooth" });
            } else if (scrollPosition >= supportMeOffsetTop) {
                supportMeRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        };

        const scrollUp = (scrollPosition: number) => {
            const mainOffsetTop = mainRef.current?.offsetTop ?? 0;
            const commandsOffsetTop = commandsRef.current?.offsetTop ?? 0;
            const supportMeOffsetTop = supportMeRef.current?.offsetTop ?? 0;

            if (scrollPosition < supportMeOffsetTop && scrollPosition > commandsOffsetTop) {
                commandsRef.current?.scrollIntoView({ behavior: "smooth" });
            } else if (scrollPosition < commandsOffsetTop && scrollPosition > mainOffsetTop) {
                mainRef.current?.scrollIntoView({ behavior: "smooth" });
            } else if (scrollPosition <= mainOffsetTop) {
                mainRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        };

        window.addEventListener("scroll", handleScroll);
        window.addEventListener("scrollend", () => disableSkipping());
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            <Header />
            <main className="select-none flex flex-col items-center text-center justify-between px-8">
                <div id="main" className="flex flex-col text-center justify-center h-svh w-svw px-24" ref={mainRef}>
                    <p className="text-8xl font-extrabold">Hanami</p>
                    <p className="text-2xl italic">
                        An <span className="text-purple-500 font-bold">osu!</span> bot with <span className="text-purple-500 font-bold">everything</span> you want.
                    </p>

                    <div className="flex flex-row justify-center pt-4">
                        <a className="px-3" href="https://discord.com/oauth2/authorize?client_id=995999045157916763&permissions=265216&scope=bot" target="_blank" rel="noopener noreferrer">
                            <div className="bg-special-purple p-2 ring-2 ring-special-purple rounded-xl hover:cursor-pointer hover:ring-gray-100 transition-all">
                                <span className="text-white text-sm">Add to Discord</span>
                            </div>
                        </a>
                        <a className="px-3" href="https://discord.gg/RcGjBZkDP6" target="_blank" rel="noopener noreferrer">
                            <div className="bg-black bg-opacity-60 p-2 rounded-xl ring-2 ring-special-purple hover:cursor-pointer hover:ring-gray-100 transition-all">
                                <span className="text-white text-sm">Support Server</span>
                            </div>
                        </a>
                        <a className="px-3" href="https://github.com/YoruNoKen/HanamiBot" target="_blank" rel="noopener noreferrer">
                            <div className="bg-black bg-opacity-60 p-2 rounded-xl ring-2 ring-special-purple hover:cursor-pointer hover:ring-gray-100 transition-all">
                                <span className="text-white text-sm">GitHub Repository</span>
                            </div>
                        </a>
                    </div>
                    <span className="text-gray-500 text-opacity-60 italic mt-4 text-lg">Scroll to learn more..</span>
                </div>

                <div id="commands" className="flex flex-col text-center justify-center h-svh w-svw px-24" ref={commandsRef}>
                    <h1 className="text-3xl pb-4">Commands</h1>
                    <div className="grid grid-cols-1 gap-4 gap-x-8">
                        <Card title="Score Sharing" commands={["/recent", "/top", "/recentbest"]} descriptions={scoreSharingDescription} titleLeft={true}>
                            Share your scores with your friends and impress them! <br />
                            There are plenty commands to spread your scores!
                        </Card>
                        <Card title="Leaderboards" commands={["/leaderboard"]} descriptions={leaderboardDescription} titleLeft={false}>
                            Get any scores from any leaderboard! <br />
                            Also works for country leaderboards. (Turkiye only)
                        </Card>
                        <Card title="Misc" commands={["/background", "/banner"]} descriptions={miscDescription} titleLeft={true}>
                            Misc commands, also known as random commands. <br />
                            These commands include a variety of commands.
                        </Card>
                        <Card title="Help" commands={["/help", "/commands"]} descriptions={helpDescription} titleLeft={false}>
                            You can get more information on the bot by using help commands! <br />
                            They include info on how what commands are available, how to use them, and more!
                        </Card>
                        <Card title="Configurations" commands={["/config score_embeds", "/config embed_type"]} descriptions={configurationDescription} titleLeft={true}>
                            Many config commands, being able to choose what embed you want, <br />
                            Or selecting how big you want the embed to be, and more!
                        </Card>
                    </div>
                </div>

                <div id="support" className="flex flex-col text-center justify-center h-svh" ref={supportMeRef}>
                    <h1 className="text-3xl mb-4">Support me</h1>
                    <a href="https://www.buymeacoffee.com/yorunoken" target="_blank" rel="noopener noreferrer">
                        <div className="flex flex-row justify-center ring ring-special-purple hover:border-white rounded-lg p-4 px-32 transition-all">
                            <Image width={25} height={Coffee.height} src={Coffee} alt="coffee" />
                            <span>Buy me a coffee! ($0)</span>
                        </div>
                    </a>
                    <div className="flex flex-row justify-center ring ring-special-purple hover:border-white rounded-lg p-4 mt-4 transition-all">
                        <a>More coming soon..</a>
                    </div>
                </div>
            </main>
        </>
    );
}
