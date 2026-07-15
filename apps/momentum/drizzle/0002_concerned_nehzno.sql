ALTER TABLE `user` ADD `preferred_name` text;--> statement-breakpoint
UPDATE `user`
SET `preferred_name` = CASE
  WHEN instr(`name`, ' ') > 0 THEN substr(`name`, 1, instr(`name`, ' ') - 1)
  ELSE `name`
END
WHERE `preferred_name` IS NULL AND `name` IS NOT NULL AND `name` != '';
