// Khmer Pinpeat & Ambient BGM Track Synthesizers for Ouk Chaktrang
// 100% offline, zero-network, buffer-based Web Audio generation with authentic Khmer modal tunings.
// Low-allocation architecture: loops are pre-rendered into AudioBuffers to prevent live AudioNode churn.

const khmerAudioUrl = new URL("../../assets/khmer-audio-new.mp3", import.meta.url).href;

export interface BgmTrack {
  id: string;
  name: string;
  description: string;
  bpm: number;
  totalSteps: number;
  audioUrl?: string;
  renderToBuffer?: (ctx: AudioContext) => Promise<AudioBuffer | null>;
  playStep?: (ctx: AudioContext, destination: AudioNode, step: number, vol: number) => void;
}

// Khmer Pentatonic / Heptatonic Scales (in Hz)
// Roneat Ek & Kong Vong authentic tonal centers
export const KHMER_SCALE_D = [
  146.83, // D3
  164.81, // E3
  196.0, // G3
  220.0, // A3
  246.94, // B3
  293.66, // D4
  329.63, // E4
  369.99, // F#4
  392.0, // G4
  440.0, // A4
  493.88, // B4
  587.33, // D5
  659.25, // E5
];

export const KHMER_SCALE_F = [
  174.61, // F3
  196.0, // G3
  220.0, // A3
  261.63, // C4
  293.66, // D4
  349.23, // F4
  392.0, // G4
  440.0, // A4
  523.25, // C5
  587.33, // D5
];

// Helper: Play a warm wooden mallet strike (Roneat style)
export function playRoneatTone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  time: number,
  duration: number,
  gainLevel: number,
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq * 3, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.onended = () => {
      try {
        osc.disconnect();
      } catch {
        /* ignore */
      }
      try {
        filter.disconnect();
      } catch {
        /* ignore */
      }
      try {
        gain.disconnect();
      } catch {
        /* ignore */
      }
    };

    osc.start(time);
    osc.stop(time + duration + 0.05);
  } catch {
    /* ignore */
  }
}

// Helper: Play a resonant bronze gong tone (Kong Vong style)
export function playKongVongTone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  time: number,
  duration: number,
  gainLevel: number,
) {
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 2.02, time); // subtle metallic overtone

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    let endedCount = 0;
    const cleanup = () => {
      endedCount++;
      if (endedCount >= 2) {
        try {
          osc1.disconnect();
        } catch {
          /* ignore */
        }
        try {
          osc2.disconnect();
        } catch {
          /* ignore */
        }
        try {
          gain.disconnect();
        } catch {
          /* ignore */
        }
      }
    };
    osc1.onended = cleanup;
    osc2.onended = cleanup;

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
  } catch {
    /* ignore */
  }
}

