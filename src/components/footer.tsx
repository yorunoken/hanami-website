export default function Footer() {
    return (
        <footer className="relative z-20 mt-auto lg:container mx-auto border-t p-4 text-center">
            <div className="container mx-auto">
                <p className="text-sm sm:text-base text-gray-400">© {new Date().getFullYear()} Hanami Bot. All rights reserved.</p>
            </div>
        </footer>
    );
}
