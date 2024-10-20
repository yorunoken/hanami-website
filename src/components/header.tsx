"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="relative z-20 lg:container mx-auto border-b p-4">
            <div className="container mx-auto flex justify-between items-center">
                <a href="/" className="text-2xl sm:text-4xl font-bold">
                    Hanami 🌸
                </a>
                <nav className="hidden sm:block">
                    <a href="#commands" className="text-gray-300 hover:text-white mx-2">
                        Commands
                    </a>
                    <a href="#libraries" className="text-gray-300 hover:text-white mx-2">
                        Libraries
                    </a>
                    <a href="#contributing" className="text-gray-300 hover:text-white mx-2">
                        Contributing
                    </a>
                </nav>
                <button className="sm:hidden ml-4" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <Menu className="h-6 w-6 text-gray-300" />
                </button>
            </div>
            {isMenuOpen && (
                <nav className="sm:hidden mt-4 flex flex-col space-y-2">
                    <a href="#commands" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>
                        Commands
                    </a>
                    <a href="#libraries" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>
                        Libraries
                    </a>
                    <a href="#contributing" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>
                        Contributing
                    </a>
                </nav>
            )}
        </header>
    );
}
