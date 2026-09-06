import { AccountLayout, AccountPage, AccountPageIntro, AccountPanel } from "@/components/account/account-shell";
import { ActionLink } from "@/components/marketing";

export default function NotFound() {
    return (
        <AccountPage>
            <AccountLayout className="grid min-h-155 place-items-center py-20">
                <AccountPanel className="w-[min(100%,700px)] p-[clamp(1.75rem,5vw,3.5rem)]">
                    <AccountPageIntro
                        className="mb-8"
                        eyebrow="Page not found"
                        title="This page does not exist."
                        description="Check the address or return to the homepage."
                    />
                    <ActionLink href="/">Return home</ActionLink>
                </AccountPanel>
            </AccountLayout>
        </AccountPage>
    );
}
