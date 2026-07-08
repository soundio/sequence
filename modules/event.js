
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


Event.ChordEvent    = ChordEvent;
Event.KeyEvent      = KeyEvent;
Event.MeterEvent    = MeterEvent;
Event.NoteEvent     = NoteEvent;
Event.ParamEvent    = ParamEvent;
Event.RateEvent     = RateEvent;
Event.SequenceEvent = SequenceEvent;
Event.TextEvent     = TextEvent;

Event.chord    = ChordEvent.of;
Event.key      = KeyEvent.of;
Event.meter    = MeterEvent.of;
Event.note     = NoteEvent.of;
Event.param    = ParamEvent.of;
Event.rate     = RateEvent.of;
Event.sequence = SequenceEvent.of;
Event.text     = TextEvent.of;

export default Event;
