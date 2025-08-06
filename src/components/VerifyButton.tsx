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
            const data = await response.json();
            router.push(data.url);
        } catch (error) {
            console.error("Error initiating auth:", error);
            setIsLoading(false);
        }
    };
    return (
        <button className="bg-pink-500 hover:bg-pink-600 font-bold py-2 px-4 rounded-md flex items-center justify-center transition duration-300" onClick={handleClick} disabled={isLoading}>
            {isLoading ? "Loading..." : "Verify with osu!"}
            <SiOsu className="ml-2 h-7 w-7" />
        </button>
    );
}
