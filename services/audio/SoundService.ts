import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Platform } from "react-native";

export type SoundEffect =
  | "button_click"
  | "guess_submit"
  | "guess_correct"
  | "guess_wrong"
  | "victory"
  | "defeat"
  | "achievement"
  | "hot"
  | "cold";

class SoundServiceImpl {
  private enabled: boolean = true;
  private volume: number = 0.8;
  private webAudioCtx: any = null;

  constructor() {
    this.init();
  }

  private init() {
    if (Platform.OS === "web") {
      try {
        const AudioContextClass =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.webAudioCtx = new AudioContextClass();
        }
      } catch {
        // Web audio context not available
      }
    } else {
      // Configure audio mode for native via expo-audio
      setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "duckOthers",
      }).catch(() => {});
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public async play(effect: SoundEffect): Promise<void> {
    if (!this.enabled || this.volume <= 0) return;

    if (Platform.OS === "web" && this.webAudioCtx) {
      this.playWebTone(effect);
      return;
    }

    // Native playback via expo-audio
    try {
      await this.playNativeTone(effect);
    } catch {
      // Graceful silence on error
    }
  }

  private playWebTone(effect: SoundEffect) {
    try {
      const ctx = this.webAudioCtx;
      if (!ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const vol = this.volume;

      switch (effect) {
        case "button_click": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
          gain.gain.setValueAtTime(0.3 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        case "guess_submit": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(550, now + 0.06);
          gain.gain.setValueAtTime(0.35 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }

        case "guess_correct": {
          // Major triad (C5, E5, G5)
          const notes = [523.25, 659.25, 783.99];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.08;
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.4 * vol, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.22);
          });
          break;
        }

        case "guess_wrong": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
          gain.gain.setValueAtTime(0.25 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }

        case "victory": {
          // Ascending fanfare (C5, E5, G5, C6)
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.1;
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.45 * vol, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.38);
          });
          break;
        }

        case "defeat": {
          // Descending melancholic notes
          const notes = [392.0, 349.23, 311.13, 261.63];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.12;
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.3 * vol, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.28);
          });
          break;
        }

        case "achievement": {
          const notes = [587.33, 880.0, 1174.66];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.09;
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.4 * vol, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.32);
          });
          break;
        }

        case "hot": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(500, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
          gain.gain.setValueAtTime(0.2 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case "cold": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);
          gain.gain.setValueAtTime(0.25 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }
      }
    } catch {
      // AudioContext interrupted or not allowed yet
    }
  }

  private async playNativeTone(effect: SoundEffect): Promise<void> {
    // Generate an in-memory data URI sound for native expo-audio
    const uri = this.generateToneWavUri(effect);
    if (!uri) return;

    try {
      const player = createAudioPlayer({ uri });
      player.volume = this.volume;

      const subscription = player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          subscription.remove();
          player.remove();
        }
      });

      player.play();
    } catch {
      // Fallback
    }
  }

  /**
   * Generates a tiny valid 8-bit mono WAV data URI in memory for zero-dependency native audio.
   */
  private generateToneWavUri(effect: SoundEffect): string {
    const sampleRate = 8000;
    let durationSec = 0.08;
    let freqStart = 440;
    let freqEnd = 440;

    switch (effect) {
      case "button_click":
        durationSec = 0.04;
        freqStart = 650;
        freqEnd = 350;
        break;
      case "guess_submit":
        durationSec = 0.06;
        freqStart = 440;
        freqEnd = 550;
        break;
      case "guess_correct":
      case "victory":
      case "achievement":
        durationSec = 0.2;
        freqStart = 523;
        freqEnd = 784;
        break;
      case "guess_wrong":
      case "defeat":
        durationSec = 0.15;
        freqStart = 240;
        freqEnd = 140;
        break;
      case "hot":
        durationSec = 0.1;
        freqStart = 600;
        freqEnd = 900;
        break;
      case "cold":
        durationSec = 0.1;
        freqStart = 500;
        freqEnd = 250;
        break;
    }

    const numSamples = Math.floor(sampleRate * durationSec);
    const wavData = new Uint8Array(44 + numSamples);

    // RIFF header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        wavData[offset + i] = str.charCodeAt(i);
      }
    };
    const writeUint32 = (offset: number, val: number) => {
      wavData[offset] = val & 0xff;
      wavData[offset + 1] = (val >> 8) & 0xff;
      wavData[offset + 2] = (val >> 16) & 0xff;
      wavData[offset + 3] = (val >> 24) & 0xff;
    };
    const writeUint16 = (offset: number, val: number) => {
      wavData[offset] = val & 0xff;
      wavData[offset + 1] = (val >> 8) & 0xff;
    };

    writeString(0, "RIFF");
    writeUint32(4, 36 + numSamples);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    writeUint32(16, 16); // PCM chunk size
    writeUint16(20, 1); // Audio format 1 = PCM
    writeUint16(22, 1); // 1 channel
    writeUint32(24, sampleRate);
    writeUint32(28, sampleRate); // Byte rate
    writeUint16(32, 1); // Block align
    writeUint16(34, 8); // Bits per sample
    writeString(36, "data");
    writeUint32(40, numSamples);

    // Synthesize sine sample sweep
    for (let i = 0; i < numSamples; i++) {
      const progress = i / numSamples;
      const currentFreq = freqStart + (freqEnd - freqStart) * progress;
      const angle = (2 * Math.PI * currentFreq * i) / sampleRate;
      const envelope = 1 - progress; // Exponential decay
      const val = Math.floor(128 + 120 * envelope * Math.sin(angle));
      wavData[44 + i] = Math.max(0, Math.min(255, val));
    }

    // Convert to base64
    const len = wavData.byteLength;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let base64 = "";
    if (typeof btoa !== "undefined") {
      let binary = "";
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(wavData[i]);
      }
      base64 = btoa(binary);
    } else {
      let i = 0;
      while (i < len) {
        const b1 = wavData[i++];
        const b2 = i < len ? wavData[i++] : 0;
        const b3 = i < len ? wavData[i++] : 0;
        base64 += chars[b1 >> 2];
        base64 += chars[((b1 & 3) << 4) | (b2 >> 4)];
        base64 += i - 1 < len ? chars[((b2 & 15) << 2) | (b3 >> 6)] : "=";
        base64 += i < len ? chars[b3 & 63] : "=";
      }
    }

    return `data:audio/wav;base64,${base64}`;
  }
}

export const SoundService = new SoundServiceImpl();
