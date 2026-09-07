ALTER TABLE `oauthRefreshToken`
    DROP INDEX `oauthRefreshToken_authorizationCodeId_idx`,
    MODIFY `authorizationCodeId` TEXT NULL,
    ADD INDEX `oauthRefreshToken_authorizationCodeId_idx`(`authorizationCodeId`(191));

ALTER TABLE `oauthAccessToken`
    DROP INDEX `oauthAccessToken_authorizationCodeId_idx`,
    MODIFY `authorizationCodeId` TEXT NULL,
    ADD INDEX `oauthAccessToken_authorizationCodeId_idx`(`authorizationCodeId`(191));
