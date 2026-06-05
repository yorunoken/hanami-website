import VerifyButton from "@/components/VerifyButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

export default function VerifyPage() {
    const [searchParams] = useSearchParams();
    const state = searchParams.get("state");
    const backgroundUrl = "https://yorunoken.s-ul.eu/hZnMlXzR";

    return (
        <div className="min-h-screen text-zinc-100 relative flex flex-col items-center justify-center">
            <div className="fixed inset-0 w-full h-full pointer-events-none -z-20">
                <img src={backgroundUrl} alt="Background" style={{ objectFit: "cover", width: "100%", height: "100%" }} className="blur-sm" />
            </div>
            <div className="fixed inset-0 w-full h-full pointer-events-none bg-black/80 -z-10" />

            <main className="relative z-10 w-full px-6 py-12 max-w-2xl">
                <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm shadow-none">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold">Account Verification</CardTitle>
                    </CardHeader>

                    <CardContent className="text-center space-y-6">
                        {state ? (
                            <>
                                <p className="text-lg text-zinc-300">Link your Discord account to your osu! profile to access personalized features.</p>

                                <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                                    <p className="text-zinc-300 text-sm">You&apos;ll be redirected to osu! to authorize the connection. This is completely safe and secure.</p>
                                </div>

                                <div className="flex justify-center mt-6">
                                    <VerifyButton state={state} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-center mb-4">
                                    <AlertCircle className="h-12 w-12 text-yellow-500" />
                                </div>

                                <h3 className="text-xl font-semibold text-yellow-500 mb-4">Missing State Parameter</h3>

                                <div className="space-y-4 text-left">
                                    <p className="text-zinc-300">To verify your account, you need to use the verification link provided by the bot.</p>

                                    <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                                        <h4 className="font-semibold text-white mb-2">How to verify:</h4>
                                        <ol className="list-decimal list-inside space-y-1 text-zinc-300 text-sm">
                                            <li>Go to your Discord server</li>
                                            <li>
                                                Use the <code className="bg-zinc-800 text-pink-400 px-1.5 py-0.5 rounded-md font-mono">/link</code> command
                                            </li>
                                            <li>Click the verification link provided by the bot</li>
                                        </ol>
                                    </div>
                                </div>

                                <Button className="bg-pink-600 hover:bg-pink-700 text-white rounded-full mt-4 shadow-none" asChild>
                                    <Link to="/">Return to Home</Link>
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-8 text-center">
                    <Card className="bg-zinc-900/40 border-zinc-800/50 backdrop-blur-sm shadow-none">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-white mb-3">Why verify your account?</h3>
                            <div className="grid gap-3 text-sm text-zinc-400">
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-pink-400 mt-2 flex-shrink-0"></div>
                                    <span>Personalized osu! statistics and performance tracking</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-pink-400 mt-2 flex-shrink-0"></div>
                                    <span>Quick access to your profile without typing your username</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-pink-400 mt-2 flex-shrink-0"></div>
                                    <span>Enhanced bot features and commands</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
