
import { toCurveName, toCurveNumber } from './curves.js';
import { packAddress, unpackParam, unpackCurve } from './address.js';
import Event from './event.js';


const assign = Object.assign;
const define = Object.defineProperties;
const { fround } = Math;

export const PARAMNAMES = {
    // 0 - 127: Standard MIDI 1.0 & Profile Controllers (CC)
    //0:   'bankSelect',           // MIDI CC 0: Bank Select MSB
    1:   'modulation',           // MIDI CC 1: Modulation Wheel / LFO depth
    2:   'breath',               // MIDI CC 2: Breath Controller
    4:   'foot',                 // MIDI CC 4: Foot Controller
    5:   'portamento',           // MIDI CC 5: Portamento glide duration
    //6:   'dataEntry',            // MIDI CC 6: Data Entry MSB for RPN/NRPN
    7:   'gain',                 // MIDI CC 7 / WebAudio: GainNode.gain & BiquadFilterNode.gain
    8:   'balance',              // MIDI CC 8: Stereo Balance
    10:  'pan',                  // MIDI CC 10 / WebAudio: StereoPannerNode.pan
    11:  'expression',           // MIDI CC 11: Expression controller (secondary gain scalar)

    // Profile CCs: Drawbar Organ Profile (0x7E, 0x02) & MIDI Effects
    //12:  'effectControl1',       // MIDI CC 12: Effect Control 1 (Drawbar: Upper 16')
    //13:  'effectControl2',       // MIDI CC 13: Effect Control 2 (Drawbar: Upper 5-1/3')
    14:  'upperDrawbar8',        // Drawbar Organ Profile: Upper 8'
    15:  'upperDrawbar4',        // Drawbar Organ Profile: Upper 4'
    16:  'upperDrawbar223',      // Drawbar Organ Profile: Upper 2-2/3' (MIDI: General Purpose 1)
    17:  'upperDrawbar2',        // Drawbar Organ Profile: Upper 2' (MIDI: General Purpose 2)
    18:  'upperDrawbar135',      // Drawbar Organ Profile: Upper 1-3/5' (MIDI: General Purpose 3)
    19:  'upperDrawbar113',      // Drawbar Organ Profile: Upper 1-1/3' (MIDI: General Purpose 4)

    // Profile CCs: Piano Profile (0x7E, 0x04) & Drawbar Organ
    20:  'sympatheticResonance', // Piano Profile: Sympathetic resonance (Drawbar: Upper 1')
    21:  'keyOffNoise',          // Piano Profile: Key-off noise level
    22:  'hammerNoise',          // Piano Profile: Hammer noise level
    23:  'lidPosition',          // Piano Profile: Piano lid open/closed position

    // Profile CCs: Drawbar Organ Lower Drawbars
    33:  'lowerDrawbar16',       // Drawbar Organ Profile: Lower 16'
    34:  'lowerDrawbar8',        // Drawbar Organ Profile: Lower 8'
    35:  'lowerDrawbar4',        // Drawbar Organ Profile: Lower 4'

    // Switches & Pedals
    64:  'sustain',              // MIDI CC 64: Damper / Sustain Pedal (Hold 1)
    65:  'portamento',           // MIDI CC 65: Portamento On/Off switch
    66:  'sostenuto',            // MIDI CC 66: Sostenuto pedal
    67:  'soft',                 // MIDI CC 67: Soft Pedal (Una Corda)
    68:  'legato',               // MIDI CC 68: Legato Footswitch
    69:  'freeze',               // MIDI CC 69: Freeze / Hold 2 pedal

    // Sound Controllers / AudioParams
    70:  'speed',                // MIDI CC 70: Sound Variation (Drawbar / Rotary: Speed fast/slow)
    71:  'Q',                    // MIDI CC 71 / WebAudio: BiquadFilterNode.Q
    72:  'release',              // MIDI CC 72 / WebAudio: DynamicsCompressorNode.release & ADSR
    73:  'attack',               // MIDI CC 73 / WebAudio: DynamicsCompressorNode.attack & ADSR
    74:  'frequency',            // MIDI CC 74 / WebAudio: BiquadFilterNode.frequency & OscillatorNode.frequency
    75:  'decay',                // MIDI CC 75: Envelope Decay Time offset (GM2 Profile)
    76:  'rate',                 // MIDI CC 76: LFO Vibrato Rate (GM2 Profile)
    77:  'depth',                // MIDI CC 77: LFO Vibrato Depth (GM2 Profile)
    78:  'delay',                // MIDI CC 78: LFO Vibrato Delay / Attack Time (GM2 Profile)

    // Effects & Sends
    91:  'reverb',               // MIDI CC 91: Reverb Send Level (GM2 Profile)
    92:  'tremolo',              // MIDI CC 92: Tremolo Depth
    93:  'chorus',               // MIDI CC 93: Chorus Send Level (GM2 Profile)
    94:  'detune',               // MIDI CC 94 / WebAudio: OscillatorNode / BiquadFilterNode / AudioBufferSourceNode.detune
    95:  'phaser',               // MIDI CC 95: Phaser Depth

    // Channel Mode Messages
    //120: 'allSoundOff',          // MIDI CC 120: Mute all oscillators immediately
    //121: 'resetAllControllers',  // MIDI CC 121: Reset all CCs to default
    //122: 'localControl',         // MIDI CC 122: Local keyboard on/off switch
    //123: 'allNotesOff',          // MIDI CC 123: Release all active notes
    //124: 'omniModeOff',          // MIDI CC 124: Omni mode off
    //125: 'omniModeOn',           // MIDI CC 125: Omni mode on
    //126: 'monoMode',             // MIDI CC 126: Monophonic mode
    //127: 'polyMode',             // MIDI CC 127: Polyphonic mode

    // ------------------------------------------------------------------------
    // 128 - 143: Standard Registered Parameter Numbers (RPN)
    // ------------------------------------------------------------------------
    128: 'pitchBendRange',       // RPN 0x0000: Pitch bend range (semitones & cents)
    129: 'fineTuning',           // RPN 0x0001: Channel fine pitch tuning (cents)
    130: 'coarseTuning',         // RPN 0x0002: Channel coarse transposition (semitones)
    //131: 'tuningProgram',        // RPN 0x0003: MIDI Tuning Standard (MTS) Program
    //132: 'tuningBank',           // RPN 0x0004: MIDI Tuning Standard (MTS) Bank
    133: 'modulationDepthRange', // RPN 0x0005: Max depth scaling for CC 1 Modulation
    //134: 'mpeConfiguration',     // RPN 0x0006: MPE Zone Master/Member configuration
    //135: 'rpnNull',              // RPN 0x7F7F: Deselect active RPN / reset state

    // ------------------------------------------------------------------------
    // 144 - 159: Spatial Audio (MIDI RP-049 3D Sound & WebAudio Panner/Listener)
    // ------------------------------------------------------------------------
    144: 'azimuth',              // 3D Audio RPN 0x3D00: Horizontal angle (-180 to +180 deg)
    145: 'elevation',            // 3D Audio RPN 0x3D01: Vertical angle (-90 to +90 deg)
    146: 'distance',             // 3D Audio RPN 0x3D02: Distance from listener
    147: 'positionX',            // WebAudio AudioParam: PannerNode & AudioListener positionX
    148: 'positionY',            // WebAudio AudioParam: PannerNode & AudioListener positionY
    149: 'positionZ',            // WebAudio AudioParam: PannerNode & AudioListener positionZ
    150: 'orientationX',         // WebAudio AudioParam: PannerNode orientationX
    151: 'orientationY',         // WebAudio AudioParam: PannerNode orientationY
    152: 'orientationZ',         // WebAudio AudioParam: PannerNode orientationZ
    153: 'forwardX',             // WebAudio AudioParam: AudioListener forwardX
    154: 'forwardY',             // WebAudio AudioParam: AudioListener forwardY
    155: 'forwardZ',             // WebAudio AudioParam: AudioListener forwardZ
    156: 'upX',                  // WebAudio AudioParam: AudioListener upX
    157: 'upY',                  // WebAudio AudioParam: AudioListener upY
    158: 'upZ',                  // WebAudio AudioParam: AudioListener upZ

    // ------------------------------------------------------------------------
    // 160 - 175: Synth Parameter Alternates & Envelope Timings
    // ------------------------------------------------------------------------
    160: 'cutoff',               // Alternate to 74 frequency: Filter Cutoff Frequency
    161: 'resonance',            // Alternate to 71 Q: Filter Resonance
    162: 'attackTime',           // Envelope / GM2 NRPN 1,99: Explicit Attack Duration
    163: 'decayTime',            // Envelope / GM2 NRPN 1,100: Explicit Decay Duration
    164: 'releaseTime',          // Envelope / GM2 NRPN 1,102: Explicit Release Duration
    165: 'sustainLevel',         // Envelope: Explicit Sustain Gain Level (0.0 - 1.0)
    166: 'hold',                 // Envelope / Voice method: Hold duration / voice latch
    167: 'volume',               // Alternate to 7 gain: Channel/Track Master Volume
    168: 'brake',                // Rotary Speaker Profile NRPN: Rotor brake on/off
    169: 'vibratoChorusSelect',  // Drawbar Organ Profile: Vibrato/Chorus type select

    // ------------------------------------------------------------------------
    // 176 - 207: Core WebAudio AudioParams (Continuous Automation)
    // ------------------------------------------------------------------------
    176: 'playbackRate',         // WebAudio AudioParam: AudioBufferSourceNode.playbackRate
    177: 'delayTime',            // WebAudio AudioParam: DelayNode.delayTime
    178: 'offset',               // WebAudio AudioParam: ConstantSourceNode.offset
    179: 'threshold',            // WebAudio AudioParam: DynamicsCompressorNode.threshold
    180: 'knee',                 // WebAudio AudioParam: DynamicsCompressorNode.knee
    181: 'ratio',                // WebAudio AudioParam: DynamicsCompressorNode.ratio
    182: 'reduction',            // WebAudio AudioParam: DynamicsCompressorNode.reduction
    183: 'feedback',             // AudioParam / Audio property: Delay/Comb filter feedback
    184: 'feedforward',          // Audio property: IIRFilter feedforward gain
    185: 'wet',                  // AudioParam / Audio property: Effect wet mix level
    186: 'dry',                  // AudioParam / Audio property: Effect dry mix level
    187: 'mix',                  // AudioParam / Audio property: Dry/wet balance
    188: 'drive',                // AudioParam: Overdrive / Waveshaper pre-gain
    189: 'distortion',           // AudioParam: Alternate to drive
    190: 'pitch',                // AudioParam / Synth property: Note pitch / base frequency

    // ------------------------------------------------------------------------
    // 208 - 239: AudioNode Configuration Properties (Discrete / Non-AudioParam)
    // ------------------------------------------------------------------------
    208: 'type',                 // OscillatorNode & BiquadFilterNode type
    209: 'loop',                 // AudioBufferSourceNode.loop
    210: 'loopStart',            // AudioBufferSourceNode.loopStart
    211: 'loopEnd',              // AudioBufferSourceNode.loopEnd
    212: 'buffer',               // AudioBufferSourceNode / ConvolverNode buffer
    213: 'curve',                // WaveShaperNode.curve
    214: 'oversample',           // WaveShaperNode.oversample
    215: 'normalize',            // ConvolverNode.normalize
    216: 'panningModel',         // PannerNode.panningModel
    217: 'distanceModel',        // PannerNode.distanceModel
    218: 'refDistance',          // PannerNode.refDistance
    219: 'maxDistance',          // PannerNode.maxDistance
    220: 'rolloffFactor',        // PannerNode.rolloffFactor
    221: 'coneInnerAngle',       // PannerNode.coneInnerAngle
    222: 'coneOuterAngle',       // PannerNode.coneOuterAngle
    223: 'coneOuterGain',        // PannerNode.coneOuterGain
    224: 'channelCount',         // AudioNode.channelCount
    225: 'channelCountMode',     // AudioNode.channelCountMode
    226: 'channelInterpretation',// AudioNode.channelInterpretation
    227: 'fftSize',              // AnalyserNode.fftSize
    228: 'minDecibels',          // AnalyserNode.minDecibels
    229: 'maxDecibels',          // AnalyserNode.maxDecibels
    230: 'smoothingTimeConstant',// AnalyserNode.smoothingTimeConstant

    // ------------------------------------------------------------------------
    // 240 - 255: AudioNode & Voice Methods (Execution / Lifecycle Commands)
    // ------------------------------------------------------------------------
    240: 'start',                // WebAudio Method: AudioScheduledSourceNode.start()
    241: 'stop',                 // WebAudio Method: AudioScheduledSourceNode.stop()
    242: 'reset',                // WebAudio / Synth Method: Reset node state
    243: 'mute',                 // WebAudio / Mixer Method: Mute channel
    244: 'unmute',               // WebAudio / Mixer Method: Unmute channel
    245: 'pause',                // WebAudio / Player Method: Pause processing
    246: 'resume'                // WebAudio / Player Method: Resume processing
};

