// Procedural Web Audio Sound Effects for Khmer Ouk Chaktrang
// 100% offline, zero-dependency, ultra-low latency, and safe for all WebView environments.

export type SfxType =
  | "move"
  | "capture"
  | "check"
  | "checkmate"
  | "promotion"
  | "ui_click"
  | "resignation"
  | "timeout"
  | "draw"
  | "victory"
  | "defeat"
  | "countdown_warning";

export function playProceduralSfx(ctx: AudioContext, type: SfxType, masterVolume: number): void {
  try {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const t0 = ctx.currentTime;
    const vol = Math.max(0, Math.min(1, masterVolume));

    switch (type) {
      case "move": {
        // Authentic wooden piece placement on board
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.setValueAtTime(280, t0);
        osc.frequency.exponentialRampToValueAtTime(80, t0 + 0.06);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, t0);

        gain.gain.setValueAtTime(vol * 0.7, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

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

        osc.start(t0);
        osc.stop(t0 + 0.07);

        // Subtle wooden tap noise
        const bufferSize = ctx.sampleRate * 0.02;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(1200, t0);
        noiseFilter.Q.setValueAtTime(3, t0);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(vol * 0.4, t0);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.025);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noise.onended = () => {
          try {
            noise.disconnect();
          } catch {
            /* ignore */
          }
          try {
            noiseFilter.disconnect();
          } catch {
            /* ignore */
          }
          try {
            noiseGain.disconnect();
          } catch {
            /* ignore */
          }
        };

        noise.start(t0);
        noise.stop(t0 + 0.03);
        break;
      }

      case "capture": {
        // Resonant wood-on-wood impact with deeper body
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(340, t0);
        osc1.frequency.exponentialRampToValueAtTime(60, t0 + 0.09);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(180, t0);
        osc2.frequency.exponentialRampToValueAtTime(40, t0 + 0.1);

        gain.gain.setValueAtTime(vol * 0.9, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

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

        osc1.start(t0);
        osc2.start(t0);
        osc1.stop(t0 + 0.11);
        osc2.stop(t0 + 0.11);
        break;
      }

      case "check": {
        // Traditional Khmer bronze chime warning (Ouk!)
        const freqs = [587.33, 880.0]; // D5, A5
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t0 + idx * 0.08);

          gain.gain.setValueAtTime(0, t0 + idx * 0.08);
          gain.gain.linearRampToValueAtTime(vol * 0.6, t0 + idx * 0.08 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.08 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.onended = () => {
            try {
              osc.disconnect();
            } catch {
              /* ignore */
            }
            try {
              gain.disconnect();
            } catch {
              /* ignore */
            }
          };

          osc.start(t0 + idx * 0.08);
          osc.stop(t0 + idx * 0.08 + 0.36);
        });
        break;
      }

      case "checkmate": {
        // Deep Khmer temple gong reverberation (Ouk Ngueb!)
        const gongHarmonics = [146.83, 293.66, 440.0, 587.33]; // D3, D4, A4, D5
        gongHarmonics.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = idx % 2 === 0 ? "sine" : "triangle";
          osc.frequency.setValueAtTime(f, t0);

          const intensity = vol * (0.8 / (idx + 1));
          gain.gain.setValueAtTime(0, t0);
          gain.gain.linearRampToValueAtTime(intensity, t0 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.onended = () => {
            try {
              osc.disconnect();
            } catch {
              /* ignore */
            }
            try {
              gain.disconnect();
            } catch {
              /* ignore */
            }
          };

          osc.start(t0);
          osc.stop(t0 + 1.25);
        });
        break;
      }

      case "promotion": {
        // Ascending bright chime for Trey Bork
        const notes = [440, 554.37, 659.25]; // A4, C#5, E5
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t0 + idx * 0.07);

          gain.gain.setValueAtTime(0, t0 + idx * 0.07);
          gain.gain.linearRampToValueAtTime(vol * 0.6, t0 + idx * 0.07 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.07 + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.onended = () => {
            try {
              osc.disconnect();
            } catch {
              /* ignore */
            }
            try {
              gain.disconnect();
            } catch {
              /* ignore */
            }
          };

          osc.start(t0 + idx * 0.07);
          osc.stop(t0 + idx * 0.07 + 0.3);
        });
        break;
      }

      case "ui_click": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(800, t0);
        osc.frequency.exponentialRampToValueAtTime(400, t0 + 0.03);

        gain.gain.setValueAtTime(vol * 0.3, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
          } catch {
            /* ignore */
          }
          try {
            gain.disconnect();
          } catch {
            /* ignore */
          }
        };

        osc.start(t0);
        osc.stop(t0 + 0.035);
        break;
      }

      case "resignation": {
        const notes = [440, 370, 311];
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t0 + idx * 0.09);

          gain.gain.setValueAtTime(0, t0 + idx * 0.09);
          gain.gain.linearRampToValueAtTime(vol * 0.5, t0 + idx * 0.09 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.09 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.onended = () => {
            try {
              osc.disconnect();
            } catch {
              /* ignore */
            }
            try {
              gain.disconnect();
            } catch {
              /* ignore */
            }
          };

          osc.start(t0 + idx * 0.09);
          osc.stop(t0 + idx * 0.09 + 0.36);
        });
        break;
      }

      case "timeout": {
        // Double urgent gong
        [0, 0.15].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(260, t0 + offset);

          gain.gain.setValueAtTime(0, t0 + offset);
          gain.gain.linearRampToValueAtTime(vol * 0.7, t0 + offset + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + offset + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.onended = () => {
            try {
              osc.disconnect();
            } catch {
              /* ignore */
            }
            try {
              gain.disconnect();
            } catch {
              /* ignore */
            }
          };

          osc.start(t0 + offset);
          osc.stop(t0 + offset + 0.42);
        });
        break;
      }

      case "draw": {
        const notes = [392, 440]; // G4, A4
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t0 + idx * 0.12);

          gain.gain.setValueAtTime(0, t0 + idx * 0.12);
          gain.gain.linearRampToValueAtTime(vol * 0.5, t0 + idx * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.12 + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.onended = () => {
            try {
              osc.disconnect();
            } catch {
              /* ignore */
            }
            try {
              gain.disconnect();
            } catch {
              /* ignore */
            }
          };

          osc.start(t0 + idx * 0.12);
          osc.stop(t0 + idx * 0.12 + 0.47);
        });
        break;
      }

      case "victory": {
        // Royal Khmer ascending flourish
        const notes = [293.66, 369.99, 440.0, 587.33]; // D4, F#4, A4, D5
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t0 + idx * 0.1);

          gain.gain.setValueAtTime(0, t0 + idx * 0.1);
          gain.gain.linearRampToValueAtTime(vol * 0.7, t0 + idx * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.1 + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.onended = () => {
            try {
              osc.disconnect();
            } catch {
              /* ignore */
            }
            try {
              gain.disconnect();
            } catch {
              /* ignore */
            }
          };

          osc.start(t0 + idx * 0.1);
          osc.stop(t0 + idx * 0.1 + 0.65);
        });
        break;
      }

      case "defeat": {
        const notes = [329.63, 293.66, 220.0]; // E4, D4, A3
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t0 + idx * 0.14);

          gain.gain.setValueAtTime(0, t0 + idx * 0.14);
          gain.gain.linearRampToValueAtTime(vol * 0.5, t0 + idx * 0.14 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.14 + 0.5);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.onended = () => {
            try {
              osc.disconnect();
            } catch {
              /* ignore */
            }
            try {
              gain.disconnect();
            } catch {
              /* ignore */
            }
          };

          osc.start(t0 + idx * 0.14);
          osc.stop(t0 + idx * 0.14 + 0.55);
        });
        break;
      }

      case "countdown_warning": {
        // High-clarity subtle wood-bell chime pulse for urgency
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, t0); // A5
        osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.08);

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.6, t0 + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
          } catch {
            /* ignore */
          }
          try {
            gain.disconnect();
          } catch {
            /* ignore */
          }
        };

        osc.start(t0);
        osc.stop(t0 + 0.13);
        break;
      }
    }
  } catch {
    // Gracefully swallow audio context errors to protect game stability
  }
}
