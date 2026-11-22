-- AlterTable
ALTER TABLE `Product`
    ADD COLUMN `subtitle` VARCHAR(191) NULL,
    ADD COLUMN `series` VARCHAR(120) NULL,
    ADD COLUMN `badge` VARCHAR(60) NULL,
    ADD COLUMN `badgeTone` VARCHAR(40) NULL,
    ADD COLUMN `keywords` TEXT NULL;
