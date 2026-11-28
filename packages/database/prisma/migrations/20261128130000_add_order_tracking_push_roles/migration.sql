-- AlterTable
ALTER TABLE `Order` ADD COLUMN `customerPushToken` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `PushSubscription`
    ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    ADD COLUMN `conversationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `PushSubscription_role_revokedAt_idx` ON `PushSubscription`(`role`, `revokedAt`);

-- CreateIndex
CREATE INDEX `PushSubscription_conversationId_revokedAt_idx` ON `PushSubscription`(`conversationId`, `revokedAt`);
