
export const name = 'transpose';

export function apply(event, n) {
    event.transpose(n);
    return event;
}

export function unapply(event, n) {
    event.transpose(-1 * n);
    return event;
}

export const BYTES = 2;  // name (1) + transposition (1)
