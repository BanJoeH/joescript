PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_household_members` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text,
	`email` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_household_members`("id", "household_id", "user_id", "email", "created_at", "updated_at", "deleted_at") SELECT "id", "household_id", "user_id", "email", "created_at", "updated_at", "deleted_at" FROM `household_members`;--> statement-breakpoint
DROP TABLE `household_members`;--> statement-breakpoint
ALTER TABLE `__new_household_members` RENAME TO `household_members`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
UPDATE `household_members`
SET `email` = (
	SELECT lower(trim(`user`.`email`))
	FROM `user`
	WHERE `user`.`id` = `household_members`.`user_id`
)
WHERE `user_id` IS NOT NULL AND `email` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `household_members_household_user_unique` ON `household_members` (`household_id`,`user_id`) WHERE "household_members"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX `household_members_household_email_unique` ON `household_members` (`household_id`,`email`) WHERE "household_members"."email" is not null;