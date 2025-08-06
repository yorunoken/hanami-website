"use client";

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-900">
                    <div className="text-center p-8">
                        <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
                        <p className="text-gray-400 mb-6">We encountered an unexpected error. Please try refreshing the page.</p>
                        <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors" onClick={() => window.location.reload()}>
                            Refresh Page
                        </button>
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="cursor-pointer text-gray-400">Error Details</summary>
                                <pre className="mt-2 text-xs text-red-300 bg-gray-800 p-4 rounded overflow-auto">{this.state.error.stack}</pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
