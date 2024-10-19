export default function PrivacyPolicy() {
    return (
        <div className="max-w-3xl mx-auto rounded-lg border-t border-b border-gray-300">
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p className="mb-4">Welcome to Hanami Bot. This privacy policy explains how we collect, use, and protect your personal information when you use our Discord bot.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
            <p className="mb-2">Hanami Bot collects and stores the following information:</p>
            <ul className="list-disc pl-6 mb-4">
                <li>Discord user IDs</li>
                <li>Server IDs</li>
                <li>Command usage statistics</li>
                <li>osu! user IDs (when linked by users)</li>
                <li>osu! user scores (when linked by users)</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="mb-2">We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 mb-4">
                <li>To provide and maintain bot functionality</li>
                <li>To improve user experience</li>
                <li>To track command usage and optimize performance</li>
                <li>To link Discord accounts with osu! accounts for related features</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Storage and Security</h2>
            <p className="mb-4">
                All data is stored securely in our database. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration,
                disclosure, or destruction.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Third-Party Services</h2>
            <p className="mb-4">
                Hanami Bot integrates with the osu! API. Please refer to the{" "}
                <a href="https://osu.ppy.sh/legal/en/Privacy" className="text-blue-600 hover:underline">
                    osu! Privacy Policy
                </a>{" "}
                for information on how they handle your data.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of your personal information</li>
                <li>Request deletion of your data from our systems</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Changes to This Policy</h2>
            <p className="mb-4">We may update this privacy policy from time to time. We will notify users of any significant changes through our support server.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact Us</h2>
            <p className="mb-4">If you have any questions about this privacy policy, please contact us through our support server or via Discord DM to the bot owner.</p>
        </div>
    );
}
