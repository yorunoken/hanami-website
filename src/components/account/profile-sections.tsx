import { Check, ExternalLink, Link2, Loader2, Unlink } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { routes } from "@/client/routes/paths";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import {
    compactActionClass,
    formMessageClass,
    loadingInlineClass,
    primaryActionClass,
    textButtonClass,
} from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";

import { sectionHeadingClass } from "./account-shell";

const identityBlockClass =
    "flex min-h-82.5 flex-col border-b border-border p-[clamp(1.5rem,4vw,2.5rem)] min-[821px]:min-h-92.5 min-[821px]:border-r last:min-[821px]:border-r-0";
const identityPersonClass =
    "flex items-center gap-[1.1rem] [&_h3]:text-xl [&_h3_a]:inline-flex [&_h3_a]:items-center [&_h3_a]:gap-[0.45rem] [&_h3_a]:no-underline [&_h3_svg]:size-3.75 [&_p]:mb-[0.3rem] [&_p]:font-mono [&_p]:text-[0.68rem] [&_p]:text-quiet [&_p]:uppercase [&_span:not(.account-avatar):not(.osu-mark)]:mt-1 [&_span:not(.account-avatar):not(.osu-mark)]:block [&_span:not(.account-avatar):not(.osu-mark)]:text-[0.78rem] [&_span:not(.account-avatar):not(.osu-mark)]:text-muted";
const identityDetailsClass =
    "mt-auto mb-6 pt-8 [&>div]:flex [&>div]:justify-between [&>div]:gap-4 [&>div]:border-b [&>div]:border-border [&>div]:py-3 [&>div]:text-[0.78rem] [&_dd]:text-right [&_dd]:text-[#d8d2d9] [&_dt]:text-quiet";

export interface LinkStatus {
    linked: boolean;
    banchoId?: string;
    username?: string;
    avatarUrl?: string;
    globalRank?: number | null;
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
    discordUser: { name: string; email?: string | null; image?: string | null };
    linkStatus: LinkStatus | null;
    loading: boolean;
    action: ProfileAction;
    onLink: () => void;
    onUnlink: () => void;
}

export function IdentitySection({ discordUser, linkStatus, loading, action, onLink, onUnlink }: IdentitySectionProps) {
    return (
        <section className="mt-16" aria-labelledby="identity-title">
            <div className={sectionHeadingClass}>
                <h2 id="identity-title">Identity</h2>
            </div>

            <div className="grid grid-cols-1 min-[821px]:grid-cols-2">
                <article className={identityBlockClass}>
                    <div className={identityPersonClass}>
                        <Avatar src={discordUser.image} name={discordUser.name} />
                        <div>
                            <p>Discord sign-in</p>
                            <h3>{discordUser.name}</h3>
                            {discordUser.email && <span>{discordUser.email}</span>}
                        </div>
                    </div>
                    <dl className={identityDetailsClass}>
                        <div>
                            <dt>Provider</dt>
                            <dd>Discord OAuth</dd>
                        </div>
                        <div>
                            <dt>Requested scope</dt>
                            <dd>Identity; email when available</dd>
                        </div>
                        <div>
                            <dt>Session</dt>
                            <dd>Active</dd>
                        </div>
                    </dl>
                </article>

                <article className={identityBlockClass}>
                    {loading ? (
                        <LoadingInline label="Checking osu! link" />
                    ) : linkStatus?.linked ? (
                        <>
                            <div className={identityPersonClass}>
                                <Avatar src={linkStatus.avatarUrl} name={linkStatus.username || "osu! player"} />
                                <div>
                                    <p>osu! link</p>
                                    <h3>
                                        <a href={`https://osu.ppy.sh/users/${linkStatus.banchoId}`} target="_blank" rel="noreferrer">
                                            {linkStatus.username || "Linked player"}
                                            <ExternalLink aria-hidden="true" />
                                        </a>
                                    </h3>
                                    <span>
                                        {linkStatus.globalRank
                                            ? `Global rank #${linkStatus.globalRank.toLocaleString()}`
                                            : "Public rank unavailable"}
                                    </span>
                                </div>
                            </div>
                            <dl className={identityDetailsClass}>
                                <div>
                                    <dt>Stored link</dt>
                                    <dd>Discord ID → osu! ID</dd>
                                </div>
                                <div>
                                    <dt>osu! ID</dt>
                                    <dd>{linkStatus.banchoId}</dd>
                                </div>
                            </dl>
                            <button
                                className={cn(textButtonClass, "text-danger")}
                                type="button"
                                onClick={onUnlink}
                                disabled={action === "unlinking"}
                            >
                                <Unlink aria-hidden="true" />
                                {action === "unlinking" ? "Disconnecting…" : "Disconnect osu!"}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className={identityPersonClass}>
                                <span
                                    className="osu-mark grid size-15 shrink-0 place-items-center rounded-md border border-border-strong bg-surface-strong text-[0.85rem] font-extrabold text-accent-soft"
                                    aria-hidden="true"
                                >
                                    osu!
                                </span>
                                <div>
                                    <p>osu! link</p>
                                    <h3>Not connected</h3>
                                    <span>Linking is optional.</span>
                                </div>
                            </div>
                            <p className="my-8 text-[0.88rem] leading-[1.65] text-muted">
                                Connect an osu! account to let supported bot commands use your profile by default.
                            </p>
                            <button
                                className={cn(primaryActionClass, compactActionClass)}
                                type="button"
                                onClick={onLink}
                                disabled={action === "linking"}
                            >
                                <Link2 aria-hidden="true" />
                                {action === "linking" ? "Opening osu!…" : "Connect osu!"}
                            </button>
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
        <section className="mt-16" aria-labelledby="settings-title">
            <div className={sectionHeadingClass}>
                <h2 id="settings-title">Hanami Bot preferences</h2>
                <p>These values are stored against your Discord ID in the bot database.</p>
            </div>

            {loading ? (
                <LoadingInline label="Loading preferences" />
            ) : (
                <form className="pt-8" onSubmit={onSubmit}>
                    <div className="grid grid-cols-1 gap-x-12 gap-y-6 min-[601px]:grid-cols-2 min-[601px]:gap-y-8">
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
                    <div className="mt-10 flex items-center gap-6 border-t border-border pt-6 max-[600px]:flex-col max-[600px]:items-start">
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
        <aside className="mt-16 max-w-190 border-l-2 border-accent pl-6 [&_a]:text-[0.82rem] [&_a]:text-white [&_a]:underline-offset-[0.2em] [&_h2]:text-[1.1rem] [&_p]:my-[0.7rem] [&_p]:text-[0.84rem] [&_p]:leading-[1.65] [&_p]:text-muted">
            <h2>Privacy and deletion requests</h2>
            <p>Review what Hanami may hold, submit a verified deletion request, or check a request already in progress.</p>
            <PrefetchLink to={routes.profilePrivacy}>Manage account privacy</PrefetchLink>
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
