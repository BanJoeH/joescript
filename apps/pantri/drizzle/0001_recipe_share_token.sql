ALTER TABLE `recipes` ADD `share_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_share_token_unique` ON `recipes` (`share_token`);