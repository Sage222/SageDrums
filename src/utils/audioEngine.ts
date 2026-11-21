import { DrumPadId } from '../types/drums';
import { YAMAHA_DTX452K_PADS } from '../data/dtx452kConfig';

class DrumAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private crashBuffer: AudioBuffer | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timeDomainBuffer: Float32Array<ArrayBuffer> | null = null;
  private freqDomainBuffer: Uint8Array<ArrayBuffer> | null = null;
  private lastOnsetTimeMs = 0;
  private prevRms = 0;

  public masterVolume = 0.85;
  public metronomeVolume = 0.75;

  public ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.noiseBuffer && this.ctx) {
      this.noiseBuffer = this.createWhiteNoiseBuffer(this.ctx);
    }
    if (!this.crashBuffer && this.ctx) {
      this.crashBuffer = this.createCrashCymbalBuffer(this.ctx);
    }
    return this.ctx;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * 3.5);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Generates a realistic 3.2-second B20 bronze acoustic crash cymbal sample buffer
   * using chaotic phase-modulated metallic plate modes, multi-band filtered noise bloom,
   * and plate diffusion so there is zero static oscillator buzz.
   */
  private createCrashCymbalBuffer(ctx: AudioContext): AudioBuffer {
    const duration = 3.2;
    const sr = ctx.sampleRate;
    const length = Math.floor(sr * duration);
    const buffer = ctx.createBuffer(2, length, sr);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // 28 inharmonic bronze plate modes (Hz) spanning mid-body shimmer to high air sizzle
    const modeFreqs = [
      382, 467, 558, 673, 789, 914, 1063, 1219, 1397, 1588,
      1811, 2054, 2327, 2639, 2983, 3367, 3791, 4268, 4795, 5384,
      6041, 6773, 7589, 8492, 9430, 10410, 11380, 12450,
    ];
    const modePhases = modeFreqs.map((_, i) => (i * 1.6180339) % (Math.PI * 2));

    // State variables for 3 biquad/one-pole filter bands on the noise excitation
    let lpBodyL = 0;
    let lpBodyR = 0;
    let prevNoiseL = 0;
    let prevNoiseR = 0;

    // Short comb delay lines for bronze plate diffusion
    const combDelays = [113, 179, 251, 347];
    const combBufL = new Float32Array(400);
    const combBufR = new Float32Array(400);
    let combIdx = 0;

    for (let i = 0; i < length; i++) {
      const t = i / sr;

      // Fast stick-edge attack (4ms) + natural two-stage bronze bloom (swell at 28ms)
      const attack = 1 - Math.exp(-t / 0.0035);
      const bloom = 1 + 0.38 * Math.exp(-Math.pow((t - 0.028) / 0.032, 2));

      // Sum chaotic FM-coupled metallic modes (shortened tonal decay so modes blend into wash)
      let modalSumL = 0;
      let modalSumR = 0;
      let prevModeVal = 0;

      for (let m = 0; m < modeFreqs.length; m++) {
        const freq = modeFreqs[m];
        // Higher modes decay faster; mid-high bronze modes ring slightly longer
        const modeDecayTime = 0.22 + 0.65 / (1 + freq / 2400);
        const modeEnv = Math.exp(-t / modeDecayTime);
        if (modeEnv < 0.0005) continue;

        // Nonlinear cross-modulation between adjacent plate modes creates authentic cymbal chaos
        const fmIndex = 1.85 * Math.exp(-t / 0.45);
        const phase = modePhases[m] + fmIndex * prevModeVal;
        const val = Math.sin(phase);
        prevModeVal = val;

        modePhases[m] += (2 * Math.PI * freq) / sr;
        const weight = m < 6 ? 0.018 : m < 18 ? 0.032 : 0.022;
        if (m % 2 === 0) {
          modalSumL += val * modeEnv * weight;
          modalSumR += -val * modeEnv * weight * 0.92;
        } else {
          modalSumR += val * modeEnv * weight;
          modalSumL += val * modeEnv * weight * 0.92;
        }
      }

      // Multi-band bronze noise wash + high air sizzle
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      // High-pass differentiated air sizzle (~6kHz - 14kHz)
      const airL = whiteL - prevNoiseL;
      const airR = whiteR - prevNoiseR;
      prevNoiseL = whiteL;
      prevNoiseR = whiteR;

      // Band-limited warm bronze shimmer (~1.8kHz - 5.5kHz)
      lpBodyL += 0.34 * (airL - lpBodyL);
      lpBodyR += 0.34 * (airR - lpBodyR);

      // Stick impact transient (first 25ms)
      const stickTransient = Math.exp(-t / 0.011) * 0.55;
      // Body wash envelope (2.85s)
      const bodyWashEnv =
        0.52 * Math.exp(-t / 0.26) +
        0.38 * Math.exp(-t / 0.95) +
        0.12 * Math.exp(-t / 1.85);
      // High shimmer envelope (2.4s)
      const airSizzleEnv =
        0.48 * Math.exp(-t / 0.18) +
        0.32 * Math.exp(-t / 0.78) +
        0.09 * Math.exp(-t / 1.55);

      let sampleL =
        attack *
        bloom *
        (modalSumL +
          lpBodyL * (bodyWashEnv + stickTransient) +
          airL * airSizzleEnv * 0.55);
      let sampleR =
        attack *
        bloom *
        (modalSumR +
          lpBodyR * (bodyWashEnv + stickTransient) +
          airR * airSizzleEnv * 0.55);

      // Plate comb diffusion for lush metallic density
      let diffL = 0;
      let diffR = 0;
      for (let c = 0; c < combDelays.length; c++) {
        const readIdx = (combIdx - combDelays[c] + 400) % 400;
        diffL += combBufL[readIdx] * 0.22;
        diffR += combBufR[readIdx] * 0.22;
      }
      combBufL[combIdx] = sampleL + diffL * 0.35;
      combBufR[combIdx] = sampleR + diffR * 0.35;
      combIdx = (combIdx + 1) % 400;

      // Smooth tail fade-out over final 250ms
      const tailFade = t > duration - 0.25 ? (duration - t) / 0.25 : 1;

      left[i] = Math.tanh((sampleL + diffL * 0.45) * 1.35) * tailFade;
      right[i] = Math.tanh((sampleR + diffR * 0.45) * 1.35) * tailFade;
    }

    return buffer;
  }

  public playMetronomeClick(level: 'accent' | 'beat' | 'subdivision'): void {
    if (this.metronomeVolume <= 0.01) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (level === 'accent') {
      osc.frequency.setValueAtTime(1320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.035);
      gain.gain.setValueAtTime(0.45 * this.metronomeVolume, now);
    } else if (level === 'beat') {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.03);
      gain.gain.setValueAtTime(0.32 * this.metronomeVolume, now);
    } else {
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.025);
      gain.gain.setValueAtTime(0.16 * this.metronomeVolume, now);
    }

    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playPadSound(padId: DrumPadId, velocity = 0.9): void {
    if (this.masterVolume <= 0.01) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const vol = Math.min(1, Math.max(0.1, velocity)) * this.masterVolume;

    switch (padId) {
      case 'kick': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(145, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.09);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);

        gain.gain.setValueAtTime(0.95 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);

        // Beater click transient
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(420, now);
        clickOsc.frequency.exponentialRampToValueAtTime(80, now + 0.02);
        clickGain.gain.setValueAtTime(0.35 * vol, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);
        clickOsc.start(now);
        clickOsc.stop(now + 0.03);
        break;
      }

      case 'snare': {
        // Shell body
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(210, now);
        osc.frequency.exponentialRampToValueAtTime(125, now + 0.08);
        oscGain.gain.setValueAtTime(0.55 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);

        // Snare wires
        if (this.noiseBuffer) {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(1100, now);
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.65 * vol, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.21);
        }
        break;
      }

      case 'snare_rim': {
        // High-crack Zone 2 Open Rimshot
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'square';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(185, now + 0.07);
        osc2.frequency.setValueAtTime(290, now);
        osc2.frequency.exponentialRampToValueAtTime(140, now + 0.09);

        oscGain.gain.setValueAtTime(0.55 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(oscGain);
        osc2.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.13);
        osc2.stop(now + 0.13);

        if (this.noiseBuffer) {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2400, now);
          filter.Q.setValueAtTime(0.9, now);
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.85 * vol, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.24);
        }
        break;
      }

      case 'snare_cross': {
        // Woody Zone 3 Cross-Stick click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1280, now);
        osc.frequency.exponentialRampToValueAtTime(790, now + 0.035);
        gain.gain.setValueAtTime(0.75 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.055);
        break;
      }

      case 'tom1':
      case 'tom2':
      case 'tom3': {
        const startFreq = padId === 'tom1' ? 195 : padId === 'tom2' ? 142 : 98;
        const endFreq = padId === 'tom1' ? 115 : padId === 'tom2' ? 84 : 56;
        const decay = padId === 'tom1' ? 0.24 : padId === 'tom2' ? 0.29 : 0.36;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + decay * 0.75);
        gain.gain.setValueAtTime(0.8 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + decay + 0.02);
        break;
      }

      case 'hihat':
      case 'hihat_open':
      case 'hihat_pedal': {
        if (!this.noiseBuffer) break;
        const duration = padId === 'hihat_open' ? 0.42 : padId === 'hihat_pedal' ? 0.045 : 0.06;
        const cutoff = padId === 'hihat_pedal' ? 5800 : 7200;

        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(cutoff, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.55 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + duration + 0.01);
        break;
      }

      case 'crash': {
        // Trigger the pre-rendered 3.2s stereo B20 bronze acoustic crash cymbal buffer
        if (!this.crashBuffer) break;

        const src = ctx.createBufferSource();
        src.buffer = this.crashBuffer;
        // Subtle pitch variation (±1.2%) so consecutive crashes feel organic
        src.playbackRate.setValueAtTime(0.99 + Math.random() * 0.022, now);

        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(360, now);

        // Dynamic brightness shelf that opens up on harder strikes and mellows over the 3.2s tail
        const shimmerShelf = ctx.createBiquadFilter();
        shimmerShelf.type = 'highshelf';
        shimmerShelf.frequency.setValueAtTime(5200, now);
        shimmerShelf.gain.setValueAtTime(3.5 * velocity, now);
        shimmerShelf.gain.linearRampToValueAtTime(-3.0, now + 2.8);

        const crashGain = ctx.createGain();
        crashGain.gain.setValueAtTime(0.95 * vol, now);
        crashGain.gain.exponentialRampToValueAtTime(0.001, now + 3.15);

        src.connect(hpFilter);
        hpFilter.connect(shimmerShelf);
        shimmerShelf.connect(crashGain);
        crashGain.connect(ctx.destination);

        src.start(now);
        src.stop(now + 3.2);
        break;
      }

      case 'ride': {
        // Ride Bow: Warm woody tip attack + subtle low-bell overtone + smooth metallic wash
        const bowOsc1 = ctx.createOscillator();
        const bowOsc2 = ctx.createOscillator();
        const bowGain = ctx.createGain();
        bowOsc1.type = 'sine';
        bowOsc2.type = 'triangle';
        bowOsc1.frequency.setValueAtTime(1840, now);
        bowOsc2.frequency.setValueAtTime(2720, now);

        bowGain.gain.setValueAtTime(0.22 * vol, now);
        bowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        bowOsc1.connect(bowGain);
        bowOsc2.connect(bowGain);
        bowGain.connect(ctx.destination);
        bowOsc1.start(now);
        bowOsc2.start(now);
        bowOsc1.stop(now + 0.24);
        bowOsc2.stop(now + 0.24);

        if (this.noiseBuffer) {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(5200, now);
          filter.Q.setValueAtTime(0.75, now);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.45 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.75);
        }
        break;
      }

      case 'ride_bell': {
        // Ride Bell: Distinct, bright, cutting metallic bell dome ping with long 1.15s ring
        const bellPartials = [
          { freq: 1520, amp: 0.42, decay: 1.15, type: 'sine' as OscillatorType },
          { freq: 3110, amp: 0.36, decay: 0.95, type: 'triangle' as OscillatorType },
          { freq: 4680, amp: 0.22, decay: 0.65, type: 'sine' as OscillatorType },
        ];

        bellPartials.forEach((p) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = p.type;
          osc.frequency.setValueAtTime(p.freq, now);
          gain.gain.setValueAtTime(p.amp * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + p.decay);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + p.decay + 0.02);
        });

        // Subtle metallic stick transient on the bell dome
        if (this.noiseBuffer) {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(7500, now);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.2 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.2);
        }
        break;
      }
    }
  }

  public async startMicrophone(): Promise<boolean> {
    try {
      const ctx = this.ensureContext();
      if (this.micStream && this.analyser) {
        return true;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      this.micStream = stream;
      this.micSource = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.2;
      this.micSource.connect(this.analyser);

      this.timeDomainBuffer = new Float32Array(this.analyser.fftSize);
      this.freqDomainBuffer = new Uint8Array(this.analyser.frequencyBinCount);
      return true;
    } catch {
      return false;
    }
  }

  public stopMicrophone(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    this.analyser = null;
  }

  public isMicActive(): boolean {
    return Boolean(this.micStream && this.analyser);
  }

  public sampleMicrophoneFrame(threshold: number): {
    waveform: Float32Array | null;
    peak: number;
    rms: number;
    onsetDetected: boolean;
    estimatedPadCategory: 'low' | 'mid' | 'high';
  } {
    if (!this.analyser || !this.timeDomainBuffer || !this.freqDomainBuffer) {
      return {
        waveform: null,
        peak: 0,
        rms: 0,
        onsetDetected: false,
        estimatedPadCategory: 'mid',
      };
    }

    this.analyser.getFloatTimeDomainData(this.timeDomainBuffer);
    let sumSq = 0;
    let peak = 0;
    const len = this.timeDomainBuffer.length;
    for (let i = 0; i < len; i++) {
      const val = Math.abs(this.timeDomainBuffer[i]);
      if (val > peak) peak = val;
      sumSq += val * val;
    }
    const rms = Math.sqrt(sumSq / len);

    const nowMs = performance.now();
    const minCooldownMs = 70;
    const risingSlope = peak - this.prevRms;
    const onsetDetected =
      peak >= threshold &&
      risingSlope > threshold * 0.32 &&
      nowMs - this.lastOnsetTimeMs > minCooldownMs;

    let estimatedPadCategory: 'low' | 'mid' | 'high' = 'mid';
    if (onsetDetected) {
      this.lastOnsetTimeMs = nowMs;
      this.analyser.getByteFrequencyData(this.freqDomainBuffer);
      let lowEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;
      for (let i = 1; i < 12; i++) lowEnergy += this.freqDomainBuffer[i];
      for (let i = 12; i < 65; i++) midEnergy += this.freqDomainBuffer[i];
      for (let i = 65; i < 200; i++) highEnergy += this.freqDomainBuffer[i];

      if (lowEnergy * 1.4 > midEnergy && lowEnergy > highEnergy) {
        estimatedPadCategory = 'low';
      } else if (highEnergy > midEnergy * 1.15) {
        estimatedPadCategory = 'high';
      } else {
        estimatedPadCategory = 'mid';
      }
    }

    this.prevRms = peak * 0.75 + this.prevRms * 0.25;

    return {
      waveform: this.timeDomainBuffer,
      peak,
      rms,
      onsetDetected,
      estimatedPadCategory,
    };
  }

  public async connectWebMidi(onPadHit: (padId: DrumPadId, velocity: number) => void): Promise<string | null> {
    if (!('requestMIDIAccess' in navigator)) {
      return null;
    }
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      let connectedDeviceName: string | null = null;

      const attachInputs = () => {
        midiAccess.inputs.forEach((input) => {
          connectedDeviceName = input.name || 'Yamaha DTX452K USB-MIDI';
          input.onmidimessage = (event: MIDIMessageEvent) => {
            if (!event.data || event.data.length < 3) return;
            const status = event.data[0] & 0xf0;
            const note = event.data[1];
            const velocity = event.data[2];
            if (status === 0x90 && velocity > 0) {
              const matchedPad = (Object.keys(YAMAHA_DTX452K_PADS) as DrumPadId[]).find((padKey) =>
                YAMAHA_DTX452K_PADS[padKey].midiNotes.includes(note)
              );
              if (matchedPad) {
                onPadHit(matchedPad, velocity / 127);
              }
            }
          };
        });
      };

      attachInputs();
      midiAccess.onstatechange = () => attachInputs();
      return connectedDeviceName;
    } catch {
      return null;
    }
  }
}

export const audioEngine = new DrumAudioEngine();
