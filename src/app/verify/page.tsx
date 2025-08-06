import VerifyButton from "@/components/VerifyButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, AlertCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SiOsu } from "react-icons/si";

interface VerifyPageProps {
    searchParams: { state?: string };
}

export default function VerifyPage({ searchParams }: VerifyPageProps) {
    const { state } = searchParams;
    const backgroundUrl = "https://yorunoken.s-ul.eu/hZnMlXzR";

    return (
        <div className="min-h-screen text-white relative">
            <div className="fixed inset-0 w-full h-full pointer-events-none">
                <Image src={backgroundUrl} alt="Floral Background" fill style={{ objectFit: "cover" }} priority sizes="100vw" quality={75} className="opacity-10" />
            </div>

            <main className="relative z-10 container mx-auto px-6 py-12 max-w-2xl">
                <div className="mb-8">
                    <Button variant="outline" className="mb-6" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>

                <Card className="bg-gray-900/30 border-gray-700">
                    <CardHeader className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="p-3 rounded-full bg-purple-500/20 border border-purple-500/30">
                                <Shield className="h-8 w-8 text-purple-400" />
                            </div>
                            <SiOsu className="h-10 w-10 text-pink-400" />
                        </div>
                        <CardTitle className="text-3xl font-bold">Account Verification</CardTitle>
                    </CardHeader>

                    <CardContent className="text-center space-y-6">
                        {state ? (
                            <>
                                <p className="text-lg text-gray-300">Link your Discord account to your osu! profile to access personalized features.</p>

                                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <p className="text-blue-300 text-sm">You&apos;ll be redirected to osu! to authorize the connection. This is completely safe and secure.</p>
                                </div>

                                <VerifyButton state={state} />

                                {process.env.NODE_ENV === "development" && <div className="mt-4 p-3 bg-gray-800/50 rounded text-xs text-gray-500">State: {state}</div>}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-center mb-4">
                                    <AlertCircle className="h-12 w-12 text-yellow-400" />
                                </div>

                                <h3 className="text-xl font-semibold text-yellow-400 mb-4">Missing State Parameter</h3>

                                <div className="space-y-4 text-left">
                                    <p className="text-gray-300">To verify your account, you need to use the verification link provided by the bot.</p>

                                    <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                                        <h4 className="font-semibold text-white mb-2">How to verify:</h4>
                                        <ol className="list-decimal list-inside space-y-1 text-gray-300 text-sm">
                                            <li>Go to your Discord server</li>
                                            <li>
                                                Use the <code className="bg-gray-700 px-1 py-0.5 rounded text-purple-300">/link</code> command
                                            </li>
                                            <li>Click the verification link provided by the bot</li>
                                        </ol>
                                    </div>
                                </div>

                                <Button className="bg-purple-600 hover:bg-purple-700" asChild>
                                    <Link href="/">Return to Home</Link>
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-8 text-center">
                    <Card className="bg-gray-900/20 border-gray-700/50">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-white mb-3">Why verify your account?</h3>
                            <div className="grid gap-3 text-sm text-gray-400">
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                                    <span>Personalized osu! statistics and performance tracking</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                                    <span>Quick access to your profile without typing your username</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
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
