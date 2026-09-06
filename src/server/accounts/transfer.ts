import { Prisma } from "../../generated/prisma/web/client";
import { createOsuPlaceholderEmail } from "../../lib/osu-identity";

import { webPrisma } from "../database/web";

export async function transferVerifiedOsuIdentity(targetUserId: string, osuId: string): Promise<string | null> {
    return webPrisma.$transaction(
        async (database) => {
            const [targetUser, sourceAccount, targetOsuAccount] = await Promise.all([
                database.user.findUnique({ where: { id: targetUserId }, select: { id: true } }),
                database.account.findFirst({ where: { providerId: "osu", accountId: osuId }, select: { id: true, userId: true } }),
                database.account.findFirst({ where: { userId: targetUserId, providerId: "osu" }, select: { accountId: true } }),
            ]);
            if (!targetUser || !sourceAccount) throw new Error("The verified osu! identity could not be resolved.");
            if (sourceAccount.userId === targetUserId) return null;
            if (targetOsuAccount) throw new Error("The current Hanami account already has a different osu! identity.");

            const sourceUserId = sourceAccount.userId;
            const sourceProfile = await database.osuProfile.findUnique({ where: { osuId } });
            const targetProfile = await database.osuProfile.findUnique({ where: { userId: targetUserId } });
            if (!sourceProfile || targetProfile) throw new Error("The verified osu! profile could not be transferred safely.");

            await database.oauthAccessToken.deleteMany({ where: { userId: sourceUserId } });
            await database.oauthRefreshToken.deleteMany({ where: { userId: sourceUserId } });
            await database.oauthConsent.deleteMany({ where: { userId: sourceUserId } });
            await database.session.deleteMany({ where: { userId: sourceUserId } });
            await database.account.update({ where: { id: sourceAccount.id }, data: { userId: targetUserId } });
            await database.osuProfile.update({ where: { id: sourceProfile.id }, data: { userId: targetUserId } });

            if ((await database.account.count({ where: { userId: sourceUserId } })) === 0) {
                await database.user.delete({ where: { id: sourceUserId } });
            }
            return sourceUserId;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
}

export async function transferVerifiedDiscordIdentity(targetUserId: string, discordId: string): Promise<string | null> {
    return webPrisma.$transaction(
        async (database) => {
            const [targetUser, sourceAccount, targetDiscordAccount] = await Promise.all([
                database.user.findUnique({ where: { id: targetUserId }, select: { id: true } }),
                database.account.findFirst({ where: { providerId: "discord", accountId: discordId }, select: { id: true, userId: true } }),
                database.account.findFirst({ where: { userId: targetUserId, providerId: "discord" }, select: { accountId: true } }),
            ]);
            if (!targetUser || !sourceAccount) throw new Error("The verified Discord identity could not be resolved.");
            if (sourceAccount.userId === targetUserId) return null;
            if (targetDiscordAccount) throw new Error("The current Hanami account already has a different Discord identity.");

            const sourceUserId = sourceAccount.userId;
            await database.oauthAccessToken.deleteMany({ where: { userId: sourceUserId } });
            await database.oauthRefreshToken.deleteMany({ where: { userId: sourceUserId } });
            await database.oauthConsent.deleteMany({ where: { userId: sourceUserId } });
            await database.session.deleteMany({ where: { userId: sourceUserId } });
            await database.account.update({ where: { id: sourceAccount.id }, data: { userId: targetUserId } });

            const remainingOsuAccount = await database.account.findFirst({
                where: { userId: sourceUserId, providerId: "osu" },
                select: { accountId: true },
            });
            if (!remainingOsuAccount) {
                await database.user.delete({ where: { id: sourceUserId } });
                return sourceUserId;
            }

            const profile = await database.osuProfile.findUnique({ where: { userId: sourceUserId, osuId: remainingOsuAccount.accountId } });
            if (!profile) throw new Error("The remaining osu! identity profile was not found.");
            await database.user.update({
                where: { id: sourceUserId },
                data: {
                    name: profile.username,
                    email: createOsuPlaceholderEmail(profile.osuId),
                    emailVerified: false,
                    image: profile.avatarUrl,
                    updatedAt: new Date(),
                },
            });
            return sourceUserId;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
}
