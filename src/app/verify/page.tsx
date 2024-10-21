import VerifyButton from "@/components/VerifyButton";
import Image from "next/image";

interface VerifyPageProps {
    searchParams: { state?: string };
}

export default function VerifyPage({ searchParams }: VerifyPageProps) {
    const { state } = searchParams;
    const backgroundUrl = "https://yorunoken.s-ul.eu/hZnMlXzR";

    return (
        <div className="text-purple-100 flex justify-center mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="fixed inset-0 w-full h-full pointer-events-none opacity-15 blur-sm">
                <Image src={backgroundUrl} alt="Floral Background" fill style={{ objectFit: "cover" }} />
            </div>

            <div className="relative z-10 bg-black bg-opacity-30 rounded-2xl p-8 sm:p-12 max-w-2xl">
                <section className="text-center flex flex-col items-center">
                    <h2 className="text-3xl sm:text-5xl font-bold mb-4">Verification</h2>
                    {state ? (
                        <>
                            <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-400">Click the button below to link your Discord account to your osu! account</p>
                            <VerifyButton state={state} />
                            {state && <p className="mt-4 text-sm text-gray-500">State: {state}</p>}
                        </>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-lg sm:text-xl text-gray-400">You need to provide a state parameter to verify your account</p>
                            <p className="text-lg sm:text-xl text-gray-400">
                                In other words, you must use the <code className="bg-gray-700 px-2 py-1 rounded text-purple-300">/link</code> command in your Discord server and get redirected here with the
                                correct parameters.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
