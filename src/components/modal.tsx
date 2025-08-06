"use client";
import { useEffect, useRef } from "react";

export function Modal({ title, content, onClose }: { title: string; content: React.ReactElement; onClose: () => void }) {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        previousActiveElement.current = document.activeElement as HTMLElement;

        if (modalRef.current) {
            modalRef.current.focus();
        }

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        const handleTab = (event: KeyboardEvent) => {
            if (event.key === "Tab" && modalRef.current) {
                const focusableElements = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement?.focus();
                        event.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement?.focus();
                        event.preventDefault();
                    }
                }
            }
        };

        document.addEventListener("keydown", handleEsc);
        document.addEventListener("keydown", handleTab);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.removeEventListener("keydown", handleTab);
            document.body.style.overflow = "unset";

            if (previousActiveElement.current) {
                previousActiveElement.current.focus();
            }
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div ref={modalRef} className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} tabIndex={-1}>
                <h2 id="modal-title" className="text-2xl font-bold mb-4">
                    {title}
                </h2>
                <div className="prose prose-invert">{content}</div>
                <button onClick={onClose} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors" autoFocus>
                    Close
                </button>
            </div>
        </div>
    );
}
