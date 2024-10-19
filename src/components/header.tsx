export default function Header() {
    return (
        <header className="mt-auto lg:container mx-auto border-b p-4">
            <div className="container mx-auto flex justify-between items-center">
                <a href="/" className="text-4xl font-bold">
                    Hanami 🌸
                </a>
                <nav>
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
            </div>
        </header>
    );
}
