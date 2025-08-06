"use client";

import { useRouter } from "next/navigation";
import { SiOsu } from "react-icons/si";
import { useState } from "react";

export default function VerifyButton({ state }: { state?: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleClick = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/auth?state=${state || ""}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.url) {
                router.push(data.url);
            } else {
                throw new Error("No URL returned from auth endpoint");
            }
        } catch (error) {
            console.error("Error initiating auth:", error);
            setIsLoading(false);
        }
    };

    return (
        <button
            className="bg-pink-500 hover:bg-pink-600 hover:shadow-lg font-bold py-2 px-4 rounded-md flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[200px] shadow-md"
            onClick={handleClick}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <span className="ml-2">Loading...</span>
                </>
            ) : (
                <>
                    Verify with osu!
                    <SiOsu className="ml-2 h-7 w-7" />
                </>
            )}
        </button>
    );
}
