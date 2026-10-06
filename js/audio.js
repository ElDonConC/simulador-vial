// ============================================================
// AUDIO SÍNTESIS CON TONE.JS (MOTOR REALISTA, FRENADO, IMPACTO, ALERTAS)
// ============================================================
let audioInitialized = false;
let engineOsc1, engineOsc2, engineNoise, engineFilter, engineGain;
let skidSynth, crashSynth, crashSub, notificationSynth, hornSynth;

function initAudio() {
    if (audioInitialized) return;
    try {
        if (window.Tone) {
            Tone.start().then(() => {
                // Master Limiter / Volume
                const masterGain = new Tone.Gain(0.9).toDestination();

                // 1. MOTOR REALISTA: Dual Oscillators (Fat Sawtooth + Triangle) + Brown Noise Rumble
                engineGain = new Tone.Gain(0.0).connect(masterGain);
                
                engineFilter = new Tone.Filter({
                    frequency: 240,
                    type: "lowpass",
                    rolloff: -24,
                    Q: 1.8
                }).connect(engineGain);

                // Oscilador 1: Pistones y combustión (Sawtooth con armónicos de motor V6/V8)
                engineOsc1 = new Tone.Oscillator({
                    frequency: 55,
                    type: "sawtooth4"
                }).connect(engineFilter).start();

                // Oscilador 2: Sub-bajo y resonancia mecánica
                engineOsc2 = new Tone.Oscillator({
                    frequency: 27.5,
                    type: "triangle"
                }).connect(engineFilter).start();

                // Ruido de rodamiento de neumáticos y flujo de aire/asfalto
                engineNoise = new Tone.Noise("brown").start();
                const noiseFilter = new Tone.Filter(180, "lowpass").connect(engineGain);
                engineNoise.connect(noiseFilter);
                engineNoise.volume.value = -18;

                // 2. CHIRRIDO DE FRENADO / DERRAPES AGUDO Y REALISTA
                skidSynth = new Tone.NoiseSynth({
                    noise: { type: "pink" },
                    envelope: { attack: 0.05, decay: 0.35, sustain: 0.1, release: 0.25 }
                });
                const skidFilter = new Tone.Filter(3200, "bandpass").connect(masterGain);
                skidSynth.connect(skidFilter);
                skidSynth.volume.value = 4;

                // 3. IMPACTO DE CHOQUE Y DESTRUCCIÓN METÁLICA
                crashSynth = new Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: { attack: 0.002, decay: 1.4, sustain: 0, release: 0.6 }
                }).connect(masterGain);
                crashSynth.volume.value = 6;

                crashSub = new Tone.MembraneSynth({
                    pitchDecay: 0.08,
                    octaves: 4,
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.001, decay: 0.8, sustain: 0.01, release: 0.5 }
                }).connect(masterGain);
                crashSub.volume.value = 4;

                // 4. NOTIFICACIONES DE SMARTPHONE (WHATSAPP DING TONE)
                notificationSynth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.005, decay: 0.18, sustain: 0.02, release: 0.3 }
                }).connect(masterGain);
                notificationSynth.volume.value = 2;

                audioInitialized = true;
            }).catch(e => console.log('Audio bypass:', e));
        }
    } catch (err) {
        console.warn("Audio Context warning:", err);
    }
}

// Función auxiliar para modular el motor en cada frame de física
function updateEngineAudio(speedMult, isBraking) {
    if (!audioInitialized || !engineGain) return;

    // Volumen suave según el estado
    engineGain.gain.rampTo(0.35, 0.1);

    // RPM Frecuencia base proporcional a la velocidad
    // Rango de 40Hz (ralentí) hasta 240Hz (alta aceleración)
    const targetFreq = 42 + (speedMult * 145);
    if (engineOsc1) engineOsc1.frequency.rampTo(targetFreq, 0.06);
    if (engineOsc2) engineOsc2.frequency.rampTo(targetFreq * 0.5, 0.06);

    // Abrir el filtro de paso bajo con aceleración (da brillo y rugido al acelerar)
    if (engineFilter) {
        const filterFreq = 160 + (speedMult * 1200);
        engineFilter.frequency.rampTo(filterFreq, 0.08);
    }

    // Volumen del aire y rodaje
    if (engineNoise) {
        engineNoise.volume.rampTo(-22 + (speedMult * 14), 0.1);
    }
}

function stopEngineAudio() {
    if (engineGain) {
        engineGain.gain.rampTo(0, 0.15);
    }
}
