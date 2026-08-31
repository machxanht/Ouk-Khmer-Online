// Centralized Audio Manager for Khmer Ouk Chaktrang
// Unified singleton governing buffer-based Web Audio BGM and low-latency SFX
// Low-allocation architecture: AudioBuffers are looped via AudioBufferSourceNode without live timer churn.

import { playProceduralSfx, type SfxType } from "./sfx";
import { BGM_TRACKS, getRenderedTrackBuffer, type BgmTrack } from "./tracks";

class AudioManager {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;

  private sfxEnabled: boolean = true;
  private sfxVolume: number = 0.7;

  private currentTrackId: string = "angkor_dawn";
  private currentlyPlayingTrackId: string | null = null;
  private musicVolume: number = 0.4;
  private isBgmPlaying: boolean = false;
  private bgmRequestId: number = 0;

  private loopTimer: number | null = null;
  private currentStep: number = 0;
  private unlockListenerAttached: boolean = false;
  private isRenderingBuffer: boolean = false;

  constructor() {
    this.attachUnlockListeners();
  }

  // Ensure AudioContext is initialized safely upon first user interaction
  public getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.ctx) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();

          this.bgmGain = this.ctx.createGain();
          this.bgmGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
          this.bgmGain.connect(this.ctx.destination);

          this.sfxGain = this.ctx.createGain();
          this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
          this.sfxGain.connect(this.ctx.destination);
        }
      } catch (err) {
        console.warn("[AudioManager] Failed to initialize AudioContext:", err);
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private attachUnlockListeners() {
    if (typeof window === "undefined" || this.unlockListenerAttached) return;

    const unlock = () => {
      const ctx = this.getAudioContext();
      if (ctx) {
        if (ctx.state === "suspended") {
          ctx
            .resume()
            .then(() => {
              if (
                this.isBgmPlaying &&
                this.currentTrackId !== "off" &&
                this.ctx?.state === "running" &&
                !this.bgmSource
              ) {
                this.startBgmPlayback();
              }
            })
            .catch(() => {});
        } else if (ctx.state === "running") {
          if (this.isBgmPlaying && this.currentTrackId !== "off" && !this.bgmSource) {
            this.startBgmPlayback();
          }
        }
      }
    };

    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    this.unlockListenerAttached = true;

    // Handle mobile WebView foreground resume
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
          }
        }
      });
    }
  }

  // --- Sound Effects (SFX) ---
  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  public getSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.sfxGain) {
      try {
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      } catch {
        /* ignore */
      }
    }
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public playSfx(type: SfxType) {
    if (!this.sfxEnabled || this.sfxVolume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    playProceduralSfx(ctx, type, this.sfxVolume);
  }

  // --- Background Music (BGM) ---
  public setBgmTrack(trackId: string) {
    const prevTrack = this.currentTrackId;
    this.currentTrackId = trackId;
    if (trackId === "off") {
      this.stopBgm();
    } else {
      this.currentStep = 0;
      if (this.isBgmPlaying && (prevTrack !== trackId || !this.bgmSource)) {
        this.startBgm();
      }
    }
  }

  public getBgmTrack(): string {
    return this.currentTrackId;
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.bgmGain) {
      try {
        this.bgmGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      } catch {
        /* ignore */
      }
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public isBgmActive(): boolean {
    return this.isBgmPlaying && this.bgmSource !== null;
  }

  public startBgm() {
    if (this.currentTrackId === "off") {
      this.stopBgm();
      return;
    }
    this.isBgmPlaying = true;
    // If already playing the desired track, do not trigger a duplicate render/play sequence
    if (this.bgmSource && this.currentlyPlayingTrackId === this.currentTrackId) {
      return;
    }
    this.startBgmPlayback();
  }

  public pauseBgm() {
    this.isBgmPlaying = false;
    this.stopBgmSource();
  }

  public resumeBgm() {
    if (this.currentTrackId !== "off") {
      this.isBgmPlaying = true;
      if (!this.bgmSource || this.currentlyPlayingTrackId !== this.currentTrackId) {
        this.startBgmPlayback();
      }
    }
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    this.bgmRequestId++; // Invalidate pending buffer decodes
    this.stopBgmSource();
    this.currentStep = 0;
  }

  private stopBgmSource() {
    this.clearLoopTimer();
    this.currentlyPlayingTrackId = null;
    if (this.bgmSource) {
      const source = this.bgmSource;
      this.bgmSource = null;
      try {
        source.stop();
      } catch {
        /* ignore */
      }
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
    }
  }

  private clearLoopTimer() {
    if (this.loopTimer !== null) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  // Start low-allocation buffer-based looping BGM with single-instance guarantee
  private async startBgmPlayback() {
    const requestId = ++this.bgmRequestId;
    this.stopBgmSource();

    if (!this.isBgmPlaying || this.currentTrackId === "off") return;

    const track = BGM_TRACKS[this.currentTrackId];
    if (!track) return;

    const ctx = this.getAudioContext();
    if (!ctx || !this.bgmGain || ctx.state !== "running") return;

    const requestedTrackId = this.currentTrackId;

    try {
      this.isRenderingBuffer = true;
      const buffer = await getRenderedTrackBuffer(ctx, track);
      this.isRenderingBuffer = false;

      // Verify request hasn't been superseded by a newer start/stop/switch call
      if (
        requestId !== this.bgmRequestId ||
        !this.isBgmPlaying ||
        this.currentTrackId !== requestedTrackId ||
        ctx.state !== "running"
      ) {
        return;
      }

      if (buffer) {
        // High-efficiency AudioBufferSourceNode loop - ensure only 1 node active
        this.stopBgmSource();

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(this.bgmGain);
        source.start(0);

        source.onended = () => {
          try {
            source.disconnect();
          } catch {
            /* ignore */
          }
          if (this.bgmSource === source) {
            this.bgmSource = null;
            this.currentlyPlayingTrackId = null;
          }
        };

        this.bgmSource = source;
        this.currentlyPlayingTrackId = requestedTrackId;
      }
    } catch (err) {
      console.warn("[AudioManager] Buffer playback error:", err);
    }
  }

  public cleanup() {
    this.stopBgmSource();
    if (this.ctx) {
      try {
        this.ctx.close().catch(() => {});
      } catch {
        /* ignore */
      }
      this.ctx = null;
      this.bgmGain = null;
      this.sfxGain = null;
    }
  }
}

export const audioManager = new AudioManager();
