
import run from 'fn/test.js';
import SequenceIterator from '../modules/sequence-iterator.js';


run('SequenceIterator(events)', [
    [5, "note", 69, 0.1, 1],
    [6, "note", 71, 0.1, 1]
], (test, done) => {
    const iterator = new SequenceIterator([
        [5, "note", "A4", 0.1, 1],
        [6, "note", "B4", 0.1, 1],
    ]);

    let e;
    for (e of iterator) test(e);
    done();
});


run('SequenceIterator(events, sequences)', [
    [4, "sequence", 1, 0, 2],
    [4, "note", 69, 0.1, 1],
    [5, "note", 71, 0.1, 1]
], (test, done) => {
    const iterator = new SequenceIterator([
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
    for (e of iterator) test(e);
    done();
});

run('SequenceIterator(events, sequences) transforms', [
    [4,   "sequence", 1, 0, 2, "rate", 2],
    [4,   "note", 69, 0.1, 0.5],
    [4.5, "note", 71, 0.1, 0.5],
    [5,   "note", 72, 0.1, 0.5],
    [5.5, "note", 74, 0.1, 0.5]
], (test, done) => {
    const iterator = new SequenceIterator([
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
    for (e of iterator) test(e);
    done();
});
