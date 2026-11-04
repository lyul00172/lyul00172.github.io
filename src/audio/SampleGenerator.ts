/**
 * Procedural Audio Synthesizer for AKAI MPC Live II
 * Generates punchy, studio-grade drum and instrument samples directly into AudioBuffers.
 * 100% offline, zero network dependencies, pristine 44.1kHz audio quality.
 */

export class SampleGenerator {
  private ctx: AudioContext | OfflineAudioContext;

  constructor(ctx?: AudioContext) {
    this.ctx = ctx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }

  /**
   * Helper to render using an OfflineAudioContext for deterministic, artifact-free synthesis
   */
  private async renderOffline(duration: number, buildGraph: (offlineCtx: OfflineAudioContext) => void): Promise<AudioBuffer> {
    const sampleRate = this.ctx.sampleRate || 44100;
    const length = Math.ceil(duration * sampleRate);
    const offline = new OfflineAudioContext(2, length, sampleRate);
    buildGraph(offline);
    return await offline.startRendering();
  }

  /**
   * 1. MPC Punchy Kick Drum
   */
  async generateKick(style: 'boom-bap' | '808' | '909' = 'boom-bap'): Promise<AudioBuffer> {
    const duration = style === '808' ? 0.75 : 0.45;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      // Pitch drop oscillator
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      const startFreq = style === '808' ? 140 : 175;
      const endFreq = style === '808' ? 38 : 48;
      const dropTime = style === '808' ? 0.08 : 0.045;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + dropTime);
      osc.frequency.exponentialRampToValueAtTime(30, now + duration);

