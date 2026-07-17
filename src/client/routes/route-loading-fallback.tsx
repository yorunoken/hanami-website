export default function RouteLoadingFallback() {
    return (
        <main className="grid min-h-screen place-items-center bg-bg px-6 text-muted" role="status" aria-label="Loading page">
            <span
                className="size-6 animate-[spin_900ms_linear_infinite] rounded-full border-2 border-border-strong border-t-accent motion-reduce:animate-none"
                aria-hidden="true"
            />
            <span className="sr-only">Loading page</span>
        </main>
    );
}
