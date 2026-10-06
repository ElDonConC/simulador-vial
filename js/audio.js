// ============================================================
// AUDIO SÍNTESIS CON TONE.JS (MOTOR, FRENADO, IMPACTO, ALERTAS)
// ============================================================
let audioInitialized = false;
let engineNoise, engineFilter, crashSynth, notificationSynth, skidSynth;

function initAudio() {
    if (audioInitialized) return;
    try {
        if (window.Tone) {
            Tone.start().then(() => {
                engineNoise = new Tone.Noise("brown").start();
                engineFilter = new Tone.Filter(220, "lowpass").toDestination();
                engineNoise.connect(engineFilter);
                engineNoise.volume.value = -12;

                crashSynth = new Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: { attack: 0.005, decay: 1.8, sustain: 0, release: 0.8 }
                }).toDestination();

                skidSynth = new Tone.NoiseSynth({
                    noise: { type: "pink" },
                    envelope: { attack: 0.08, decay: 0.6, sustain: 0, release: 0.3 }
                }).toDestination();

                notificationSynth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.01, decay: 0.12, sustain: 0.05, release: 0.4 }
                }).toDestination();
                notificationSynth.volume.value = 4;

                audioInitialized = true;
            }).catch(e => console.log('Audio bypass:', e));
        }
    } catch (err) {
        console.warn("Audio Context warning:", err);
    }
}