      oscGain.gain.setValueAtTime(1.0, now);
      if (style === '808') {
        oscGain.gain.exponentialRampToValueAtTime(0.7, now + 0.15);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      } else {
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.95);
      }

      // Punchy click transient
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(320, now);
      clickOsc.frequency.exponentialRampToValueAtTime(50, now + 0.02);
      clickGain.gain.setValueAtTime(0.7, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      // Soft distortion curve to add rich harmonics and low-end warmth
      const waveShaper = ctx.createWaveShaper();
      const curve = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        const x = (i / 256) - 1;
        curve[i] = Math.tanh(1.4 * x);
      }
      waveShaper.curve = curve;

      osc.connect(oscGain);
      clickOsc.connect(clickGain);

      oscGain.connect(waveShaper);
      clickGain.connect(waveShaper);

      waveShaper.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
      clickOsc.start(now);
      clickOsc.stop(now + 0.03);
    });
  }

  /**
   * 2. Crisp Snare Drum with dual-tone body and snappy noise wire
   */
  async generateSnare(style: 'acoustic' | '808' | 'tight' = 'acoustic'): Promise<AudioBuffer> {
    const duration = 0.32;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;

      // 1. Body tone (Tonal component)
      const osc1 = ctx.createOscillator();
      const oscGain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(style === '808' ? 240 : 190, now);
      osc1.frequency.exponentialRampToValueAtTime(style === '808' ? 120 : 130, now + 0.05);

      oscGain1.gain.setValueAtTime(0.8, now);
      oscGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      // 2. Snare rattle / Noise component
      const bufferSize = ctx.sampleRate * duration;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(1100, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.85, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.1, now + 0.08);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(oscGain1);
      oscGain1.connect(ctx.destination);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.15);
      noise.start(now);
      noise.stop(now + duration);
    });
  }

  /**
   * 3. Closed Hi-Hat (Metallic inharmonic cluster + sizzle)
   */
  async generateClosedHat(): Promise<AudioBuffer> {
    const duration = 0.08;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      // 6 metallic square wave ratios (classic Roland 808/909 frequency ratios)
      const freqs = [263, 400, 421, 474, 587, 845];
      const masterHatGain = ctx.createGain();
      masterHatGain.gain.setValueAtTime(0.7, now);
      masterHatGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(7500, now);
      bandpass.Q.setValueAtTime(2.5, now);

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(8500, now);

      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now);
        osc.connect(bandpass);
        osc.start(now);
        osc.stop(now + duration);
      });

      // Add a bit of white noise sizzle
      const bufferSize = ctx.sampleRate * duration;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const out = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        out[i] = (Math.random() * 2 - 1) * 0.4;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.connect(bandpass);
      noise.start(now);
      noise.stop(now + duration);

      bandpass.connect(highpass);
      highpass.connect(masterHatGain);
      masterHatGain.connect(ctx.destination);
    });
  }

  /**
   * 4. Open Hi-Hat (Long metallic sizzle)
   */
  async generateOpenHat(): Promise<AudioBuffer> {
    const duration = 0.42;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      const freqs = [263, 400, 421, 474, 587, 845];
      const masterHatGain = ctx.createGain();
      masterHatGain.gain.setValueAtTime(0.65, now);
      masterHatGain.gain.exponentialRampToValueAtTime(0.15, now + 0.18);
      masterHatGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(7000, now);
      bandpass.Q.setValueAtTime(1.8, now);

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(6500, now);

      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now);
        osc.connect(bandpass);
        osc.start(now);
        osc.stop(now + duration);
      });

      const bufferSize = ctx.sampleRate * duration;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const out = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        out[i] = (Math.random() * 2 - 1) * 0.35;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.connect(bandpass);
      noise.start(now);
      noise.stop(now + duration);

      bandpass.connect(highpass);
      highpass.connect(masterHatGain);
      masterHatGain.connect(ctx.destination);
    });
  }

  /**
   * 5. Hand Clap with multi-pulse pre-bursts
   */
  async generateClap(): Promise<AudioBuffer> {
    const duration = 0.35;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      const bufferSize = ctx.sampleRate * duration;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const out = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        out[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(2.2, now);

      const gain = ctx.createGain();
      // Multi-tap trigger emulation (3 micro-claps then sustain tail)
      gain.gain.setValueAtTime(0, now);
      [0.0, 0.012, 0.024].forEach((t) => {
        gain.gain.setValueAtTime(0.7, now + t);
        gain.gain.exponentialRampToValueAtTime(0.05, now + t + 0.009);
      });
      // Main clap impact and tail
      gain.gain.setValueAtTime(0.9, now + 0.036);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    });
  }

  /**
   * 6. Wooden Rimshot
   */
  async generateRimshot(): Promise<AudioBuffer> {
    const duration = 0.12;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.03);

      oscGain.gain.setValueAtTime(0.9, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      // Sharp click
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(800, now);
      clickGain.gain.setValueAtTime(0.5, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      osc.connect(oscGain);
      click.connect(clickGain);
      oscGain.connect(ctx.destination);
      clickGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
      click.start(now);
      click.stop(now + 0.02);
    });
  }

  /**
   * 7. Shaker
   */
  async generateShaker(): Promise<AudioBuffer> {
    const duration = 0.14;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      const bufferSize = ctx.sampleRate * duration;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const out = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        out[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(6500, now);
      bandpass.Q.setValueAtTime(3.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.65, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    });
  }

  /**
   * 8, 9, 10. Tuned Toms (Low, Mid, High)
   */
  async generateTom(freq: number = 100): Promise<AudioBuffer> {
    const duration = 0.38;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.8, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + duration);

      oscGain.gain.setValueAtTime(0.9, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Thump click
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(freq * 2.5, now);
      clickGain.gain.setValueAtTime(0.4, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(oscGain);
      click.connect(clickGain);
      oscGain.connect(ctx.destination);
      clickGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
      click.start(now);
      click.stop(now + 0.03);
    });
  }

  /**
   * 11. Crash Cymbal with sparkling shimmer
   */
  async generateCrash(): Promise<AudioBuffer> {
    const duration = 1.4;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      const bufferSize = ctx.sampleRate * duration;
      const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const out = noiseBuffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
          out[i] = Math.random() * 2 - 1;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(4500, now);

      const peak = ctx.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.setValueAtTime(9000, now);
      peak.gain.setValueAtTime(5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(hp);
      hp.connect(peak);
      peak.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    });
  }

  /**
   * 12. Ride Cymbal with bell ping
   */
  async generateRide(): Promise<AudioBuffer> {
    const duration = 0.9;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      // Bell overtone
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(1820, now);
      bellGain.gain.setValueAtTime(0.5, now);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      // Sizzle wash
      const bufferSize = ctx.sampleRate * duration;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const out = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        out[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(8200, now);
      bp.Q.setValueAtTime(3.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      bell.connect(bellGain);
      bellGain.connect(ctx.destination);

      noise.connect(bp);
      bp.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      bell.start(now);
      bell.stop(now + duration);
      noise.start(now);
      noise.stop(now + duration);
    });
  }

  /**
   * 13. Fat 808 Sub Bass (Tuned to C2 - 65.4 Hz)
   */
  async generate808Sub(freq: number = 65.41): Promise<AudioBuffer> {
    const duration = 1.1;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.04);

      oscGain.gain.setValueAtTime(0.9, now);
      oscGain.gain.linearRampToValueAtTime(0.7, now + 0.2);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Subtle drive
      const drive = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1;
        curve[i] = Math.tanh(1.8 * x);
      }
      drive.curve = curve;

      osc.connect(drive);
      drive.connect(oscGain);
      oscGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  /**
   * 14. Rhodes Neo-Soul / Hip-Hop E-Piano Chord (Cm9: C, Eb, G, Bb, D)
   */
  async generateRhodesChord(): Promise<AudioBuffer> {
    const duration = 1.6;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      // C3, Eb3, G3, Bb3, D4 notes
      const notes = [130.81, 155.56, 196.00, 233.08, 293.66];
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.65, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Warm stereo chorus / filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + duration);

      notes.forEach((freq, idx) => {
        // Tine (sine fundamental) + Bar (soft 2nd/3rd harmonics)
        const fundamental = ctx.createOscillator();
        fundamental.type = 'sine';
        fundamental.frequency.setValueAtTime(freq, now);

        const tine = ctx.createOscillator();
        tine.type = 'sine';
        tine.frequency.setValueAtTime(freq * 4.02, now); // slightly detuned harmonic for metallic Rhodes tine

        const tineGain = ctx.createGain();
        tineGain.gain.setValueAtTime(0.2, now);
        tineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        const voiceGain = ctx.createGain();
        voiceGain.gain.setValueAtTime(0.3 / notes.length, now);

        fundamental.connect(voiceGain);
        tine.connect(tineGain);
        tineGain.connect(voiceGain);
        voiceGain.connect(filter);

        fundamental.start(now + idx * 0.015); // slight humanized strum
        tine.start(now + idx * 0.015);
        fundamental.stop(now + duration);
        tine.stop(now + 0.2);
      });

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);
    });
  }

  /**
   * 15. Synth Lead Stab / Brass Horns
   */
  async generateSynthStab(): Promise<AudioBuffer> {
    const duration = 0.65;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      const baseFreq = 220; // A3

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc2.frequency.setValueAtTime(baseFreq * 1.008, now); // Detuned for fatness

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4500, now);
      filter.frequency.exponentialRampToValueAtTime(450, now + 0.35);
      filter.Q.setValueAtTime(4.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    });
  }

  /**
   * 16. Vocal Chant ("HEY!")
   */
  async generateVocalChant(): Promise<AudioBuffer> {
    const duration = 0.35;
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      // Pulse train / sawtooth source for vocal glottal pulses
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + duration);

      // Formants for vowel /e/ -> "eh/hey" (F1 ~600Hz, F2 ~1900Hz)
      const formant1 = ctx.createBiquadFilter();
      formant1.type = 'bandpass';
      formant1.frequency.setValueAtTime(650, now);
      formant1.Q.setValueAtTime(4.0, now);

      const formant2 = ctx.createBiquadFilter();
      formant2.type = 'bandpass';
      formant2.frequency.setValueAtTime(1850, now);
      formant2.Q.setValueAtTime(4.5, now);

      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.7, now);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.5, now);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.85, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(formant1);
      osc.connect(formant2);

      formant1.connect(gain1);
      formant2.connect(gain2);

      gain1.connect(masterGain);
      gain2.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  /**
   * 17. 4-Bar Vintage Soul Vinyl Break for Sample Chopping
   * Rich soulful chords, vinyl crackle, electric bass, and drum break
   */
  async generateSoulBreakSample(): Promise<AudioBuffer> {
    const duration = 6.4; // ~4 bars at 75 BPM
    return this.renderOffline(duration, (ctx) => {
      const now = 0;
      const bpm = 75;
      const beatSec = 60 / bpm; // 0.8s per beat

      // 1. Vinyl Crackle & Turntable noise bed
      const bufferSize = ctx.sampleRate * duration;
      const vinylBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const out = vinylBuffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
          // Low white noise + occasional vinyl pops
          const noise = (Math.random() * 2 - 1) * 0.015;
          const pop = Math.random() < 0.0008 ? (Math.random() * 2 - 1) * 0.18 : 0;
          out[i] = noise + pop;
        }
      }
      const vinylSource = ctx.createBufferSource();
      vinylSource.buffer = vinylBuffer;
      const vinylHp = ctx.createBiquadFilter();
      vinylHp.type = 'highpass';
      vinylHp.frequency.setValueAtTime(300, now);
      const vinylGain = ctx.createGain();
      vinylGain.gain.setValueAtTime(0.4, now);
      vinylSource.connect(vinylHp);
      vinylHp.connect(vinylGain);
      vinylGain.connect(ctx.destination);
      vinylSource.start(now);

      // 2. Soul Rhodes Chord Progression across 4 bars (each bar = 3.2s)
      // Bar 1: Ebmaj9 (Eb, G, Bb, D, F)
      // Bar 2: Dm7 (D, F, A, C)
      // Bar 3: Cm9 (C, Eb, G, Bb, D)
      // Bar 4: Bbmaj7 (Bb, D, F, A)
      const chordChords = [
        { time: 0.0, notes: [155.56, 196.00, 233.08, 293.66, 349.23], dur: beatSec * 1.8 },
        { time: beatSec * 2, notes: [146.83, 174.61, 220.00, 261.63], dur: beatSec * 1.8 },
        { time: beatSec * 4, notes: [130.81, 155.56, 196.00, 233.08, 293.66], dur: beatSec * 1.8 },
        { time: beatSec * 6, notes: [116.54, 146.83, 174.61, 220.00], dur: beatSec * 1.8 },
      ];

      chordChords.forEach((ch) => {
        ch.notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ch.time);

          // Tine overtone
          const tine = ctx.createOscillator();
          const tineG = ctx.createGain();
          tine.type = 'sine';
          tine.frequency.setValueAtTime(freq * 3.01, ch.time);
          tineG.gain.setValueAtTime(0.08, ch.time);
          tineG.gain.exponentialRampToValueAtTime(0.001, ch.time + 0.15);

          g.gain.setValueAtTime(0.18 / ch.notes.length, ch.time + idx * 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, ch.time + ch.dur);

          osc.connect(g);
          tine.connect(tineG);
          tineG.connect(g);
          g.connect(ctx.destination);

          osc.start(ch.time);
          tine.start(ch.time);
          osc.stop(ch.time + ch.dur);
          tine.stop(ch.time + 0.2);
        });
      });

      // 3. Acoustic Drum Break (Kick on 1 & 3, Snare on 2 & 4, 8th Hihats)
      for (let b = 0; b < 8; b++) {
        const beatTime = b * beatSec;

        // Snare on 2 and 4 (beats 1, 3, 5, 7)
        if (b % 2 === 1) {
          const snOsc = ctx.createOscillator();
          const snGain = ctx.createGain();
          snOsc.type = 'triangle';
          snOsc.frequency.setValueAtTime(210, beatTime);
          snGain.gain.setValueAtTime(0.4, beatTime);
          snGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.18);
          snOsc.connect(snGain);
          snGain.connect(ctx.destination);
          snOsc.start(beatTime);
          snOsc.stop(beatTime + 0.2);
        } else {
          // Kick on 1 and 3
          const kOsc = ctx.createOscillator();
          const kGain = ctx.createGain();
          kOsc.type = 'sine';
          kOsc.frequency.setValueAtTime(140, beatTime);
          kOsc.frequency.exponentialRampToValueAtTime(45, beatTime + 0.06);
          kGain.gain.setValueAtTime(0.6, beatTime);
          kGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.35);
          kOsc.connect(kGain);
          kGain.connect(ctx.destination);
          kOsc.start(beatTime);
          kOsc.stop(beatTime + 0.38);
        }

        // Closed Hat every 8th note
        [0, beatSec * 0.5].forEach((offset) => {
          const hatTime = beatTime + offset;
          if (hatTime < duration) {
            const hOsc = ctx.createOscillator();
            const hGain = ctx.createGain();
            hOsc.type = 'square';
            hOsc.frequency.setValueAtTime(7500, hatTime);
            hGain.gain.setValueAtTime(0.12, hatTime);
            hGain.gain.exponentialRampToValueAtTime(0.001, hatTime + 0.05);
            hOsc.connect(hGain);
            hGain.connect(ctx.destination);
            hOsc.start(hatTime);
            hOsc.stop(hatTime + 0.06);
          }
        });
      }

      // 4. Soul Bassline Grooves
      const bassNotes = [
        { t: 0.0, f: 77.78 }, // Eb2
        { t: beatSec * 0.75, f: 87.31 }, // F2
        { t: beatSec * 1.5, f: 98.00 }, // G2
        { t: beatSec * 2.0, f: 73.42 }, // D2
        { t: beatSec * 3.5, f: 65.41 }, // C2
        { t: beatSec * 4.0, f: 65.41 }, // C2
        { t: beatSec * 5.5, f: 58.27 }, // Bb1
        { t: beatSec * 6.0, f: 58.27 }, // Bb1
      ];

      bassNotes.forEach((note) => {
        const bOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(note.f, note.t);

        const bFilter = ctx.createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(280, note.t);
        bFilter.Q.setValueAtTime(3.0, note.t);

        bGain.gain.setValueAtTime(0.35, note.t);
        bGain.gain.exponentialRampToValueAtTime(0.001, note.t + beatSec * 0.65);

        bOsc.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(ctx.destination);

        bOsc.start(note.t);
        bOsc.stop(note.t + beatSec * 0.7);
      });
    });
  }
}
