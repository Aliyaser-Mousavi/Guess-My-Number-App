export const STORAGE_VERSION = 2;

export const StorageKeys = {
  SCHEMA_VERSION: "@gmn/schema_version",
  STATE_V2: "@gmn/state_v2",
  LEGACY_STATS: "@gmn/stats",
  LEGACY_SETTINGS: "@gmn/settings",
  CORRUPT_BACKUP_PREFIX: "@gmn/corrupted_backup_",
} as const;

