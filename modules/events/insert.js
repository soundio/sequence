
import insert     from 'fn/insert.js';
import byPriority from './by-priority.js';


export default function insertEvent(events, event) {
    return !events.length || byPriority(events[events.length - 1], event) < 1 ?
        events.push(event) - 1 :
        insert(byPriority, events, event) ;
}
