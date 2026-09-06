import { Link } from "react-router-dom";

import { routes } from "@/client/routes/paths";
import { AuthLayout, AuthPanel } from "@/components/account/account-shell";
import { Eyebrow } from "@/components/marketing";
import { primaryActionClass } from "@/components/ui/action-styles";

export default function LinkErrorPage() {
    return (
        <AuthLayout>
            <AuthPanel className="animate-[reveal-up_380ms_ease-out_both]">
                <Eyebrow>Link expired</Eyebrow>
                <h1>Get a new link from Hanami Bot.</h1>
                <p>
                    This one-time link expired or was already used. Return to Discord and run <code>/link</code> again.
                </p>
                <Link className={`${primaryActionClass} mt-8 w-fit`} to={routes.home}>
                    Return to Hanami
                </Link>
            </AuthPanel>
        </AuthLayout>
    );
}
