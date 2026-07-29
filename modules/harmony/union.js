/**
union(a, b)
Fast union for ascending arrays of numbers. Returns array of numbers found in
`a` or `b` or both.
**/

export default function union(a, b) {
    const array = [];
    let n = 0, m = 0;
    // Push numbers from a or b until a is exhausted
    while (a[n] !== undefined) {
        if (b[m] === undefined || a[n] < b[m]) {
            array.push(a[n]);
            ++n;
        }
        else if (a[n] > b[m]) {
            array.push(b[m]);
            ++m;
        }
        else {
            array.push(a[n]);
            ++n;
            ++m;
        }
    }
    // Push remaining numbers from b
    while (b[m] !== undefined) {
        array.push(b[m]);
        ++m;
    }
    // Return array
    return array;
}