// Helper: Play gentle Chhing chime (temple bronze cymbals)
export function playChhing(ctx: AudioContext, dest: AudioNode, time: number, gainLevel: number) {
  try {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(3520, time); // A7 high harmonic

    filter.type = "highpass";
    filter.frequency.setValueAtTime(2500, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(gainLevel * 0.35, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.onended = () => {
      try {
        osc.disconnect();
      } catch {
        /* ignore */
      }
      try {
        filter.disconnect();
      } catch {
        /* ignore */
      }
      try {
        gain.disconnect();
      } catch {
        /* ignore */
      }
    };

    osc.start(time);
    osc.stop(time + 0.65);
  } catch {
    /* ignore */
  }
}

// Render a single track's step to an AudioNode
function renderStep(
  trackId: string,
  ctx: AudioContext,
  dest: AudioNode,
  step: number,
  time: number,
  vol: number,
) {
  if (trackId === "angkor_dawn") {
    if (step === 0 || step === 16) {
      playKongVongTone(ctx, dest, KHMER_SCALE_D[0], time, 3.8, vol * 0.45);
      playKongVongTone(ctx, dest, KHMER_SCALE_D[3], time + 0.05, 3.2, vol * 0.35);
    }
    if (step % 8 === 0) {
      playChhing(ctx, dest, time, vol * 0.3);
    }
    const melodyMap: Record<number, number> = {
      0: KHMER_SCALE_D[5],
      2: KHMER_SCALE_D[7],
      4: KHMER_SCALE_D[8],
      6: KHMER_SCALE_D[9],
      8: KHMER_SCALE_D[11],
      10: KHMER_SCALE_D[9],
      12: KHMER_SCALE_D[8],
      14: KHMER_SCALE_D[6],
      16: KHMER_SCALE_D[5],
      18: KHMER_SCALE_D[8],
      20: KHMER_SCALE_D[9],
      22: KHMER_SCALE_D[11],
      24: KHMER_SCALE_D[12],
      26: KHMER_SCALE_D[11],
      28: KHMER_SCALE_D[9],
      30: KHMER_SCALE_D[7],
    };
    if (melodyMap[step]) {
      playRoneatTone(ctx, dest, melodyMap[step], time, 0.9, vol * 0.5);
    }
  } else if (trackId === "royal_khmer") {
    if (step % 8 === 0) {
      const root = step % 16 === 0 ? KHMER_SCALE_F[0] : KHMER_SCALE_F[3];
      playKongVongTone(ctx, dest, root, time, 2.5, vol * 0.5);
      playChhing(ctx, dest, time, vol * 0.4);
    }
    const notes: Record<number, number> = {
      0: KHMER_SCALE_F[5],
      2: KHMER_SCALE_F[6],
      4: KHMER_SCALE_F[7],
      6: KHMER_SCALE_F[8],
      8: KHMER_SCALE_F[9],
      10: KHMER_SCALE_F[8],
      12: KHMER_SCALE_F[7],
      14: KHMER_SCALE_F[6],
      16: KHMER_SCALE_F[7],
      18: KHMER_SCALE_F[8],
      20: KHMER_SCALE_F[9],
      22: KHMER_SCALE_F[8],
      24: KHMER_SCALE_F[7],
      26: KHMER_SCALE_F[6],
      28: KHMER_SCALE_F[5],
      30: KHMER_SCALE_F[4],
    };
    if (notes[step]) {
      playRoneatTone(ctx, dest, notes[step], time, 0.8, vol * 0.45);
    }
  } else if (trackId === "temple_garden") {
    if (step === 0 || step === 12) {
      playKongVongTone(ctx, dest, 130.81, time, 4.2, vol * 0.4);
    }
    if (step % 6 === 0) {
      playChhing(ctx, dest, time, vol * 0.25);
    }
    const notes: Record<number, number> = {
      0: 261.63,
      3: 329.63,
      6: 392.0,
      9: 440.0,
      12: 523.25,
      15: 440.0,
      18: 392.0,
      21: 329.63,
    };
    if (notes[step]) {
      playRoneatTone(ctx, dest, notes[step], time, 1.4, vol * 0.4);
    }
  } else if (trackId === "ouk_chaktrang") {
    if (step % 8 === 0) {
      playKongVongTone(ctx, dest, 146.83, time, 2.2, vol * 0.55);
      playChhing(ctx, dest, time, vol * 0.35);
    }
    const notes: Record<number, number> = {
      0: 293.66,
      2: 349.23,
      4: 392.0,
      6: 440.0,
      8: 523.25,
      10: 440.0,
      12: 392.0,
      14: 349.23,
      16: 392.0,
      18: 440.0,
      20: 523.25,
      22: 587.33,
      24: 523.25,
      26: 440.0,
      28: 392.0,
      30: 293.66,
    };
    if (notes[step]) {
      playRoneatTone(ctx, dest, notes[step], time, 0.75, vol * 0.45);
    }
  }
}

// In-memory buffer cache for pre-rendered tracks
const trackBufferCache = new Map<string, AudioBuffer>();

// Pre-render a full BGM track loop into an AudioBuffer using OfflineAudioContext
export async function getRenderedTrackBuffer(
  ctx: AudioContext,
  track: BgmTrack,
): Promise<AudioBuffer | null> {
  const sampleRate = ctx.sampleRate || 44100;
  const cacheKey = `${track.id}_${sampleRate}`;

  if (trackBufferCache.has(cacheKey)) {
    return trackBufferCache.get(cacheKey)!;
  }

  // Attempt to fetch & decode authentic audio file if available
  if (track.audioUrl && typeof fetch !== "undefined") {
    try {
      const response = await fetch(track.audioUrl);
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuf);
        if (decodedBuffer) {
          trackBufferCache.set(cacheKey, decodedBuffer);
          return decodedBuffer;
        }
      }
    } catch (err) {
      console.warn(`[tracks] Asset decode failed for ${track.id}, using procedural render:`, err);
    }
  }

  const stepDuration = 60 / track.bpm / 2;
  const totalDuration = stepDuration * track.totalSteps;
  const totalFrames = Math.ceil(sampleRate * totalDuration);

  const OfflineCtxClass =
    typeof window !== "undefined"
      ? window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
          .webkitOfflineAudioContext
      : null;

  if (!OfflineCtxClass) {
    return null;
  }

  try {
    const offlineCtx = new OfflineCtxClass(2, totalFrames, sampleRate);
    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, 0);
    masterGain.connect(offlineCtx.destination);

    for (let step = 0; step < track.totalSteps; step++) {
      const stepTime = step * stepDuration;
      renderStep(track.id, offlineCtx as unknown as AudioContext, masterGain, step, stepTime, 1.0);
    }

    const renderedBuffer = await offlineCtx.startRendering();
    trackBufferCache.set(cacheKey, renderedBuffer);
    return renderedBuffer;
  } catch (err) {
    console.warn(`[tracks] Offline render failed for track ${track.id}:`, err);
    return null;
  }
}

