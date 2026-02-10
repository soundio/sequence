
import run from 'fn/test.js';
import serialise from '../modules/events/serialise.js';
import deserialise from '../modules/events/deserialise.js';

run('serialise/deserialise note events', [
    [0, 'note', 69, Math.fround(0.8), 2],
    [2, 'note', 72, Math.fround(0.6), 1.5]
], (test, done) => {
    const buffer = serialise([
        [0, 'note', 69, 0.8, 2],
        [2, 'note', 72, 0.6, 1.5]
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});


run('serialise/deserialise meter, chord, key events', [
    [0, 'meter', 4, 1],
    [0, 'key', 2],
    [4, 'chord', 0, 'min7', 4],
], (test, done) => {
    const buffer = serialise([
        [0, 'meter', 4, 1],
        [0, 'key', 2],
        [4, 'chord', 0, 'min7', 4]
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});


run('serialise/deserialise start/stop events', [
    [0, 'start', 69, Math.fround(0.8)],
    [2, 'stop', 69, Math.fround(0.5)]
], (test, done) => {
    const buffer = serialise([
        [0, 'start', 69, 0.8],
        [2, 'stop', 69, 0.5]
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});


run('serialise/deserialise text event', [
    [0, 'text', 'Hello world', 4]
], (test, done) => {
    const buffer = serialise([
        [0, 'text', 'Hello world', 4]
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});


run('serialise/deserialise sequence with transforms', [
    [0, 'sequence', 1, 0, 8, 'transpose', 2, 'rate', 0.5]
], (test, done) => {
    const buffer = serialise([
        [0, 'sequence', 1, 0, 8, 'transpose', 2, 'rate', 0.5]
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});


run('serialise/deserialise param event with curve', [
    [0,   'param', 'gain', Math.fround(0.1), 'step'],
    [0.7, 'param', 'gain', 0.5, 'exponential'],
    [1.9, 'param', 'gain', 0,   'target', 3]
], (test, done) => {
    const buffer = serialise([
        [0,   'param', 'gain', 0.1, 'step'],
        [0.7, 'param', 'gain', 0.5, 'exponential'],
        [1.9, 'param', 'gain', 0,   'target', 3]
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});


run('serialise/deserialise rate event', [
    [0, 'rate', 120, 'linear']
], (test, done) => {
    const buffer = serialise([
        [0, 'rate', 120, 'linear']
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});