export const PARAMS = Object.entries(PARAMNAMES)
    .reduce((object, [key, value]) => {
        object[value] = parseInt(key, 10);
        return object;
    }, {});

/**
toParamName(value)
Converts a param name or number to a param name string.
**/
export function toParamName(value) {
    return typeof value === 'number' ?
        (PARAMNAMES[value] || value) :
        value;
}

export function toParamNumber(value) {
    if (typeof value === 'string' && value in PARAMS) return PARAMS[value];
    if (value in PARAMNAMES) return value;
    throw new Error(`Param name "${ value }" not recognised`);
}


export default class ControlEvent extends Event {
    static of(beat, name, curve = 0, value = 0, duration = 0) {
        return new ControlEvent({ beat, name, curve, value, duration });
    }

    [1] = Event.TYPES.control;

    get address()     { return this[2]; }
    set address(addr) { this[2] = parseInt(addr, 10); }

    get name()        { return toParamName(unpackParam(this[2])); }
    set name(name)    { this[2] = packAddress(toParamNumber(name), unpackCurve(this[2])); }

    get curve()       { return toCurveName(unpackCurve(this[2])); }
    set curve(name)   { this[2] = packAddress(unpackParam(this[2]), toCurveNumber(name)); }

    get value()       { return this[3]; }
    set value(number) { this[3] = fround(number); }

    get duration() {
        const curve = unpackCurve(this[2]);
        return curve === Event.CURVES.target || curve === Event.CURVES.curve ?
            this[4] :
            0 ;
    }

    set duration(number) {
        this[4] = parseFloat(number);
    }

    toString() {
        return `${ super.toString() }${ this.name }.${ this.curve } ${ this.value } ${ this.duration }`;
    }
}

define(ControlEvent.prototype, {
    type: { value: 'control' }
});
