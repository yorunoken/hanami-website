-- CreateTable
CREATE TABLE `osuProfile` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `osuId` VARCHAR(20) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `avatarUrl` TEXT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `osuProfile_userId_key`(`userId`),
    UNIQUE INDEX `osuProfile_osuId_key`(`osuId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- CreateTable
CREATE TABLE `jwks` (
    `id` VARCHAR(36) NOT NULL,
    `publicKey` TEXT NOT NULL,
    `privateKey` TEXT NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` TIMESTAMP(3) NULL,
    `alg` VARCHAR(32) NULL,
    `crv` VARCHAR(32) NULL,

    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- CreateTable
CREATE TABLE `oauthClient` (
    `id` VARCHAR(36) NOT NULL,
    `clientId` VARCHAR(255) NOT NULL,
    `clientSecret` TEXT NULL,
    `clientDiscoveryId` VARCHAR(255) NULL,
    `disabled` BOOLEAN NOT NULL DEFAULT false,
    `skipConsent` BOOLEAN NULL,
    `enableEndSession` BOOLEAN NULL,
    `subjectType` VARCHAR(16) NULL,
    `scopes` JSON NULL,
    `clientCredentialsScopes` JSON NULL,
    `userId` VARCHAR(36) NULL,
    `createdAt` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(255) NULL,
    `uri` VARCHAR(255) NULL,
    `icon` TEXT NULL,
    `contacts` JSON NULL,
    `tos` VARCHAR(255) NULL,
    `policy` VARCHAR(255) NULL,
    `softwareId` VARCHAR(255) NULL,
    `softwareVersion` VARCHAR(255) NULL,
    `softwareStatement` TEXT NULL,
    `redirectUris` JSON NOT NULL,
    `postLogoutRedirectUris` JSON NULL,
    `backchannelLogoutUri` VARCHAR(255) NULL,
    `backchannelLogoutSessionRequired` BOOLEAN NULL,
    `tokenEndpointAuthMethod` VARCHAR(64) NULL,
    `applicationType` VARCHAR(16) NULL,
    `jwks` TEXT NULL,
    `jwksUri` VARCHAR(255) NULL,
    `grantTypes` JSON NULL,
    `responseTypes` JSON NULL,
    `requirePKCE` BOOLEAN NULL,
    `dpopBoundAccessTokens` BOOLEAN NOT NULL DEFAULT false,
    `referenceId` VARCHAR(255) NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `oauthClient_clientId_key`(`clientId`),
    INDEX `oauthClient_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- CreateTable
CREATE TABLE `oauthResource` (
    `id` VARCHAR(36) NOT NULL,
    `identifier` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `accessTokenTtl` INTEGER NULL,
    `refreshTokenTtl` INTEGER NULL,
    `signingAlgorithm` VARCHAR(32) NULL,
    `signingKeyId` VARCHAR(255) NULL,
    `allowedScopes` JSON NULL,
    `customClaims` JSON NULL,
    `dpopBoundAccessTokensRequired` BOOLEAN NOT NULL DEFAULT false,
    `disabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `policyVersion` INTEGER NOT NULL DEFAULT 1,
    `metadata` JSON NULL,

    UNIQUE INDEX `oauthResource_identifier_key`(`identifier`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- CreateTable
CREATE TABLE `oauthClientResource` (
    `id` VARCHAR(36) NOT NULL,
    `clientId` VARCHAR(255) NOT NULL,
    `resourceId` VARCHAR(255) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `oauthClientResource_client_resource_unique`(`clientId`, `resourceId`),
    INDEX `oauthClientResource_clientId_idx`(`clientId`),
    INDEX `oauthClientResource_resourceId_idx`(`resourceId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- CreateTable
CREATE TABLE `oauthRefreshToken` (
    `id` VARCHAR(36) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `clientId` VARCHAR(255) NOT NULL,
    `sessionId` VARCHAR(36) NULL,
    `userId` VARCHAR(36) NOT NULL,
    `referenceId` VARCHAR(255) NULL,
    `authorizationCodeId` VARCHAR(36) NULL,
    `resources` JSON NULL,
    `requestedUserInfoClaims` JSON NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revoked` TIMESTAMP(3) NULL,
    `rotatedAt` TIMESTAMP(3) NULL,
    `rotationReplayResponse` TEXT NULL,
    `rotationReplayExpiresAt` TIMESTAMP(3) NULL,
    `authTime` TIMESTAMP(3) NULL,
    `confirmation` JSON NULL,
    `scopes` JSON NOT NULL,

    UNIQUE INDEX `oauthRefreshToken_token_key`(`token`),
    INDEX `oauthRefreshToken_clientId_idx`(`clientId`),
    INDEX `oauthRefreshToken_sessionId_idx`(`sessionId`),
    INDEX `oauthRefreshToken_userId_idx`(`userId`),
    INDEX `oauthRefreshToken_authorizationCodeId_idx`(`authorizationCodeId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- CreateTable
CREATE TABLE `oauthAccessToken` (
    `id` VARCHAR(36) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `clientId` VARCHAR(255) NOT NULL,
    `sessionId` VARCHAR(36) NULL,
    `userId` VARCHAR(36) NULL,
    `referenceId` VARCHAR(255) NULL,
    `authorizationCodeId` VARCHAR(36) NULL,
    `resources` JSON NULL,
    `requestedUserInfoClaims` JSON NULL,
    `refreshId` VARCHAR(36) NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revoked` TIMESTAMP(3) NULL,
    `confirmation` JSON NULL,
    `scopes` JSON NOT NULL,

    UNIQUE INDEX `oauthAccessToken_token_key`(`token`),
    INDEX `oauthAccessToken_clientId_idx`(`clientId`),
    INDEX `oauthAccessToken_sessionId_idx`(`sessionId`),
    INDEX `oauthAccessToken_userId_idx`(`userId`),
    INDEX `oauthAccessToken_authorizationCodeId_idx`(`authorizationCodeId`),
    INDEX `oauthAccessToken_refreshId_idx`(`refreshId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- CreateTable
CREATE TABLE `oauthConsent` (
    `id` VARCHAR(36) NOT NULL,
    `clientId` VARCHAR(255) NOT NULL,
    `userId` VARCHAR(36) NULL,
    `referenceId` VARCHAR(255) NULL,
    `resources` JSON NULL,
    `requestedUserInfoClaims` JSON NULL,
    `scopes` JSON NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `oauthConsent_clientId_idx`(`clientId`),
    INDEX `oauthConsent_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- CreateTable
CREATE TABLE `oauthClientAssertion` (
    `id` VARCHAR(36) NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,

    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- AddForeignKey
ALTER TABLE `osuProfile` ADD CONSTRAINT `osuProfile_user_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthClient` ADD CONSTRAINT `oauthClient_user_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthClientResource` ADD CONSTRAINT `oauthClientResource_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `oauthClient`(`clientId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthClientResource` ADD CONSTRAINT `oauthClientResource_resourceId_fkey` FOREIGN KEY (`resourceId`) REFERENCES `oauthResource`(`identifier`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthRefreshToken` ADD CONSTRAINT `oauthRefreshToken_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `oauthClient`(`clientId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthRefreshToken` ADD CONSTRAINT `oauthRefreshToken_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `session`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthRefreshToken` ADD CONSTRAINT `oauthRefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthAccessToken` ADD CONSTRAINT `oauthAccessToken_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `oauthClient`(`clientId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthAccessToken` ADD CONSTRAINT `oauthAccessToken_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `session`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthAccessToken` ADD CONSTRAINT `oauthAccessToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthAccessToken` ADD CONSTRAINT `oauthAccessToken_refreshId_fkey` FOREIGN KEY (`refreshId`) REFERENCES `oauthRefreshToken`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthConsent` ADD CONSTRAINT `oauthConsent_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `oauthClient`(`clientId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauthConsent` ADD CONSTRAINT `oauthConsent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
