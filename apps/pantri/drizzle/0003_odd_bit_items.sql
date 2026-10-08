CREATE TABLE `odd_bit_items` (
	`id` text PRIMARY KEY NOT NULL,
	`pantry_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` real,
	`unit` text,
	`notes` text,
	`purchased` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`pantry_id`) REFERENCES `pantries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `odd_bit_items_pantry_id_idx` ON `odd_bit_items` (`pantry_id`);--> statement-breakpoint
INSERT INTO `odd_bit_items` (`id`, `pantry_id`, `name`, `amount`, `unit`, `notes`, `purchased`, `created_at`, `updated_at`)
SELECT
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
	o.`pantry_id`,
	json_extract(j.value, '$.name'),
	json_extract(j.value, '$.amount'),
	json_extract(j.value, '$.unit'),
	json_extract(j.value, '$.notes'),
	CASE WHEN lower(coalesce(json_extract(j.value, '$.purchased'), '0')) IN ('1', 'true') THEN 1 ELSE 0 END,
	o.`created_at`,
	o.`updated_at`
FROM `odd_bits` AS o, json_each(CASE WHEN json_valid(o.`ingredients`) THEN o.`ingredients` ELSE '[]' END) AS j
WHERE typeof(j.value) = 'object'
	AND length(trim(coalesce(json_extract(j.value, '$.name'), ''))) > 0;--> statement-breakpoint
DROP TABLE `odd_bits`;
