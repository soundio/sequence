
import Event         from './event/event.js';
import ChordEvent    from './event/chord.js';
import KeyEvent      from './event/key.js';
import MeterEvent    from './event/meter.js';
import NoteEvent     from './event/note.js';
import ParamEvent    from './event/param.js';
import RateEvent     from './event/rate.js';
import SequenceEvent from './event/sequence.js';
import TextEvent     from './event/text.js';


const assign = Object.assign;


assign(Event.constructors, {
    chord:    ChordEvent,
    key:      KeyEvent,
    meter:    MeterEvent,
    note:     NoteEvent,
    param:    ParamEvent,
    rate:     RateEvent,
    sequence: SequenceEvent,
    text:     TextEvent
});

export default Event;
