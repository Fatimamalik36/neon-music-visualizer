/* ==========================================================================
   AUDIO.JS — Web Audio API engine
   Handles: AudioContext + AnalyserNode setup, offline-synthesized demo
   tracks (so the app works with zero external audio files), uploaded-file
   decoding, microphone input, transport controls, and beat detection.
   ========================================================================== */

class NeonAudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.gainNode = null;
    this.freqData = null;
    this.timeData = null;

    this.sourceNode = null;      // current AudioBufferSourceNode or MediaStreamSource
    this.mode = 'none';          // 'buffer' | 'mic'
    this.buffer = null;
    this.startedAtCtx = 0;       // ctx.currentTime when playback (re)started
    this.offset = 0;             // seconds into the buffer
    this.playing = false;
    this.onEnded = null;

    this._beatHistory = [];
    this._lastBeatTime = 0;

    this._bufferCache = new Map();
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.82;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.frequencyBinCount);
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.8;
      this.gainNode.connect(this.ctx.destination);
      this.analyser.connect(this.gainNode);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setVolume(v) { if (this.gainNode) this.gainNode.gain.value = v; }

  /* -------------------------------------------------------------------- */
  /*  Demo track synthesis — renders a short looping pattern offline       */
  /* -------------------------------------------------------------------- */
  async generateDemoBuffer(track) {
    if (this._bufferCache.has(track.id)) return this._bufferCache.get(track.id);
    this.ensureContext();
    const sr = this.ctx.sampleRate;
    const dur = track.duration;
    const offlineCtx = new OfflineAudioContext(2, sr * dur, sr);

    const beatLen = 60 / (track.tempo * 30); // seconds per step
    const scale = [0, 3, 5, 7, 10, 12, 15, 7]; // minor pentatonic-ish steps (semitones)

    // Bassline (root oscillator, rhythmic gate)
    const steps = Math.floor(dur / beatLen);
    for (let i = 0; i < steps; i++) {
      const t = i * beatLen;
      const semis = scale[i % scale.length];
      const freq = track.root * Math.pow(2, semis / 12);

      const osc = offlineCtx.createOscillator();
      osc.type = track.wave;
      osc.frequency.value = freq;
      const g = offlineCtx.createGain();
      const amp = 0.16 + 0.05 * Math.sin(i * 0.7);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + beatLen * 0.95);
      osc.connect(g).connect(offlineCtx.destination);
      osc.start(t);
      osc.stop(t + beatLen);
    }

    // Pad layer (slow evolving chord for texture)
    const pad = offlineCtx.createOscillator();
    pad.type = 'sine';
    pad.frequency.value = track.pad;
    const padGain = offlineCtx.createGain();
    padGain.gain.setValueAtTime(0.0001, 0);
    padGain.gain.linearRampToValueAtTime(0.05, 2);
    padGain.gain.linearRampToValueAtTime(0.03, dur - 1);
    padGain.gain.linearRampToValueAtTime(0.0001, dur);
    const padFilter = offlineCtx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    pad.connect(padFilter).connect(padGain).connect(offlineCtx.destination);
    pad.start(0); pad.stop(dur);

    // Sub-bass thump on every downbeat for strong low-end reactivity
    const thumpEvery = beatLen * 4;
    for (let t = 0; t < dur; t += thumpEvery) {
      const osc = offlineCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);
      const g = offlineCtx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g).connect(offlineCtx.destination);
      osc.start(t); osc.stop(t + 0.4);
    }

    // Hi-hat shimmer using filtered noise for high-frequency content
    const hatEvery = beatLen / 2;
    for (let t = 0; t < dur; t += hatEvery) {
      const bufSize = sr * 0.05;
      const noiseBuf = offlineCtx.createBuffer(1, bufSize, sr);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      const noise = offlineCtx.createBufferSource();
      noise.buffer = noiseBuf;
      const hp = offlineCtx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 6000;
      const g = offlineCtx.createGain();
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      noise.connect(hp).connect(g).connect(offlineCtx.destination);
      noise.start(t);
    }

    const rendered = await offlineCtx.startRendering();
    this._bufferCache.set(track.id, rendered);
    return rendered;
  }

  /* -------------------------------------------------------------------- */
  /*  File decoding                                                        */
  /* -------------------------------------------------------------------- */
  async decodeFile(arrayBuffer) {
    this.ensureContext();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  /* -------------------------------------------------------------------- */
  /*  Buffer playback / transport                                          */
  /* -------------------------------------------------------------------- */
  playBuffer(buffer, offsetSeconds = 0) {
    this.ensureContext();
    this.stopSource(true);
    this.mode = 'buffer';
    this.buffer = buffer;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.analyser);
    src.onended = () => {
      if (this.sourceNode === src && this.playing) {
        this.playing = false;
        if (this.onEnded) this.onEnded();
      }
    };
    const start = Math.max(0, Math.min(offsetSeconds, buffer.duration - 0.05));
    src.start(0, start);
    this.sourceNode = src;
    this.startedAtCtx = this.ctx.currentTime - start;
    this.offset = start;
    this.playing = true;
  }

  pause() {
    if (this.mode !== 'buffer' || !this.playing) return;
    this.offset = this.getCurrentTime();
    this.stopSource(true);
    this.playing = false;
  }

  resume() {
    if (this.mode !== 'buffer' || !this.buffer) return;
    this.playBuffer(this.buffer, this.offset);
  }

  seek(seconds) {
    if (this.mode !== 'buffer' || !this.buffer) return;
    const wasPlaying = this.playing;
    this.offset = Math.max(0, Math.min(seconds, this.buffer.duration));
    if (wasPlaying) this.playBuffer(this.buffer, this.offset);
  }

  getCurrentTime() {
    if (this.mode !== 'buffer' || !this.buffer) return 0;
    if (!this.playing) return this.offset;
    return Math.min(this.ctx.currentTime - this.startedAtCtx, this.buffer.duration);
  }

  getDuration() { return this.buffer ? this.buffer.duration : 0; }

  stopSource(silent) {
    if (this.sourceNode) {
      try { this.sourceNode.onended = null; this.sourceNode.stop(); } catch (e) {}
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }
  }

  /* -------------------------------------------------------------------- */
  /*  Microphone mode                                                      */
  /* -------------------------------------------------------------------- */
  async enableMic() {
    this.ensureContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.stopSource(true);
    this.mode = 'mic';
    this.playing = true;
    const src = this.ctx.createMediaStreamSource(stream);
    src.connect(this.analyser);
    this.sourceNode = src;
    this._micStream = stream;
    return stream;
  }

  disableMic() {
    if (this._micStream) this._micStream.getTracks().forEach(t => t.stop());
    this._micStream = null;
    this.stopSource(true);
    this.mode = 'none';
    this.playing = false;
  }

  /* -------------------------------------------------------------------- */
  /*  Analysis helpers                                                     */
  /* -------------------------------------------------------------------- */
  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(0);
    this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  }

  getTimeDomainData() {
    if (!this.analyser) return new Uint8Array(0);
    this.analyser.getByteTimeDomainData(this.timeData);
    return this.timeData;
  }

  /** Returns normalized 0..1 energy for bass / mid / treble bands. */
  getBandEnergies() {
    const data = this.getFrequencyData();
    if (!data.length) return { bass: 0, mid: 0, treble: 0, overall: 0 };
    const n = data.length;
    const bassEnd = Math.floor(n * 0.08);
    const midEnd = Math.floor(n * 0.35);
    let bass = 0, mid = 0, treble = 0;
    for (let i = 0; i < bassEnd; i++) bass += data[i];
    for (let i = bassEnd; i < midEnd; i++) mid += data[i];
    for (let i = midEnd; i < n; i++) treble += data[i];
    bass = bass / bassEnd / 255;
    mid = mid / (midEnd - bassEnd) / 255;
    treble = treble / (n - midEnd) / 255;
    const overall = (bass + mid + treble) / 3;
    return { bass, mid, treble, overall };
  }

  /** Simple adaptive beat detector based on bass energy spikes. */
  detectBeat(bassEnergy) {
    const now = performance.now();
    this._beatHistory.push(bassEnergy);
    if (this._beatHistory.length > 43) this._beatHistory.shift();
    const avg = this._beatHistory.reduce((a, b) => a + b, 0) / this._beatHistory.length;
    const isBeat = bassEnergy > avg * 1.35 && bassEnergy > 0.28 && (now - this._lastBeatTime) > 220;
    if (isBeat) this._lastBeatTime = now;
    return isBeat;
  }
}

window.neonAudio = new NeonAudioEngine();
