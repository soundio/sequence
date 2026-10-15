
import ControlEvent from './control.js';
import Event        from './event.js';


export default class StartControlEvent extends ControlEvent {
    static of(beat, name, pitch, gain) {
        return new StartControlEvent({ beat, name, value, curve, duration });
    }

    [1] = Event.TYPES.control;

    get address()     { return this[2]; }
    set address(addr) { this[2] = parseInt(addr, 10); }

    get name()        { return toParamName(unpackParam(this[2])); }
    set name(name)    { this[2] = packAddress(toParamNumber(name), Event.CURVES.set); }

    get pitch()       { return this[3]; }
    set pitch(number) { this[3] = parsePitch(number); }

    get gain()        { return this[4]; }
    set gain(number)  { this[4] = parseGain(number); }

    toString() {
        return `${ super.toString() }${ this.name } ${ this.pitch } ${ this.gain }`;
    }
}

define(StartControlEvent.prototype, {
    type: { value: 'start' }
});
