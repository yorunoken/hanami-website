import { Check, ExternalLink, Loader2, Unlink } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { routes } from "@/client/routes/paths";
import { DiscordLogo, OsuLogo } from "@/components/icons/provider-icons";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import {
    compactActionClass,
    formMessageClass,
    loadingInlineClass,
    primaryActionClass,
    secondaryActionClass,
    textButtonClass,
} from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";

import { sectionHeadingClass } from "./account-shell";

const identityBlockClass =
    "flex min-h-44 flex-col border-b border-border p-[clamp(1.35rem,3vw,2rem)] min-[821px]:border-r last:min-[821px]:border-r-0";
const identityPersonClass =
    "flex items-center gap-[1.1rem] [&_h3]:text-xl [&_h3_a]:inline-flex [&_h3_a]:items-center [&_h3_a]:gap-[0.45rem] [&_h3_a]:no-underline [&_h3_svg]:size-3.75 [&_p]:mb-[0.3rem] [&_p]:font-mono [&_p]:text-[0.68rem] [&_p]:text-quiet [&_p]:uppercase [&_span:not(.account-avatar):not(.osu-mark)]:mt-1 [&_span:not(.account-avatar):not(.osu-mark)]:block [&_span:not(.account-avatar):not(.osu-mark)]:text-[0.78rem] [&_span:not(.account-avatar):not(.osu-mark)]:text-muted";
const identityActionClass = "mt-auto pt-8";

export interface LoginMethod {
    provider: "discord" | "osu";
    providerUserId: string;
    displayName?: string | null;
    avatarUrl?: string | null;
}

export interface BotSettings {
    mode: "osu" | "mania" | "taiko" | "fruits";
    score_embeds: 0 | 1;
    embed_type: "hanami" | "bathbot" | "owobot";
    score_data: 0 | 1;
}

export const defaultSettings: BotSettings = {
    mode: "osu",
    score_embeds: 1,
    embed_type: "hanami",
    score_data: 0,
};

export type ProfileAction = "linking" | "unlinking" | "saving" | null;

interface IdentitySectionProps {
    currentUser: { name: string; image?: string | null };
    loginMethods: LoginMethod[];
    loading: boolean;
    action: ProfileAction;
    onLink: (provider: "discord" | "osu") => void;
    onUnlink: (provider: "discord" | "osu") => void;
}

