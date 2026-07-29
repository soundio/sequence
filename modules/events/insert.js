
import insert     from 'fn/insert.js';
import byPriority from './by-priority.js';


export default function insertEvent(events, event) {
    return insert(byPriority, events, event);
}
