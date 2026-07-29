
export const name = 'rate';

export function apply(event, rate) {
    // Transform beat
    event[0] /= rate;
    // Transform duration - DO WE WANT TO BE DOING THIS TO SEQUENCE EVENTS?
    if (event.duration !== undefined)  event.duration /= rate;
    // Return event
    return event;
}

export function unapply(event, rate) {
    // Transform beat
    event[0] *= rate;
    // Transform duration - DO WE WANT TO BE DOING THIS TO SEQUENCE EVENTS?
    if (event.duration !== undefined)  event.duration *= rate;
    // Return event
    return event;
}

export const BYTES = 5; // Int8 name Float32 rate
