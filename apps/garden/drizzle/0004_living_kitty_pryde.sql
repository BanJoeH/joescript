CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`favorite_household_id` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`favorite_household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE set null
);
