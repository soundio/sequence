
export const name = 'displace';

export function apply(event, n) {
    event[0] += n;
    return event;
}

export function unapply(event, n) {
    event[0] -= n;
    return event;
}

export const BYTES = 9;
