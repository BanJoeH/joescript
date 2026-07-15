-- Seed admin allowlist so the owner can sign in after first deploy.
INSERT INTO `allowed_emails` (`id`, `email`, `created_at`, `updated_at`, `deleted_at`)
VALUES (
  'seed-admin-email',
  'jch.harrison@gmail.com',
  cast(unixepoch('subsecond') * 1000 as integer),
  cast(unixepoch('subsecond') * 1000 as integer),
  NULL
);
