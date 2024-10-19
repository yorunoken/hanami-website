export default function TermsOfService() {
    return (
        <div className="max-w-3xl mx-auto rounded-lg border-t border-b border-gray-300">
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">By using Hanami Bot, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not use our bot.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
            <p className="mb-4">
                Hanami Bot is a Discord bot designed to provide osu!-related functionalities and general utility features. We reserve the right to modify or discontinue, temporarily or permanently, the service
                with or without notice.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Conduct</h2>
            <p className="mb-2">You agree not to use Hanami Bot to:</p>
            <ul className="list-disc pl-6 mb-4">
                <li>Violate any laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Spam or flood Discord channels</li>
                <li>Attempt to gain unauthorized access to the bot or its related systems</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Intellectual Property</h2>
            <p className="mb-4">
                The bot, its original content, features, and functionality are owned by Hanami Bot and are protected by international copyright, trademark, patent, trade secret, and other intellectual property
                laws.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Limitation of Liability</h2>
            <p className="mb-4">
                In no event shall Hanami Bot, nor its developers, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use,
                goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the bot.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Termination</h2>
            <p className="mb-4">
                We may terminate or suspend your access to the bot immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. All provisions
                of the Terms which by their nature should survive termination shall survive termination.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Changes to Terms</h2>
            <p className="mb-4">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any significant changes through Discord or our support server.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Third-Party Services</h2>
            <p className="mb-4">Hanami Bot integrates with third-party services, including the osu! API. Your use of these services may be subject to their respective terms of service and policies.</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Disclaimer</h2>
            <p className="mb-4">
                Hanami Bot is provided {'"'}as is{'"'} without any warranties, expressed or implied. We do not warrant that the bot will be error-free or uninterrupted.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">10. License</h2>
            <p className="mb-4">
                HanamiBot is open-source software licensed under the Apache License, Version 2.0 (the {'"'}License{'"'}). You may obtain a copy of the License at:
            </p>
            <p className="mb-4">
                <a href="http://www.apache.org/licenses/LICENSE-2.0" className="text-blue-600 hover:underline">
                    http://www.apache.org/licenses/LICENSE-2.0
                </a>
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact</h2>
            <p className="mb-4">If you have any questions about these Terms or the license, please contact us through our support server or via Discord DM to the bot owner.</p>
        </div>
    );
}
