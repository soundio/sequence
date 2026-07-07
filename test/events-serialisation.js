
import run from 'fn/test.js';
import serialise from '../modules/events/serialise.js';
import deserialise from '../modules/events/deserialise.js';
import { CHORDNUMBERS } from '../modules/event/chord.js';

run('Serialise "note" events', [
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


run('Serialise "meter", "chord", "key" events', [
    [0, 'meter', 4, 1],
    [0, 'key', 2],
    [4, 'chord', 0, CHORDNUMBERS['-7'], 4],
], (test, done) => {
    const buffer = serialise([
        [0, 'meter', 4, 1],
        [0, 'key', 2],
        [4, 'chord', 0, '-7', 4]
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});


run('Serialise "start", "stop" events', [
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


run('Serialise "text" events', [
    [0, 'text', 'Hello world', 4]
], (test, done) => {
    const buffer = serialise([
        [0, 'text', 'Hello world', 4]
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});


run('Serialise "sequence" events', [
    [1, 'sequence', 1, 0, 8],
    [2, 'sequence', 1, 0, 8, 'transpose', 2, 'rate', 0.5]
], (test, done) => {
    const buffer = serialise([
        [1, 'sequence', 1, 0, 8],
        [2, 'sequence', 1, 0, 8, 'transpose', 2, 'rate', 0.5]
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});


run('Serialise "param" events', [
    [0,   'param', 'gain', Math.fround(0.1), 'step'],
    [0.7, 'param', 'gain', 0.5, 'exponential'],
    [1.9, 'param', 'gain', 0,   'target', 3],
    [1.9, 'param', 'gain', [0,0.5,0.75,1], 'curve', 3]
], (test, done) => {
    const buffer = serialise([
        [0,   'param', 'gain', 0.1, 'step'],
        [0.7, 'param', 'gain', 0.5, 'exponential'],
        [1.9, 'param', 'gain', 0,   'target', 3],
        [1.9, 'param', 'gain', [0,0.5,0.75,1], 'curve', 3]
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});


run('Serialise "rate" events', [
    [0,  'rate', 120, 'step'],
    [24, 'rate', 90, 'exponential']
], (test, done) => {
    const buffer = serialise([
        [0,  'rate', 120, 'step'],
        [24, 'rate', 90, 'exponential']
    ]);

    const result = deserialise(buffer);

    for (const event of result) test(event);
    done();
});
