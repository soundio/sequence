
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import serialise from '../modules/record/serialise.js';
import deserialise from '../modules/record/deserialise.js';
import { CHORDNUMBERS } from '../modules/event/chord.js';


Deno.test('Serialise "note" events', () => {
    const buffer = serialise([
        [0, 'note', 69, 0.8, 2],
        [2, 'note', 72, 0.6, 1.5]
    ]);

    equals([...deserialise(buffer)], [
        [0, 'note', 69, Math.fround(0.8), 2],
        [2, 'note', 72, Math.fround(0.6), 1.5]
    ]);
});


Deno.test('Serialise "meter", "chord", "key" events', () => {
    const buffer = serialise([
        [0, 'meter', 4, 1],
        [0, 'key', 2],
        [4, 'chord', 0, '-7', 4]
    ]);

    equals([...deserialise(buffer)], [
        [0, 'meter', 4, 1],
        [0, 'key', 2],
        [4, 'chord', 0, CHORDNUMBERS['-7'], 4]
    ]);
});


Deno.test('Serialise "start", "stop" events', () => {
    const buffer = serialise([
        [0, 'start', 69, 0.8],
        [2, 'stop', 69, 0.5]
    ]);

    equals([...deserialise(buffer)], [
        [0, 'start', 69, Math.fround(0.8)],
        [2, 'stop', 69, Math.fround(0.5)]
    ]);
});


Deno.test('Serialise "text" events', () => {
    const buffer = serialise([
        [0, 'text', 'Hello world', 4]
    ]);

    equals([...deserialise(buffer)], [
        [0, 'text', 'Hello world', 4]
    ]);
});


Deno.test('Serialise "sequence" events', () => {
    const buffer = serialise([
        [1, 'sequence', 1, 0, 8],
        [2, 'sequence', 1, 0, 8, 'transpose', 2, 'rate', 0.5]
    ]);

    equals([...deserialise(buffer)], [
        [1, 'sequence', 1, 0, 8],
        [2, 'sequence', 1, 0, 8, 'transpose', 2, 'rate', 0.5]
    ]);
});


Deno.test('Serialise "param" events', () => {
    const buffer = serialise([
        [0,   'param', 'gain', 0.1, 'step'],
        [0.7, 'param', 'gain', 0.5, 'exponential'],
        [1.9, 'param', 'gain', 0,   'target', 3],
        [1.9, 'param', 'gain', [0,0.5,0.75,1], 'curve', 3]
    ]);

    equals([...deserialise(buffer)], [
        [0,   'param', 'gain', Math.fround(0.1), 'step'],
        [0.7, 'param', 'gain', 0.5, 'exponential'],
        [1.9, 'param', 'gain', 0,   'target', 3],
        [1.9, 'param', 'gain', [0,0.5,0.75,1], 'curve', 3]
    ]);
});


Deno.test('Serialise "rate" events', () => {
    const buffer = serialise([
        [0,  'rate', 120, 'step'],
        [24, 'rate', 90, 'exponential']
    ]);

    equals([...deserialise(buffer)], [
        [0,  'rate', 120, 'step'],
        [24, 'rate', 90, 'exponential']
    ]);
});
