import { SiOsu } from "react-icons/si";
import { useState } from "react";

export default function VerifyButton({ state }: { state?: string }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/auth?state=${state || ""}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
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
            className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 px-8 rounded-full flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[200px] shadow-none"
            onClick={handleClick}
            disabled={isLoading}
        >
            {isLoading ? (
                <span className="ml-2">Loading...</span>
            ) : (
                <>
                    Verify with osu!
                    <SiOsu className="ml-2 h-6 w-6 text-white" />
                </>
            )}
        </button>
    );
}
