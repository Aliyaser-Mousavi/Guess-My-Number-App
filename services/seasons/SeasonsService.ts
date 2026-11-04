// ==============================================================================
// Service: SeasonsService.ts
// Description: Client SDK for Competitive Seasons, Seasonal Events,
//              Event Challenge Progression, and Season Standings.
// ==============================================================================

import { supabase } from "@/lib/supabase";

export interface SeasonInfo {
  id: string;
  seasonNumber: number;
  title: string;
  theme: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  rewardTiers: Record<string, any>;
}

export interface PlayerSeasonStats {
  id: string;
  seasonId: string;
  userId: string;
  startRating: number;
  finalRating: number;
  peakRating: number;
  peakTier: string;
  rankedWins: number;
  rankedLosses: number;
  rewardsClaimed: boolean;
}

export interface SeasonalEventChallenge {
  id: string;
  title: string;
  desc: string;
  target: number;
  rewardXp: number;
}

export interface SeasonalEventInfo {
  id: string;
  eventId: string;
  title: string;
  subtitle: string;
  description: string;
  bannerColor: string;
  badgeIcon: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  rules: {
    minRange?: number;
    maxRange?: number;
    timeLimit?: number;
    lives?: number;
  };
  challenges: SeasonalEventChallenge[];
}

export interface UserEventProgress {
  eventId: string;
  progress: Record<string, number>;
  completedChallenges: string[];
  rewardsClaimed: boolean;
}

export class SeasonsService {
  /**
   * Fetches the current active competitive season.
   */
  static async fetchActiveSeason(): Promise<SeasonInfo | null> {
    try {
      const { data, error } = await supabase
        .from("competitive_seasons")
        .select("*")
        .eq("is_active", true)
        .order("season_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        // Fallback deterministic active season configuration
        return {
          id: "season_1",
          seasonNumber: 1,
          title: "Season 1: Neon Genesis",
          theme: "Cyber Grid",
          startsAt: new Date(Date.now() - 259200000).toISOString(),
          endsAt: new Date(Date.now() + 2332800000).toISOString(),
          isActive: true,
          rewardTiers: {
            grandmaster: { badge: "gm_season", xp: 2500 },
            master: { badge: "master_season", xp: 1500 },
            diamond: { badge: "diamond_season", xp: 1000 },
            platinum: { xp: 600 },
            gold: { xp: 400 },
            silver: { xp: 200 },
            bronze: { xp: 100 },
          },
        };
      }

      return {
        id: data.id,
        seasonNumber: data.season_number,
        title: data.title,
        theme: data.theme,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        isActive: data.is_active,
        rewardTiers: data.reward_tiers || {},
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetches the user's specific season statistics.
   */
  static async fetchPlayerSeasonStats(seasonId: string, userId: string): Promise<PlayerSeasonStats | null> {
    try {
      const { data, error } = await supabase
        .from("player_season_stats")
        .select("*")
        .eq("season_id", seasonId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        seasonId: data.season_id,
        userId: data.user_id,
        startRating: data.start_rating,
        finalRating: data.final_rating,
        peakRating: data.peak_rating,
        peakTier: data.peak_tier,
        rankedWins: data.ranked_wins,
        rankedLosses: data.ranked_losses,
        rewardsClaimed: data.rewards_claimed,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetches active limited-time seasonal events.
   */
  static async fetchActiveEvents(): Promise<SeasonalEventInfo[]> {
    try {
      const { data, error } = await supabase
        .from("seasonal_events")
        .select("*")
        .eq("is_active", true)
        .order("starts_at", { ascending: false });

      if (error || !data || data.length === 0) {
        // Fallback deterministic seasonal events
        return [
          {
            id: "event_cyber_breach",
            eventId: "event_cyber_breach",
            title: "Cyber Breach Protocol",
            subtitle: "Limited-Time Grid Infiltration",
            description: "Compete under high-speed firewall conditions. Solve encrypted numerical targets with binary efficiency.",
            bannerColor: "#00D2B4",
            badgeIcon: "shield-half",
            startsAt: new Date(Date.now() - 172800000).toISOString(),
            endsAt: new Date(Date.now() + 1036800000).toISOString(),
            isActive: true,
            rules: { minRange: 1, maxRange: 150, timeLimit: 45, lives: 6 },
            challenges: [
              { id: "win_3_events", title: "Firewall Bypass", desc: "Win 3 event matches", target: 3, rewardXp: 350 },
              { id: "solve_under_5_rounds", title: "Binary Surgeon", desc: "Solve in 5 or fewer rounds", target: 1, rewardXp: 500 },
              { id: "streak_2", title: "Overclocked", desc: "Achieve a 2-game win streak", target: 2, rewardXp: 400 },
            ],
          },
        ];
      }

      return data.map((d: any) => ({
        id: d.id,
        eventId: d.event_id,
        title: d.title,
        subtitle: d.subtitle,
        description: d.description,
        bannerColor: d.banner_color || "#00D2B4",
        badgeIcon: d.badge_icon || "sparkles",
        startsAt: d.starts_at,
        endsAt: d.ends_at,
        isActive: d.is_active,
        rules: d.rules || {},
        challenges: Array.isArray(d.challenges) ? d.challenges : [],
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetches the user's progress for a specific seasonal event.
   */
  static async fetchUserEventProgress(eventId: string, userId: string): Promise<UserEventProgress | null> {
    try {
      const { data, error } = await supabase
        .from("user_event_progress")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) {
        return {
          eventId,
          progress: {},
          completedChallenges: [],
          rewardsClaimed: false,
        };
      }

      return {
        eventId: data.event_id,
        progress: data.progress || {},
        completedChallenges: data.completed_challenges || [],
        rewardsClaimed: data.rewards_claimed,
      };
    } catch {
      return null;
    }
  }
}

