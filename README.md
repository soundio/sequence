# Sequence

Sequence data is a structure for storing and transferring sequences of timed
performance data, designed to align with the requirements of the WebAudio API.
As a high resolution format it is transformable to MIDI 2.0 with minimal loss,
and MIDI 1.0 with significant loss in resolution.

This repository contains:

- Specification of the Sequence format (this README)
- AT Protocol lexicon ([io.sound.sequence](https://atproto.at/lexicon/io.sound.sequence))
- Reference implementations of `Sequence`, `Event`, `Transform` and `SequenceIterator` in JS
- Parsers, event serialisers and deserialisers

Sequence data may be represented as:

- **Sequence JSON** JSON (`.json`, `type="application/json"`)
- **AT Protocol record** JSON with serialised events ([io.sound.sequence](https://atproto.at/lexicon/io.sound.sequence), `.json`, `type="application/json"`)
- **Sequence text** human readable text format (`.sequence`, `type="text/sequence"`)

> [!NOTE]
> Consumers of Sequence data are expected to silently ignore properties and
> event types not documented here. Sequence data is an extensible base format
> for building things on top of.

> [!CAUTION]
> This document is not a final draft. The format is subject to change.


## Quick start - Reference implementation API

The JS implementation in this repository provides an API to parse and modify
Sequence data. Get data in:

```js
import { Sequence } from './module.js';

// Create a Sequence from data
const sequence = Sequence.from({
    [0, "meter", 10, 1],
    [0, "rate", 2],
    [0, "chord", "C", "∆", 4],
    [2, "note", "E5", 0.1, 0.5]
});

// Or parse from human-readable Sequence text
const sequence = Sequence.parse(`
    0 meter 4/4
    0 rate 2
    0 chord C∆ 4
    2 E5 0.5
`);
```

Iterate over events:

```js
let event;
for (event of sequence) {
    // Do something with event ...
}
```

Get data out:

```js
// Convert sequence to JSON:
const json = JSON.stringify(sequence);

// Serialise sequence to AT Protocol record JSON
const record = Sequence.toATProtoRecord(sequence);

// Convert a sequence to human-readable Sequence text
const text = sequence.toString();
```


# Sequence data

The Sequence format defines two principle data structures: a `Sequence` object
and an `Event` which is represented in JSON as an array.

Sequence data describes all times and durations in beats. Beat values are
arbitrary, and depend on the rate of playback of a sequence.

> [!NOTE]
> A sequence playing back at a rate of `1` is running at 1 beat per second,
> or 60bpm – absolute time.

As an example, here are the first two bars of Dolphin Dance represented as
Sequence JSON:

```json
{
    "name": "Dolphin Dance",
    "events": [
        [0,   "meter", 10, 1],
        [0,   "rate", "step", 2],
        [0,   "chord", "C", "∆", 4],
        [2,   "note", "E5", "mp", 0.5],
        [2.5, "note", "F5", "mf", 0.5],
        [3,   "note", "G5", "mp", 0.5],
        [3.5, "note", "D5", "mf", 3.5],
        [4,   "chord", "G", "-7", 4],
        [10,  "note", "E5", "-16dB", 0.5]
    ]
}
```


## Sequence

A sequence, at its simplest, is an object with an `events` array:

```json
{
    "events": [...]
}
```

`events` – ARRAY<br/>
An array of events.

A Sequence may also have the properties:

```json
{
    "id": 1,
    "url": "https://...",
    "version": 1,
    "name": "Dolphin Dance",
    "events": [...],
    "sequences": [...],
    "credits": [...],
    "tags": [...]
}
```

`id` – INT [1-65535], optional<br/>
In any `sequences` array `id` must be unique, and is used to identify the
nested sequence for playback by `"sequence"` events. A top-level sequence does
not require an `id`.

`url` – URI STRING, optional<br/>
Canonical location of this sequence (e.g. an `at://` URI or `https://` URL).

`name` – STRING, optional<br/>
Name of the sequence.

`sequences` – ARRAY, optional<br/>
An array of nested sequence objects, referenced by `id` from `"sequence"`
events in the `events` array. If there are no `"sequence"` events, `sequences`
is not required.

`credits` – ARRAY, optional<br/>
An array of objects containing details of contributors, of the form
`{ name, role, url }` (conforming to `io.sound.credit`).

`tags` – ARRAY, optional<br/>
An array of strings used to classify the sequence.


---

## Event

An event is expressed in JSON as an array.

```js
[beat, type, ...params]
```

`beat` – FLOAT<br/>
Describes a point in time from the start of the sequence in beats.

`type` – STRING | INT<br/>
The event type name (or numeric type ID `1–8`), which determines the length of
the event array and the structure of the remaining values:

| beat   | type         | 2            | 3           | 4          | 5...            |
| :----- | :----------- | :----------- | :---------- | :--------- | :-------------- |
| `beat` | `"sequence"` | `identifier` | `target`    | `duration` | `...transforms` |
| `beat` | `"note"`     | `pitch`      | `gain`      | `duration` |  |
| `beat` | `"control"`  | `address`    | `value`     | `duration` |  |
| `beat` | `"rate"`     | `curve`      | `value`     | `duration` |  |
| `beat` | `"key"`      | `name`       |  |  |  |
| `beat` | `"meter"`    | `rsid`       | `divisor`   |  |  |
| `beat` | `"chord"`    | `root`       | `extension` | `duration` |  |
| `beat` | `"text"`     | `duration`   | `text`      |  |  |


---

### `"sequence"`

###### JSON
```js
[beat, "sequence", sequenceId, targetId, duration, ...transforms]
```

###### API
```js
Event.sequence(beat, sequenceId, targetId, duration, ...transforms);
```

Plays events from a sequence in this sequence's `sequences` array. Output events
have a target id or address assigned and optionally, events are transformed on
playback.

`sequenceId` – INT [1-65535]<br/>
The `id` of a sequence found in the parent sequence's `sequences` array.

`targetId` – INT<br/>
The identifier of an instrument object to route the nested sequence to.

`duration` – FLOAT<br/>
The duration in beats to play the nested sequence (in the parent sequence's beat
frame of reference).

`...transforms` – optional sequence of transform pairs<br/>
Transforms are applied to events yielded by the nested sequence during iteration
and consumed (they do not appear on the iterated output events):

- `"displace", beats` – shifts event beats inside the nested sequence
- `"rate", scale` – scales playback speed (`2` = double speed / half duration)
- `"transpose", semitones` – shifts pitch of `"note"` and `"chord"` events
- `"gain", scale` – scales linear gain of `"note"` events
- `"swing", division, strength` – applies swing quantisation

For example, this event sends sequence `1` to instrument `3` starting at beat
`0.5` for `4` beats, transposed up `2` semitones at rate `1.5`:

```json
[0.5, "sequence", 1, 3, 4, "transpose", 2, "rate", 1.5]
```


---

### `"note"`

Represents a musical note.

###### JSON
```js
[beat, "note", pitch, gain, duration]
```

###### API
```js
Event.note(beat, pitch, gain, duration);
```

`pitch` – FLOAT [0-127] | STRING<br/>
Represents the pitch of a note. When `pitch` is a number, it is a number on the
standard MIDI note number scale (MIDI note `69` is `440Hz`, `60` is `C4`), but
where floats are permitted, to allow for notes of any frequency. When `pitch` is
a string, it is a note name (`"C0"`–`"G9"`, accepting both ASCII `#`/`b` and
unicode `♯`/`♭` sharps and flats) or a standard drum/percussion name.

`gain` – FLOAT [0-*n*] | STRING ["-*n*dB"] | STRING ["ppp"-"fff"]<br/>
Represents the amplitude or attack velocity of the note. Accepts a linear gain
number (`0` to `1`), a decibel string (e.g. `"-6dB"`), or a dynamic marking
(`"ppp"` to `"fff"`).

`duration` – FLOAT [0-n]<br/>
Represents the duration of the note in beats.

> [!NOTE]
> Realtime iterators may decompose note events into `"start"` and `"stop"`
> events on playback.


---

### `"control"`

An automation event for an instrument parameter, representing a value and an
automation curve to transition to that value.

###### JSON
```js
[beat, "control", address, value]
[beat, "control", address, value, duration]
```

###### API
```js
Event.control(beat, address, value);
Event.control(beat, address, value, duration);
```

`address` – INT | STRING<br/>
Identifies both the parameter to control and the transition curve. As a string,
it may be `"parameter"` or `"parameter.curve"` (e.g. `"modulation"`,
`"modulation.set"`, or `"modulation.target"`).

The parameter part of `address` is the name of a recognised MIDI CC, RPN,
spatial, or WebAudio `AudioParam` parameter property (e.g. `"modulation"`,
`"gain"`, `"pan"`, `"sustain"`, `"frequency"`, `"Q"`, `"detune"`, ...).

The curve part of `address` id one of `"set"`, `"linear"`, `"exponential"`,
`"target"`, `"hold"`, or `"cancel"`.

When expressed as an integer, both parameter and curve are mapped to ids and
packed into a single integer.

`value` – FLOAT<br/>
The destination value of the parameter.

`duration` – FLOAT, optional<br/>
Where the `address` curve is `"target"`, represents an exponential timeConstant
(mirroring WebAudio's `setTargetAtTime`), but expressed in beats.


---

### `"rate"`

An automation event for the rate of playback of the current sequence,
representing a rate value and an automation curve to transition to that value.

```js
[beat, "rate", "hold"]
[beat, "rate", "cancel"]
[beat, "rate", curve, value]
[beat, "rate", "target", value, duration]
```

`curve` – STRING `"step"`, `"linear"`, `"exponential"`, `"target"`, `"hold"`,
or `"cancel"`<br/>
Represents the type of ramp to use to transition to the new rate. For
`"linear"` and `"exponential"`, the previous rate event transitions smoothly to
`value` at `beat`. Where `curve` is `"hold"` or `"cancel"`, no `value` is
required.

`value` – FLOAT<br/>
Rate of playback of a sequence in beats per second. Nested sequences may have
their own rate events or `"rate"` transforms, and rates are cumulative: if
sequence A is playing at rate `2` and contains sequence B playing at rate `1.5`,
sequence B plays at an absolute rate of `3` (3 beats per second, or 180 bpm).

`duration` – FLOAT<br/>
Where `curve` is `"target"`, represents the `timeConstant` in beats over which
the rate asymptotically approaches `value`.

Where there is no `"rate"` event at beat `0`, playback defaults to a rate of
`1` (`[0, "rate", "step", 1]`), i.e. 1 beat per second (60 bpm).


---

### `"meter"`

Sets the meter of playback.

###### JSON
```js
[beat, "meter", rsid, divisor]
```

###### API
```js
Event.meter(beat, rsid, divisor);
```

`rsid` – UINT<br/>
A Rhythmic Structure ID. An RSID is a single integer whose binary representation
describes rhythmic units as hits (`1`s) and rests (`0`s), each of duration
`divisor`. A 4/4 meter with pulses on beats 1 and 3 in is binary `1010`, or RSID
`10`, with divisor `1` to represent .

`divisor` – FLOAT<br/>
The duration of a rhythmic unit in beats, where 1 beat is a quarter note. Must
be a power-of-2 number, e.g. `0.25`, `0.5`, `1`...

Here are some common time signatures as meter events:

| timesig | RSID            | event                   |
| :------ | :-------------- | :---------------------- |
| 2/2     | 11 or `3`       | `[0, "meter", 3, 2]`    |
| 2/4     | 10 or `2`       | `[0, "meter", 2, 1]`    |
| 3/4     | 100 or `4`      | `[0, "meter", 4, 1]`    |
| 4/4     | 1010 or `10`    | `[0, "meter", 10, 1]`   |
| 6/8     | 100100 or `36`  | `[0, "meter", 36, 0.5]` |

RSIDs express divisions in meter. Consider a bar of 5/4. There are two common
ways of subdividing 5 beats: 3:2 and 2:3. Both are expressable as an RSID.
Here are some examples.

| timesig | division | RSID            | event                   |
| :------ | :------- | :-------------- | :---------------------- |
| 5/4     | 3:2      | 10010 or `18`   | `[0, "meter", 18, 1]`   |
|         | 2:3      | 10100 or `20`   | `[0, "meter", 20, 1]`   |
| 7/8     | 4:3      | 1000100 or `68` | `[0, "meter", 68, 0.5]` |
|         | 3:4      | 1001000 or `72` | `[0, "meter", 72, 0.5]` |
|         | 2:2:3    | 1010100 or `84` | `[0, "meter", 84, 0.5]` |

A meter event MUST occur at a beat that is a full bar from a previous meter
event. The second event here is valid:

```json
[0, "meter", 10, 1]
[4, "meter", 7, 1]
```

Where here the second event is invalid:

```json
[0, "meter", 10, 1]
[2, "meter", 7, 1]
```

Consumers may choose to recover from invalid `"meter"` events by truncating the
current bar, or choose to throw an error.

Meter events have no effect on the rate of the beat clock (although they may
have an effect on a metronome or rhythm generator).


---

### `"chord"`

###### JSON
```js
[beat, "chord", root, extension, duration]
```

###### API
```js
Event.chord(beat, root, extension, duration)
```

`root` – INT [0-11] | STRING ["A♭"-"G♯"]<br/>
Represents the root of a chord. Where `root` is a number it represents the pitch
class `0–11` (`0` = `C`). Where `root` is a string it must be a root note name:
`"C"`, `"C♯"`, `"D"`, ..., `"B♭"`, `"B"`.

`extension` – INT (HSID) | STRING<br/>
Represents a harmonic structure as a chord quality string (e.g. `"∆"`, `"-7"`,
`"7♯11"`) or a numeric **Harmonic Structure ID** (HSID).

An HSID is an integer that identifies, can be encoded from, and can be decoded
to, an array of ascending note numbers. All chords, modes and scales, and a vast
number of larger harmonic structures, have an HSID. A single note always has an
HSID of `0` and simple intervals map so that a semitone `[0, 1]` has HSID `1`,
a whole tone `[0, 2]` has HSID `2` and so on.

HSIDs encode intervals between notes using base 36 (6 bit) maths. In JavaScript,
64-bit numbers safely carry integers up to `Number.MAX_SAFE_INTEGER`. This
imposes two constraints:

- Consecutive note numbers cannot have an interval any greater than 35
- Harmonic structures are limited to 11 note numbers (10 intervals)

Chords belong to the set of HSIDs that represent notes clamped to a single octave.

| Symbol      | HSID       | Pitch offsets               | Meaning |
| :---------- | :--------- | :-------------------------- | :-------------------------------------------- |
| `""`        | 3962       | `[0, 2, 4, 7]`              | Major (`"maj"`) |
| `"+"`       | 5258       | `[0, 2, 4, 8]`              | Augmented (`"aug"`) |
| `"sus"`     | 2702       | `[0, 2, 5, 7]`              | Suspended 4th |
| `"sus♭9"`   | 2737       | `[0, 1, 5, 7]`              | Suspended 4th flat 9 |
| `"-"`       | 5222       | `[0, 2, 3, 7]`              | Minor (`"min"`, `"m"`) |
| `"°"`       | 3926       | `[0, 2, 3, 6]`              | Diminished (`"dim"`) |
| `"{8}/"`    | 2775       | `[0, 3, 8, 10]`             | Major 1st inversion (e.g. `C/E`, root `E`) |
| `"{5}/"`    | 2669       | `[0, 5, 7, 9]`              | Major 2nd inversion (e.g. `C/G`, root `G`) |
| `"{4}/"`    | 4036       | `[0, 4, 8, 11]`             | Major over ♭6 bass (e.g. `C/A♭`, root `A♭`) |
| `"{9}-/"`   | 2776       | `[0, 4, 9, 11]`             | Minor 1st inversion (e.g. `C-/E♭`, root `E♭`) |
| `"{5}-/"`   | 1373       | `[0, 5, 7, 8]`              | Minor 2nd inversion (e.g. `C-/G`, root `G`) |
| `"{1}/"`    | 4033       | `[0, 1, 5, 8]`              | Major over 7th bass (e.g. `C/B`, root `B`) |
| `"{11}/"`   | 6591       | `[0, 3, 6, 11]`             | Major over ♭2 bass (e.g. `C/D♭`, root `D♭`) |
| `"{8}7/"`   | 96015      | `[0, 3, 6, 8, 10]`          | Dominant 7th 1st inversion (e.g. `C7/E`, root `E`) |
| `"{5}7/"`   | 5259       | `[0, 3, 5, 9]`              | Dominant 7th 2nd inversion (e.g. `C7/G`, root `G`) |
| `"ø"`       | 5295       | `[0, 3, 6, 10]`             | Half-diminished 7th (`"m7♭5"`, `"min7♭5"`) |
| `"∆6"`      | 2704       | `[0, 4, 7, 9]`              | Major 6th |
| `"∆6/9"`    | 97274      | `[0, 2, 4, 7, 9]`           | Major 6/9 (pentatonic) |
| `"∆"`       | 3456506    | `[0, 2, 4, 7, 9, 11]`       | 1st mode of the major scale (ionian, `"maj7"`) |
| `"∆♯11"`    | 124340906  | `[0, 2, 4, 6, 7, 9, 11]`    | 4th mode of the major scale (lydian) |
| `"7sus"`    | 142670     | `[0, 2, 5, 7, 10]`          | Dominant 7th suspended 4th |
| `"7"`       | 143930     | `[0, 2, 4, 7, 10]`          | 5th mode of the major scale (mixolydian) |
| `"13sus"`   | 1775630    | `[0, 2, 5, 7, 9, 10]`       | Dominant 13th suspended 4th |
| `"13"`      | 1776890    | `[0, 2, 4, 7, 9, 10]`       | Dominant 13th |
| `"-11"`     | 235910     | `[0, 2, 3, 5, 10]`          | Minor 11th (`"m11"`) |
| `"-6"`      | 3455174    | `[0, 2, 3, 5, 7, 9]`        | Minor 6th (`"m6"`) |
| `"-7"`      | 63921350   | `[0, 2, 3, 5, 7, 9, 10]`    | 2nd mode of the major scale (dorian, `"min7"`, `"m7"`) |
| `"-∆"`      | 124387526  | `[0, 2, 3, 5, 7, 9, 11]`    | 1st mode of melodic minor |
| `"7♯11"`    | 63874730   | `[0, 2, 4, 6, 7, 9, 10]`    | 4th mode of melodic minor |
| `"7♭13"`    | 122706650  | `[0, 2, 4, 5, 7, 8, 10]`    | 5th mode of melodic minor |
| `"+7"`      | 3455210    | `[0, 2, 4, 6, 8, 10]`       | Whole tone |
| `"°7"`      | 4417439366 | `[0, 2, 3, 5, 6, 8, 9, 11]` | Diminished whole step / half step (`"dim7"`) |
| `"7♯9"`     | 63874695   | `[0, 3, 4, 6, 7, 9, 10]`    | Dominant 7th sharp 9 (Hendrix chord) |
| `"7alt"`    | 124386265  | `[0, 1, 3, 4, 6, 8, 10]`    | 7th mode of melodic minor |
| `"7♭9"`     | 183172825  | `[0, 1, 3, 4, 6, 7, 10]`    | Half step / whole step (no 13th) |
| `"13♭9"`    | 2299488985 | `[0, 1, 3, 4, 6, 7, 9, 10]` | Diminished half step / whole step |
| `"7sus♭9"`  | 142705     | `[0, 1, 5, 7, 10]`          | Japanese insen scale |
| `"13sus♭9"` | 63921385   | `[0, 1, 3, 5, 7, 9, 10]`    | 2nd mode of melodic minor |
| `"7♭9♭13"`  | 122706685  | `[0, 1, 4, 5, 7, 8, 10]`    | 5th mode of harmonic minor |
| `"-♭6"`     | 122707910  | `[0, 2, 3, 5, 7, 8, 10]`    | 6th mode of the major scale (aeolian) |
| `"-♭9"`     | 122707945  | `[0, 1, 3, 5, 7, 8, 10]`    | 3rd mode of the major scale (phrygian) |
| `"ø9"`      | 124340870  | `[0, 2, 3, 5, 6, 8, 10]`    | 6th mode of melodic minor |
| `"∆♯4♯5"`   | 122707946  | `[0, 2, 4, 6, 8, 9, 11]`    | 3rd mode of melodic minor |
| `"-∆♭6"`    | 183174086  | `[0, 2, 3, 5, 7, 8, 11]`    | 1st mode of harmonic minor |
| `"∆♭6"`     | 5089466    | `[0, 2, 4, 7, 8, 11]`       | 1st mode of harmonic major |

`duration` – FLOAT<br/>
The duration of the chord in beats (defaults to `2`).


---

### `"key"`

###### JSON
```js
[beat, "key", name]
```

###### API
```js
Event.key(beat, name);
```

`name` – STRING | INT [-7..7]<br/>
The name of a major key – a capital letter followed optionally by an accidental,
such as `"A♭"`, `"A"`, `"B♭"`, `"B"`, `"C"`, and so on – or a line-of-fifths
integer (`-7` to `7`, where `0` is `"C"`).

Represents a visual key change in written notation only. Does not affect how a
performance sounds.

> [!NOTE]
> Harmonic generators should read `"chord"` events to generate sound based on
> modes, scales and chords.


---

### `"text"`

###### JSON
```js
[beat, "text", duration, text]
```

###### API
```js
Event.text(beat, duration, text);
```

`duration` – FLOAT<br/>
The duration in beats that the text spans.

`text` – STRING<br/>
A string of text (up to 255 UTF-8 bytes when binary-serialised).


---

## Implementations

- <a href="http://github.com/soundio/soundstage">Soundstage</a> is a WebAudio wrapper and playback sequencer that consumes and outputs Sequence data.
- <a href="http://github.com/stephband/scribe/">Scribe</a> takes a sequence of musical events – notes, chords, meter changes and so on – interprets them, and renders responsive music notation in HTML and CSS using `<scribe-music>`.

## References

- AT Protocol Lexicon: <a href="https://atproto.at/lexicon/io.sound.sequence">io.sound.sequence</a>
- OSC spec: <a href="http://opensoundcontrol.org/spec-1_0">http://opensoundcontrol.org/spec-1_0</a>
- OSC example messages: <a href="http://opensoundcontrol.org/files/OSC-Demo.pdf">http://opensoundcontrol.org/files/OSC-Demo.pdf</a>
- MusicXML: <a href="http://www.musicxml.com/for-developers/">http://www.musicxml.com/for-developers/</a>
- SMuFL: <a href="https://smufl.formats.music/latest/">https://smufl.formats.music/latest/</a>
