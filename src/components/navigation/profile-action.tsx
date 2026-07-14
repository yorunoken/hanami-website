import { House, LogOut } from "lucide-react";

import { signOut, useSession } from "@/client/lib/auth";
import { routes } from "@/client/routes/paths";
import { PrefetchLink } from "./prefetch-link";
import { accountActionClass } from "./styles";

export default function ProfileAction() {
  const { data: session, isPending } = useSession();

  if (isPending || !session) {
    return (
      <PrefetchLink
        className={accountActionClass}
        to={routes.home}
        prefetch="none"
      >
        <House aria-hidden="true" />
        <span>Home</span>
      </PrefetchLink>
    );
  }

  return (
    <button
      type="button"
      className={`${accountActionClass} border-0 bg-transparent`}
      onClick={() =>
        signOut({
          fetchOptions: {
            onSuccess: () => {
              window.location.href = routes.home;
            },
          },
        })
      }
    >
      <LogOut aria-hidden="true" />
      <span>Log out</span>
    </button>
  );
}