export function IdentitySection({ currentUser, loginMethods, loading, action, onLink, onUnlink }: IdentitySectionProps) {
    const linked = new Set(loginMethods.map((method) => method.provider));
    const osuMethod = loginMethods.find((method) => method.provider === "osu");
    return (
        <section className="mt-10" aria-labelledby="identity-title">
            <div className={sectionHeadingClass}>
                <h2 id="identity-title">Identity</h2>
            </div>

            <div className="grid grid-cols-1 min-[821px]:grid-cols-2">
                <article className={identityBlockClass}>
                    <div className={identityPersonClass}>
                        {linked.has("discord") ? (
                            <Avatar src={currentUser.image} name={currentUser.name} />
                        ) : (
                            <ProviderMark>
                                <DiscordLogo className="size-7" aria-hidden="true" />
                            </ProviderMark>
                        )}
                        <div>
                            <p>Discord identity</p>
                            <h3>{linked.has("discord") ? currentUser.name : "Not connected"}</h3>
                        </div>
                    </div>
                    {linked.has("discord") ? (
                        loginMethods.length > 1 && (
                            <div className={identityActionClass}>
                                <button
                                    className={cn(textButtonClass, "text-danger")}
                                    type="button"
                                    onClick={() => onUnlink("discord")}
                                    disabled={action === "unlinking"}
                                >
                                    <Unlink aria-hidden="true" />
                                    {action === "unlinking" ? "Disconnecting…" : "Disconnect Discord"}
                                </button>
                            </div>
                        )
                    ) : (
                        <div className={identityActionClass}>
                            <button
                                className={cn(primaryActionClass, compactActionClass)}
                                type="button"
                                onClick={() => onLink("discord")}
                                disabled={action === "linking"}
                            >
                                <DiscordLogo aria-hidden="true" />
                                {action === "linking" ? "Opening Discord…" : "Connect Discord"}
                            </button>
                        </div>
                    )}
                </article>

                <article className={identityBlockClass}>
                    {loading ? (
                        <LoadingInline label="Checking linked identities" />
                    ) : linked.has("osu") ? (
                        <>
                            <div className={identityPersonClass}>
                                <Avatar src={osuMethod?.avatarUrl} name={osuMethod?.displayName || "osu! player"} />
                                <div>
                                    <p>osu! identity</p>
                                    <h3>
                                        <a href={`https://osu.ppy.sh/users/${osuMethod?.providerUserId}`} target="_blank" rel="noreferrer">
                                            {osuMethod?.displayName || "Linked player"}
                                            <ExternalLink aria-hidden="true" />
                                        </a>
                                    </h3>
                                </div>
                            </div>
                            {loginMethods.length > 1 && (
                                <div className={identityActionClass}>
                                    <button
                                        className={cn(textButtonClass, "text-danger")}
                                        type="button"
                                        onClick={() => onUnlink("osu")}
                                        disabled={action === "unlinking"}
                                    >
                                        <Unlink aria-hidden="true" />
                                        {action === "unlinking" ? "Disconnecting…" : "Disconnect osu!"}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className={identityPersonClass}>
                                <ProviderMark className="text-accent-soft">
                                    <OsuLogo className="size-8" aria-hidden="true" />
                                </ProviderMark>
                                <div>
                                    <p>osu! identity</p>
                                    <h3>Not connected</h3>
                                </div>
                            </div>
                            <div className={identityActionClass}>
                                <button
                                    className={cn(primaryActionClass, compactActionClass)}
                                    type="button"
                                    onClick={() => onLink("osu")}
                                    disabled={action === "linking"}
                                >
                                    <OsuLogo aria-hidden="true" />
                                    {action === "linking" ? "Opening osu!…" : "Connect osu!"}
                                </button>
                            </div>
                        </>
                    )}
                </article>
            </div>
        </section>
    );
}

interface BotPreferencesSectionProps {
    settings: BotSettings | null;
    loading: boolean;
    action: ProfileAction;
    saved: boolean;
    onSettingsChange: (settings: BotSettings) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function BotPreferencesSection({ settings, loading, action, saved, onSettingsChange, onSubmit }: BotPreferencesSectionProps) {
    const current = settings ?? defaultSettings;

    return (
        <section className="mt-12" aria-labelledby="settings-title">
            <div className={sectionHeadingClass}>
                <h2 id="settings-title">Hanami Bot preferences</h2>
                <p>These values are stored against your Discord ID in the bot database.</p>
            </div>

            {loading ? (
                <LoadingInline label="Loading preferences" />
            ) : (
                <form className="pt-6" onSubmit={onSubmit}>
                    <div className="grid grid-cols-1 gap-x-10 gap-y-5 min-[601px]:grid-cols-2 min-[601px]:gap-y-6">
                        <SelectField
                            label="Default game mode"
                            value={current.mode}
                            onChange={(value) => onSettingsChange({ ...current, mode: parseMode(value) })}
                        >
                            <option value="osu">osu! standard</option>
                            <option value="mania">osu!mania</option>
                            <option value="taiko">osu!taiko</option>
                            <option value="fruits">osu!catch</option>
                        </SelectField>
                        <SelectField
                            label="Embed style"
                            value={current.embed_type}
                            onChange={(value) =>
                                onSettingsChange({
                                    ...current,
                                    embed_type: parseEmbedType(value),
                                })
                            }
                        >
                            <option value="hanami">Hanami</option>
                            <option value="bathbot">Bathbot</option>
                            <option value="owobot">owo</option>
                        </SelectField>
                        <SelectField
                            label="Score embed size"
                            value={String(current.score_embeds)}
                            onChange={(value) =>
                                onSettingsChange({
                                    ...current,
                                    score_embeds: parseBinary(value),
                                })
                            }
                        >
                            <option value="1">Expanded</option>
                            <option value="0">Compact</option>
                        </SelectField>
                        <SelectField
                            label="Score source"
                            value={String(current.score_data)}
                            onChange={(value) =>
                                onSettingsChange({
                                    ...current,
                                    score_data: parseBinary(value),
                                })
                            }
                        >
                            <option value="0">Stable</option>
                            <option value="1">Lazer</option>
                        </SelectField>
                    </div>
                    <div className="mt-8 flex items-center gap-6 border-t border-border pt-5 max-[600px]:flex-col max-[600px]:items-start">
                        <button className={cn(primaryActionClass, compactActionClass)} type="submit" disabled={action === "saving"}>
                            {action === "saving" ? "Saving…" : "Save preferences"}
                        </button>
                        {saved && (
                            <span className={cn(formMessageClass, "text-success")} role="status">
                                <Check aria-hidden="true" />
                                Preferences saved.
                            </span>
                        )}
                    </div>
                </form>
            )}
        </section>
    );
}

export function AccountPrivacyAside() {
    return (
        <aside className="mt-10 grid max-w-220 grid-cols-1 items-end gap-5 border-t border-border pt-6 min-[701px]:grid-cols-[minmax(0,1fr)_auto] [&_h2]:text-[1.05rem] [&_p]:mt-2 [&_p]:max-w-145 [&_p]:text-[0.82rem] [&_p]:leading-[1.6] [&_p]:text-muted">
            <div>
                <h2>Privacy and account</h2>
                <p>Review the signed-in identity, get privacy help, or permanently delete website and Bot account data.</p>
            </div>
            <PrefetchLink className={cn(primaryActionClass, secondaryActionClass, compactActionClass)} to={routes.profilePrivacy}>
                Open privacy settings
            </PrefetchLink>
        </aside>
    );
}

export function LoadingInline({ label }: { label: string }) {
    return (
        <div className={loadingInlineClass} role="status">
            <Loader2 aria-hidden="true" />
            <span>{label}</span>
        </div>
    );
}

function Avatar({ src, name }: { src?: string | null; name: string }) {
    if (src)
        return (
            <img
                className="account-avatar size-15 shrink-0 rounded-md object-cover"
                src={src}
                alt={`${name} avatar`}
                width="64"
                height="64"
            />
        );
    return (
        <span
            className="account-avatar grid size-15 shrink-0 place-items-center rounded-md border border-border-strong bg-surface-strong font-extrabold text-white"
            aria-hidden="true"
        >
            {name.slice(0, 1).toUpperCase()}
        </span>
    );
}

function ProviderMark({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                "account-avatar grid size-15 shrink-0 place-items-center rounded-md border border-border-strong bg-surface-strong text-white",
                className,
            )}
            aria-hidden="true"
        >
            {children}
        </span>
    );
}

function SelectField({
    label,
    value,
    onChange,
    children,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    const id = label.toLowerCase().replaceAll(" ", "-");
    return (
        <label className="grid gap-[0.7rem]" htmlFor={id}>
            <span className="text-[0.82rem] font-bold text-[#ded9df]">{label}</span>
            <select
                className="min-h-11.5 w-full rounded-sm border border-border-strong bg-surface px-[0.85rem] text-white"
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                {children}
            </select>
        </label>
    );
}

function parseMode(value: string): BotSettings["mode"] {
    switch (value) {
        case "mania":
        case "taiko":
        case "fruits":
            return value;
        default:
            return "osu";
    }
}

function parseEmbedType(value: string): BotSettings["embed_type"] {
    switch (value) {
        case "bathbot":
        case "owobot":
            return value;
        default:
            return "hanami";
    }
}

function parseBinary(value: string): 0 | 1 {
    return value === "1" ? 1 : 0;
}
