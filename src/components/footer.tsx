export default function Footer() {
    return (
        <footer className="relative z-10 border-t border-white/8 bg-black/50 mt-auto">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Hanami &copy; {new Date().getFullYear()}</span>
                <div className="flex gap-5 justify-center sm:justify-start">
                    <a href="https://github.com/hanami-osu/bot/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-200">
                        Privacy
                    </a>
                    <a href="https://github.com/hanami-osu/bot/blob/main/TERMS.md" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-200">
                        Terms
                    </a>
                    <a href="https://discord.gg/RcGjBZkDP6" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-200">
                        Discord
                    </a>
                </div>
            </div>
        </footer>
    );
}
