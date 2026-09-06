CREATE TABLE `user` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL,
    `image` TEXT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `user_email_unique` (`email`)
) ENGINE=InnoDB;

CREATE TABLE `session` (
    `id` VARCHAR(36) NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipAddress` TEXT NULL,
    `userAgent` TEXT NULL,
    `userId` VARCHAR(36) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `session_token_unique` (`token`),
    KEY `session_userId_idx` (`userId`),
    CONSTRAINT `session_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `account` (
    `id` VARCHAR(36) NOT NULL,
    `accountId` TEXT NOT NULL,
    `providerId` TEXT NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `idToken` TEXT NULL,
    `accessTokenExpiresAt` TIMESTAMP(3) NULL,
    `refreshTokenExpiresAt` TIMESTAMP(3) NULL,
    `scope` TEXT NULL,
    `password` TEXT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    KEY `account_userId_idx` (`userId`),
    UNIQUE KEY `account_provider_account_unique` (`providerId`(64), `accountId`(191)),
    CONSTRAINT `account_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `verification` (
    `id` VARCHAR(36) NOT NULL,
    `identifier` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    KEY `verification_identifier_idx` (`identifier`)
) ENGINE=InnoDB;

CREATE TABLE `webSchemaMigration` (
    `id` VARCHAR(191) NOT NULL,
    `appliedAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `accountDeletionReauthChallenge` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `reauthenticatedAt` TIMESTAMP(3) NULL,
    `consumedAt` TIMESTAMP(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `accountDeletionReauthChallenge_user_unique` (`userId`),
    KEY `accountDeletionReauthChallenge_lookup_idx` (`userId`, `tokenHash`),
    KEY `accountDeletionReauthChallenge_expiry_idx` (`expiresAt`),
    CONSTRAINT `accountDeletionReauthChallenge_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `discordLinkTicket` (
    `id` VARCHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `discordUserId` VARCHAR(20) NOT NULL,
    `username` VARCHAR(32) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `avatarUrl` TEXT NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `consumedAt` TIMESTAMP(3) NULL,
    `invalidatedAt` TIMESTAMP(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `discordLinkTicket_tokenHash_unique` (`tokenHash`),
    KEY `discordLinkTicket_discord_active_idx` (`discordUserId`, `consumedAt`, `invalidatedAt`),
    KEY `discordLinkTicket_expiresAt_idx` (`expiresAt`)
) ENGINE=InnoDB;

CREATE TABLE `osuOAuthState` (
    `id` VARCHAR(36) NOT NULL,
    `stateHash` CHAR(64) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `sessionId` VARCHAR(36) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `consumedAt` TIMESTAMP(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `osuOAuthState_stateHash_unique` (`stateHash`),
    KEY `osuOAuthState_binding_idx` (`userId`, `sessionId`, `consumedAt`),
    KEY `osuOAuthState_expiresAt_idx` (`expiresAt`),
    CONSTRAINT `osuOAuthState_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `osuOAuthState_session_fk` FOREIGN KEY (`sessionId`) REFERENCES `session` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `companionAuthorizationRequest` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `sessionId` VARCHAR(36) NOT NULL,
    `clientId` VARCHAR(64) NOT NULL,
    `redirectUri` VARCHAR(255) NOT NULL,
    `state` VARCHAR(512) NOT NULL,
    `codeChallenge` CHAR(43) NOT NULL,
    `codeChallengeMethod` VARCHAR(8) NOT NULL,
    `deviceName` VARCHAR(100) NOT NULL,
    `platform` VARCHAR(20) NOT NULL,
    `csrfTokenHash` CHAR(64) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `consumedAt` TIMESTAMP(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `companionAuthorizationRequest_csrf_unique` (`csrfTokenHash`),
    KEY `companionAuthorizationRequest_binding_idx` (`userId`, `sessionId`, `consumedAt`),
    KEY `companionAuthorizationRequest_expiry_idx` (`expiresAt`),
    CONSTRAINT `companionAuthorizationRequest_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `companionAuthorizationRequest_session_fk` FOREIGN KEY (`sessionId`) REFERENCES `session` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `companionAuthorizationCode` (
    `id` VARCHAR(36) NOT NULL,
    `codeHash` CHAR(64) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `clientId` VARCHAR(64) NOT NULL,
    `redirectUri` VARCHAR(255) NOT NULL,
    `codeChallenge` CHAR(43) NOT NULL,
    `codeChallengeMethod` VARCHAR(8) NOT NULL,
    `deviceName` VARCHAR(100) NOT NULL,
    `platform` VARCHAR(20) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `usedAt` TIMESTAMP(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `companionAuthorizationCode_hash_unique` (`codeHash`),
    KEY `companionAuthorizationCode_user_idx` (`userId`, `createdAt`),
    KEY `companionAuthorizationCode_expiry_idx` (`expiresAt`, `usedAt`),
    CONSTRAINT `companionAuthorizationCode_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `companionDevice` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `platform` VARCHAR(20) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL,
    `lastUsedAt` TIMESTAMP(3) NOT NULL,
    `revokedAt` TIMESTAMP(3) NULL,
    PRIMARY KEY (`id`),
    KEY `companionDevice_user_idx` (`userId`, `createdAt`),
    KEY `companionDevice_user_active_idx` (`userId`, `revokedAt`),
    CONSTRAINT `companionDevice_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `companionTokenFamily` (
    `id` VARCHAR(36) NOT NULL,
    `deviceId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `clientId` VARCHAR(64) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL,
    `lastUsedAt` TIMESTAMP(3) NOT NULL,
    `revokedAt` TIMESTAMP(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `companionTokenFamily_device_unique` (`deviceId`),
    KEY `companionTokenFamily_user_idx` (`userId`, `revokedAt`),
    CONSTRAINT `companionTokenFamily_device_fk` FOREIGN KEY (`deviceId`) REFERENCES `companionDevice` (`id`) ON DELETE CASCADE,
    CONSTRAINT `companionTokenFamily_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `companionAccessToken` (
    `id` VARCHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `familyId` VARCHAR(36) NOT NULL,
    `deviceId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `lastUsedAt` TIMESTAMP(3) NULL,
    `revokedAt` TIMESTAMP(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `companionAccessToken_hash_unique` (`tokenHash`),
    KEY `companionAccessToken_family_idx` (`familyId`, `revokedAt`),
    KEY `companionAccessToken_expiry_idx` (`expiresAt`),
    KEY `companionAccessToken_user_idx` (`userId`, `deviceId`),
    CONSTRAINT `companionAccessToken_family_fk` FOREIGN KEY (`familyId`) REFERENCES `companionTokenFamily` (`id`) ON DELETE CASCADE,
    CONSTRAINT `companionAccessToken_device_fk` FOREIGN KEY (`deviceId`) REFERENCES `companionDevice` (`id`) ON DELETE CASCADE,
    CONSTRAINT `companionAccessToken_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `companionRefreshToken` (
    `id` VARCHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `familyId` VARCHAR(36) NOT NULL,
    `parentTokenId` VARCHAR(36) NULL,
    `replacedByTokenId` VARCHAR(36) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `usedAt` TIMESTAMP(3) NULL,
    `revokedAt` TIMESTAMP(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `companionRefreshToken_hash_unique` (`tokenHash`),
    KEY `companionRefreshToken_family_idx` (`familyId`, `revokedAt`),
    KEY `companionRefreshToken_expiry_idx` (`expiresAt`, `usedAt`),
    KEY `companionRefreshToken_parent_idx` (`parentTokenId`),
    CONSTRAINT `companionRefreshToken_family_fk` FOREIGN KEY (`familyId`) REFERENCES `companionTokenFamily` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
