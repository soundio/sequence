/**
difference(a, b)
Fast difference for ascending arrays of numbers. Returns array of numbers from
`a` not found in `b`.
**/

export default function difference(a, b) {
    const array = [];
    let n = -1, m = -1;
    while (a[++n] !== undefined) {
        while (b[++m] !== undefined && b[m] < a[n]);
        if (b[m] !== a[n]) array.push(a[n]);
        --m;
    }
    return array;
}
