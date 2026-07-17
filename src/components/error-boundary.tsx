import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
    };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return {
            hasError: true,
        };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("Unhandled React error", error, info);
    }

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <main className="grid min-h-screen place-items-center bg-bg px-6 text-text">
                <section className="max-w-xl text-center">
                    <p className="font-mono text-sm text-accent">Something went wrong</p>

                    <h1 className="mt-4 text-4xl font-bold tracking-tight">Hanami couldn’t load this page.</h1>

                    <p className="mt-4 leading-7 text-muted">Try reloading the page. If the problem continues, return to the homepage.</p>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <button
                            className="rounded-sm bg-accent px-5 py-3 font-semibold text-bg"
                            type="button"
                            onClick={() => window.location.reload()}
                        >
                            Reload page
                        </button>

                        <a className="rounded-sm border border-border-strong px-5 py-3 font-semibold text-white" href="/">
                            Go home
                        </a>
                    </div>
                </section>
            </main>
        );
    }
}
