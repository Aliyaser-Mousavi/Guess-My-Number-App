# MarsGuess 🚀

> **MarsGuess** is a feature-packed, server-authoritative competitive numerical strategy mobile game built with **React Native (Expo)** and **Supabase**.

---

## 🎮 Overview

MarsGuess blends classic number deduction with modern competitive mobile mechanics:
- **Core Modes**: Oracle (AI Guess), You Guess (Player Guess), Custom Setup, and Pass & Play.
- **Specialized Arcade Modes**: Time Attack, Survival, Blitz, and Constrained Logic Puzzles.
- **Online Multiplayer (1v1)**: Real-time skill-based matchmaking, private room codes, and synchronized live battles.
- **Competitive Seasons & Tournaments**: MMR/CR ratings, seasonal events with soft-resets, weekly Oracle championships with limited attempts.
- **Number Academy**: Educational curriculum covering search intervals, binary search halving, information entropy, and guided sandboxes.
- **AI Strategy Coach**: Real-time gameplay analytics, personal efficiency score ($0\text{–}100$), bisection telemetry, and tailored weakness drills.
- **Cross-Platform & Offline-First**: Optimistic Concurrency Control (OCC) cloud sync with 100% playable offline guest support.

---

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo (SDK 58), Expo Router, React Native Reanimated.
- **Backend / Database**: Supabase (PostgreSQL), Row Level Security (RLS), Edge Functions, Realtime.
- **Languages**: TypeScript, PostgreSQL PL/pgSQL.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Development Server
```bash
npx expo start
```
