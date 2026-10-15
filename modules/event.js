
import Event         from './event/event.js';
import ChordEvent    from './event/chord.js';
import KeyEvent      from './event/key.js';
import MeterEvent    from './event/meter.js';
import NoteEvent     from './event/note.js';
import ControlEvent  from './event/control.js';
import RateEvent     from './event/rate.js';
import SequenceEvent from './event/sequence.js';
import TextEvent     from './event/text.js';

Event.ChordEvent    = ChordEvent;
Event.KeyEvent      = KeyEvent;
Event.MeterEvent    = MeterEvent;
Event.NoteEvent     = NoteEvent;
Event.ControlEvent  = ControlEvent;
Event.RateEvent     = RateEvent;
Event.SequenceEvent = SequenceEvent;
Event.TextEvent     = TextEvent;

Event.chord    = ChordEvent.of;
Event.key      = KeyEvent.of;
Event.meter    = MeterEvent.of;
Event.note     = NoteEvent.of;
Event.control  = ControlEvent.of;
Event.rate     = RateEvent.of;
Event.sequence = SequenceEvent.of;
Event.text     = TextEvent.of;

Event.isChord    = (event) => event instanceof ChordEvent;
Event.isKey      = (event) => event instanceof KeyEvent;
Event.isMeter    = (event) => event instanceof MeterEvent;
Event.isNote     = (event) => event instanceof NoteEvent;
Event.isControl  = (event) => event instanceof ControlEvent;
Event.isParam    = (event) => { throw new Error('Event.isParam() now Event.isControl()'); }
Event.isRate     = (event) => event instanceof RateEvent;
Event.isSequence = (event) => event instanceof SequenceEvent;
Event.isText     = (event) => event instanceof TextEvent;

export default Event;
