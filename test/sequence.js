
import run from 'fn/test.js';
import Sequence from '../modules/sequence.js';


run('Sequence(events)', [
    [5, "note", "A4", 0.1, 1],
    [6, "note", "B4", 0.1, 1]
], (test, done) => {
    const sequence = Sequence.of(
        [5, "note", "A4", 0.1, 1],
        [6, "note", "B4", 0.1, 1],
    );

    let e;
    for (e of sequence) test(e);
    done();
});


run('Sequence(events, sequences)', [
    [4, "sequence", 1, 0, 2],
    [4, "note", "A4", 0.1, 1],
    [5, "note", "B4", 0.1, 1]
], (test, done) => {
    const sequence = new Sequence([
        [4, "sequence", 1, 0, 2]
    ], [{
        "id": 1,
        "events": [
            [0, "note", "A4", 0.1, 1],
            [1, "note", "B4", 0.1, 1],
            [2, "note", "C5", 0.1, 1],
            [3, "note", "D5", 0.1, 1]
        ]
    }]);

    let e;
    for (e of sequence) test(e);
    done();
});

run('Sequence(events, sequences) transforms', [
    [4,   "sequence", 1, 0, 2, "rate", 2],
    [4,   "note", "A4", 0.1, 1],
    [4.5, "note", "B4", 0.1, 1],
    [5,   "note", "C5", 0.1, 1],
    [5.5, "note", "D5", 0.1, 1]
], (test, done) => {
    const sequence = new Sequence([
        [4, "sequence", 1, 0, 2, "rate", 2]
    ], [{
        "id": 1,
        "events": [
            [0, "note", "A4", 0.1, 1],
            [1, "note", "B4", 0.1, 1],
            [2, "note", "C5", 0.1, 1],
            [3, "note", "D5", 0.1, 1]
        ]
    }]);

    let e;
    for (e of sequence) test(e);
    done();
});
