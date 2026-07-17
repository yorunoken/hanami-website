import { Link } from "react-router-dom";

import { routes } from "@/client/routes/paths";
import { AuthLayout, AuthPanel } from "@/components/account/account-shell";
import { Eyebrow } from "@/components/marketing";
import { primaryActionClass } from "@/components/ui/action-styles";

export default function LinkErrorPage() {
    return (
        <AuthLayout>
            <AuthPanel className="animate-[reveal-up_380ms_ease-out_both]">
                <Eyebrow>Hanami Bot</Eyebrow>
                <h1>This link is no longer available.</h1>
                <p>
                    The link expired or was already used. Return to Discord and run <code>/link</code> again to create a fresh one.
                </p>
                <Link className={`${primaryActionClass} mt-8 w-fit`} to={routes.home}>
                    Return to Hanami
                </Link>
            </AuthPanel>
        </AuthLayout>
    );
}