export const BGM_TRACKS: Record<string, BgmTrack> = {
  angkor_dawn: {
    id: "angkor_dawn",
    name: "Angkor Dawn",
    description:
      "Calm traditional Pinpeat atmosphere with gentle Roneat Ek melody and Kong Vong resonance.",
    bpm: 54,
    totalSteps: 32,
    audioUrl: khmerAudioUrl,
    playStep: (ctx, dest, step, vol) =>
      renderStep("angkor_dawn", ctx, dest, step, ctx.currentTime, vol),
    renderToBuffer: (ctx) => getRenderedTrackBuffer(ctx, BGM_TRACKS.angkor_dawn),
  },

  royal_khmer: {
    id: "royal_khmer",
    name: "Royal Khmer",
    description:
      "Elegant Khmer palace ensemble with steady Chhing cadence and flowing Kong Touch flourishes.",
    bpm: 60,
    totalSteps: 32,
    playStep: (ctx, dest, step, vol) =>
      renderStep("royal_khmer", ctx, dest, step, ctx.currentTime, vol),
    renderToBuffer: (ctx) => getRenderedTrackBuffer(ctx, BGM_TRACKS.royal_khmer),
  },

  temple_garden: {
    id: "temple_garden",
    name: "Temple Garden",
    description: "Peaceful bamboo Roneat Thung meditation ambiance with serene temple bells.",
    bpm: 46,
    totalSteps: 24,
    playStep: (ctx, dest, step, vol) =>
      renderStep("temple_garden", ctx, dest, step, ctx.currentTime, vol),
    renderToBuffer: (ctx) => getRenderedTrackBuffer(ctx, BGM_TRACKS.temple_garden),
  },

  ouk_chaktrang: {
    id: "ouk_chaktrang",
    name: "Ouk Chaktrang",
    description:
      "Focused tournament match atmosphere with solemn bronze and rhythmic Pinpeat cadence.",
    bpm: 64,
    totalSteps: 32,
    playStep: (ctx, dest, step, vol) =>
      renderStep("ouk_chaktrang", ctx, dest, step, ctx.currentTime, vol),
    renderToBuffer: (ctx) => getRenderedTrackBuffer(ctx, BGM_TRACKS.ouk_chaktrang),
  },
};
