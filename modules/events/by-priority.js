const priorities = {
    // The higher the priority, the earlier an event is ordered
    key: 2,
    meter: 1,
    default: 0
};

function priority(event) {
    return priorities[event.type] || priorities.default;
}

export default function byPriority(b, a) {
        // a is before b
    return a[0] < b[0] ? 1 :
        // a is after b
        a[0] > b[0] ? -1 :
        // a and b are at the same time, prioritise by event type
        priority(a) - priority(b) ;
}
