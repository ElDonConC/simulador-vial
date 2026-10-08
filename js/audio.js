// ============================================================
// AUDIO SÍNTESIS CON TONE.JS (MOTOR REALISTA, FRENADO, IMPACTO, ALERTAS)
// ============================================================
let audioInitialized = false;
let masterGainNode = null;
let currentVolume = 0.5; // Volumen inicial equilibrado y moderado (50%)
let engineOsc1, engineOsc2, engineNoise, engineFilter, engineGain;
let skidGain, skidFilter, skidFMOsc, skidNoise;
let crashSynth, crashSub, notificationSynth, hornSynth;

function setMasterVolume(val) {
    currentVolume = Math.max(0, Math.min(1, val));
    if (masterGainNode) {
        masterGainNode.gain.rampTo(currentVolume * 0.7, 0.05);
    }
    // Sincronizar sliders e indicadores UI
    const slider = document.getElementById('volume-slider');
    const label = document.getElementById('volume-label');
    if (slider) slider.value = Math.round(currentVolume * 100);
    if (label) label.innerText = Math.round(currentVolume * 100) + '%';
    
    // Si estamos en VR, refrescar panel de menú
    if (typeof window.refreshVRMenuPanel === 'function') {
        window.refreshVRMenuPanel();
    }
}

function initAudio() {
    if (audioInitialized) return;
    try {
        if (window.Tone) {
            Tone.start().then(() => {
                // Master Limiter / Volume moderado por defecto
                masterGainNode = new Tone.Gain(currentVolume * 0.7).toDestination();
                const masterGain = masterGainNode;

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

                // 2. CHIRRIDO DE FRENADO / DERRAPES SUAVE Y REALISTA
                // Usamos síntesis continua de fricción de neumático con modulación de frecuencia y ruido asfáltico
                skidGain = new Tone.Gain(0.0).connect(masterGain);
                
                skidFilter = new Tone.Filter({
                    frequency: 2200,
                    type: "bandpass",
                    Q: 3.5
                }).connect(skidGain);

                // Tono chillón del caucho contra el asfalto (Fricción elástica)
                skidFMOsc = new Tone.FMOscillator({
                    frequency: 850,
                    type: "sawtooth",
                    modulationType: "triangle",
                    harmonicity: 1.41,
                    modulationIndex: 8
                }).connect(skidFilter).start();

                // Ruido de textura de asfalto y goma quemada
                skidNoise = new Tone.Noise("pink").start();
                const skidNoiseFilter = new Tone.Filter(1800, "bandpass").connect(skidGain);
                skidNoise.connect(skidNoiseFilter);
                skidNoise.volume.value = -14;

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

// Función auxiliar para modular el motor y frenos en cada frame de física
function updateEngineAudio(speedMult, isBraking) {
    if (!audioInitialized || !engineGain) return;

    // Volumen suave del motor
    engineGain.gain.rampTo(0.35, 0.1);

    // Si está frenando fuerte, modular el sonido de derrape de neumáticos continuo
    if (skidGain && skidFMOsc && skidFilter) {
        if (isBraking && speedMult > 0.25) {
            // Ganancia proporcional a la velocidad a la que se frena
            const skidVol = Math.min(0.45, (speedMult - 0.2) * 0.5);
            skidGain.gain.rampTo(skidVol, 0.08);

            // Modulación del tono según velocidad de derrape (chillido realista)
            const skidPitch = 700 + (speedMult * 400);
            skidFMOsc.frequency.rampTo(skidPitch, 0.08);
            skidFilter.frequency.rampTo(skidPitch * 2.2, 0.08);
        } else {
            // Silenciar derrape suavemente cuando se suelta el freno
            skidGain.gain.rampTo(0.0, 0.12);
        }
    }

    // RPM Frecuencia base proporcional a la velocidad
    const targetFreq = 42 + (speedMult * 145);
    if (engineOsc1) engineOsc1.frequency.rampTo(targetFreq, 0.06);
    if (engineOsc2) engineOsc2.frequency.rampTo(targetFreq * 0.5, 0.06);

    // Abrir el filtro de paso bajo con aceleración (rugido suave)
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
    if (skidGain) {
        skidGain.gain.rampTo(0, 0.08);
    }
}
