import Link from "next/link";

export default function Footer() {
    return (
        <footer className="mt-auto border-t lg:container mx-auto p-4">
            <div className="flex flex-col items-center space-y-2 sm:space-y-0 sm:flex-row sm:justify-between">
                <p>
                    Hanami Bot is licensed under{" "}
                    <a href="http://www.apache.org/licenses" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:underline">
                        Apache License 2.0
                    </a>
                </p>
                <div className="flex flex-wrap justify-center sm:justify-end items-center gap-4 text-sm">
                    <Link href="https://yorunoken.com/support" className="hover:underline font-bold animate-color-change" target="_blank" prefetch={false}>
                        Support me!
                    </Link>
                    <Link href="https://yorunoken.com" className="hover:underline" target="_blank" prefetch={false}>
                        Contact
                    </Link>
                </div>
            </div>
        </footer>
    );
}
