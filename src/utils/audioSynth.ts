import { calculateTimingMs, encodeToMorse } from './morseEngine';

class MorseAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private frequencyHz: number = 600;
  private wpm: number = 16;
  private farnsworthWpm: number = 14;
  private activeTimeouts: number[] = [];
  private manualOsc: OscillatorNode | null = null;
  private manualGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setConfig(opts: {
    frequencyHz?: number;
    wpm?: number;
    farnsworthWpm?: number;
    muted?: boolean;
  }) {
    if (opts.frequencyHz !== undefined) this.frequencyHz = opts.frequencyHz;
    if (opts.wpm !== undefined) this.wpm = opts.wpm;
    if (opts.farnsworthWpm !== undefined) this.farnsworthWpm = opts.farnsworthWpm;
    if (opts.muted !== undefined) this.isMuted = opts.muted;
  }

  public getConfig() {
    return {
      frequencyHz: this.frequencyHz,
      wpm: this.wpm,
      farnsworthWpm: this.farnsworthWpm,
      muted: this.isMuted,
    };
  }

  public stopAll() {
    this.activeTimeouts.forEach((id) => window.clearTimeout(id));
    this.activeTimeouts = [];
    this.stopManualTone();
  }

  /**
   * Plays a single CW tone (dit or dah) with a raised-cosine 5ms envelope to prevent key clicks.
   */
  public playElement(type: 'dit' | 'dah', customWpm?: number): number {
    const timing = calculateTimingMs(customWpm ?? this.wpm, this.farnsworthWpm);
    const durationMs = type === 'dit' ? timing.dotMs : timing.dashMs;

    if (this.isMuted) return durationMs;
    const ctx = this.getContext();
    if (!ctx) return durationMs;

    const now = ctx.currentTime;
    const durationSec = durationMs / 1000;
    const attackSec = Math.min(0.006, durationSec * 0.15);
    const releaseSec = Math.min(0.008, durationSec * 0.2);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.frequencyHz, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + attackSec);
    gain.gain.setValueAtTime(0.24, now + Math.max(attackSec, durationSec - releaseSec));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.01);

    return durationMs;
  }

  /**
   * Starts a continuous straight-key tone while user holds down key or button.
   */
  public startManualTone() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.stopManualTone();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.frequencyHz, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.006);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);

    this.manualOsc = osc;
    this.manualGain = gain;
  }

  public stopManualTone() {
    if (this.manualGain && this.manualOsc && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        this.manualGain.gain.cancelScheduledValues(now);
        this.manualGain.gain.setValueAtTime(this.manualGain.gain.value || 0.2, now);
        this.manualGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01);
        this.manualOsc.stop(now + 0.015);
      } catch {
        // Ignore already stopped oscillator
      }
    }
    this.manualOsc = null;
    this.manualGain = null;
  }

  /**
   * Plays a Morse code sequence (e.g. ".- / -...") or plain text, invoking callbacks
   * as each element plays so the UI can animate the signal tape in sync.
   */
  public playMorseSequence(
    morseCode: string,
    options?: {
      wpm?: number;
      farnsworthWpm?: number;
      noiseLevel?: number;
      onElementStart?: (index: number, symbol: '.' | '-') => void;
      onComplete?: () => void;
    }
  ): () => void {
    this.stopAll();
    const timing = calculateTimingMs(
      options?.wpm ?? this.wpm,
      options?.farnsworthWpm ?? this.farnsworthWpm
    );

    let cursorMs = 30;
    let symbolIndex = 0;

    // Optional subtle band-limited atmospheric static during scenario playback
    let noiseCleanup: (() => void) | null = null;
    if (options?.noiseLevel && options.noiseLevel > 0 && !this.isMuted) {
      noiseCleanup = this.startAtmosphericNoise(options.noiseLevel);
    }

    const tokens = morseCode.trim().split('');
    for (let i = 0; i < tokens.length; i++) {
      const ch = tokens[i];
      if (ch === '.' || ch === '-') {
        const currentSymbolIndex = symbolIndex++;
        const duration = ch === '.' ? timing.dotMs : timing.dashMs;
        const startAt = cursorMs;

        const tid = window.setTimeout(() => {
          this.playElement(ch === '.' ? 'dit' : 'dah', options?.wpm ?? this.wpm);
          options?.onElementStart?.(currentSymbolIndex, ch);
        }, startAt);
        this.activeTimeouts.push(tid);

        cursorMs += duration;
        // Check next char to determine gap
        const nextChar = tokens[i + 1];
        if (nextChar === '.' || nextChar === '-') {
          cursorMs += timing.intraCharGapMs;
        }
      } else if (ch === ' ') {
        // Check if part of ' / ' word separator
        if (tokens[i + 1] === '/' || tokens[i - 1] === '/') {
          continue;
        }
        cursorMs += timing.charGapMs;
      } else if (ch === '/') {
        cursorMs += timing.wordGapMs;
      }
    }

    const endTid = window.setTimeout(() => {
      if (noiseCleanup) noiseCleanup();
      options?.onComplete?.();
    }, cursorMs + 80);
    this.activeTimeouts.push(endTid);

    return () => {
      if (noiseCleanup) noiseCleanup();
      this.stopAll();
    };
  }

  public playText(
    text: string,
    options?: {
      wpm?: number;
      farnsworthWpm?: number;
      noiseLevel?: number;
      onElementStart?: (index: number, symbol: '.' | '-') => void;
      onComplete?: () => void;
    }
  ): () => void {
    const morse = encodeToMorse(text);
    return this.playMorseSequence(morse, options);
  }

  private startAtmosphericNoise(level: number): () => void {
    const ctx = this.getContext();
    if (!ctx) return () => {};

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = this.frequencyHz;
    filter.Q.value = 3.5;

    const gain = ctx.createGain();
    gain.gain.value = Math.min(0.05, level * 0.18);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    whiteNoise.start();

    return () => {
      try {
        whiteNoise.stop();
        whiteNoise.disconnect();
      } catch {
        // Ignore already stopped
      }
    };
  }
}

export const morseAudio = new MorseAudioSynthesizer();
