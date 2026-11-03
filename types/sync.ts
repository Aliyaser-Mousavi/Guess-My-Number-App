import type { DifficultyId, GameMode } from "@/constants/gameConfig";
import type { Settings } from "./game";

export type SyncStatus =
  | "idle"
  | "syncing"
  | "up_to_date"
  | "offline"
  | "pending"
  | "failed";

export type SessionVerificationStatus =
  | "client_reported"
  | "server_verified"
  | "legacy_unverified";

export type CloudGameSession = {
  id?: string;
  user_id?: string;
  client_session_id: string;
  mode: GameMode;
  difficulty: DifficultyId;
  won: boolean;
  rounds: number;
  score: number;
  elapsed_ms: number;
  hints_used: number;
  is_daily: boolean;
  user_number: number;
  secret_number?: number | null;
  min_range?: number | null;
  max_range?: number | null;
  target_number?: number | null;
  custom_config?: any;
  player1_name?: string | null;
  player2_name?: string | null;
  guesses: number[];
  replay_timeline?: any;
  verification_status: SessionVerificationStatus;
  processed_for_rewards?: boolean;
  xp_awarded?: number;
  client_played_at?: string;
  played_at?: string;
  created_at?: string;
};

export type CloudAchievement = {
  id?: string;
  user_id?: string;
  achievement_id: string;
  unlocked_at?: string;
  unlock_source?: string;
  metadata?: any;
};

export type CloudCosmeticUnlock = {
  id?: string;
  user_id?: string;
  cosmetic_type: "avatar" | "title" | "theme" | "number_style";
  cosmetic_id: string;
  unlocked_at?: string;
  unlock_source?: string;
};

export type CloudSettings = {
  user_id?: string;
  theme_id: string;
  number_style: string;
  number_animation: string;
  text_size: string;
  haptics: boolean;
  haptic_intensity: string;
  sound_enabled: boolean;
  sound_volume: number;
  show_proximity: boolean;
  show_timer: boolean;
  show_range_bar: boolean;
  tutorial_completed: boolean;
  high_contrast: boolean;
  color_blind_mode: string;
  reduced_motion: boolean;
  left_handed_controls: boolean;
  language: string;
  digit_format: string;
  notifications: any;
  version: number;
  updated_at?: string;
};

export type CloudRewardResult = {
  success: boolean;
  already_processed: boolean;
  xp_gained: number;
  level: number;
  xp: number;
  rank: string;
  did_level_up: boolean;
  levels_gained: number;
};

export type SyncQueueItemStatus =
  | "pending"
  | "processing"
  | "retry_wait"
  | "failed_permanent"
  | "completed";

export type SyncQueueItem = {
  id: string;
  ownerType: "authenticated" | "guest";
  userId?: string | null;
  deviceId?: string;
  status: SyncQueueItemStatus;
  type: "session" | "settings" | "achievement" | "cosmetic";
  payload: any;
  attempts: number;
  createdAt: number;
  lastAttemptAt?: number;
  error?: string;
};

export type GuestMigrationResult = {
  success: boolean;
  sessionsUploaded: number;
  achievementsSynced: number;
  cosmeticsSynced: number;
  settingsMerged: boolean;
  legacyImported: boolean;
  error?: string;
};

export type SyncResult = {
  success: boolean;
  sessionsUploaded: number;
  settingsSynced: boolean;
  mergedSettings?: Settings;
  achievementsSynced: number;
  cosmeticsSynced: number;
  cloudProfile?: {
    level: number;
    xp: number;
    rank: string;
  };
  error?: string;
};
