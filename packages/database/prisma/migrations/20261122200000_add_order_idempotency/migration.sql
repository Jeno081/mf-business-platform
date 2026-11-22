-- AlterTable
ALTER TABLE `Order` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Order_idempotencyKey_key` ON `Order`(`idempotencyKey`);
