-- Ensure the garden admin can always sign in.
INSERT INTO `allowed_emails` (`id`, `email`, `created_at`, `updated_at`, `deleted_at`)
VALUES (
	'allow-jch-harrison',
	'jch.harrison@gmail.com',
	cast(unixepoch('subsecond') * 1000 as integer),
	cast(unixepoch('subsecond') * 1000 as integer),
	NULL
)
ON CONFLICT (`email`) DO UPDATE SET
	`deleted_at` = NULL,
	`updated_at` = cast(unixepoch('subsecond') * 1000 as integer);
