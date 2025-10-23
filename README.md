# Sequence JSON

A simple format for representing sequences of timed events in JSON.

This format defines a minimal set of events that get music working, with the objective of supporting applications
of the WebAudio and WebMIDI APIs. However, it is designed to be extensible. Consumers of Sequence JSON are expected
to silently ignore unsupported event types so that users may also sequence their own data.


## Concepts

The Sequence format defines two data structures, a Sequence object and an Events array.

SequenceJSON describes all times and durations in beats. Beat values are arbitrary, and depend on the rate of playback
of a sequence. A sequence playing back at a rate of `1` is running at 1 beat per second, so it is following absolute time.

## Example JSON

Here are the first two bars of Dolphin Dance represented as a sequence in JSON:

```json
{
    "name": "Dolphin Dance",
    "events": [
        [0,   "meter", 4, 1],
        [0,   "rate", 2, "step"],
        [2,   "note", 76, 0.8, 0.5],
        [2.5, "note", 77, 0.6, 0.5],
        [3,   "note", 79, 1, 0.5],
        [3.5, "note", 74, 1, 3.5],
        [10,  "note", 76, 1, 0.5],
        [0,   "chord", "C", "∆", 4],
        [4,   "chord", "G", "-", 4]
    ]
}
```


## Sequence

```json
{
    "events": [...]
}
```

`events` – ARRAY<br/>
An array of events.

An `events` property is the only requirement for a top-level sequence. Sequences may also have the properties:

```json
{
    "id": "0",
    "name": "My Sequence",
    "author": {...},
    "url":  "https://...",
    "sequences": [...]
}
```

`id` – STRING<br/>
in any array of sequences it must be unique, and is used to identify the sequence for playback.
A top level sequence does not require an `id`.

`name` – STRING, optional<br/>
An arbitrary string.

`author` – OBJECT, optional<br/>
An object containing details of the author.

`url` – URL STRING, optional<br/>
Points to a resource where this sequence can be fetched as JSON.

`sequences`  – ARRAY, optional<br/>
An array of sequence objects.
Sequences are played back by `"sequence"` events in the `events` array.
If there are no `"sequence"` events  in the `events` array, the property `sequences` is not required.

---

## Event

```js
[beat, type, ...]
```

`beat` – FLOAT<br/>
Describes a point in time from the start of the sequence in beats.

`type` – STRING<br/>
The event type, determines the length of the event array and the structure of the rest of its values:

| beat   | type         | 2 | 3 | 4 | 5 |
| :----- | :----------- | :--- | :--- | :--- | :--- |
| `beat` | `"note"`     | `pitch` | `dynamic` | `duration` |  |
| `beat` | `"param"`    | `name` | `value` | `duration` | `curve` |
| `beat` | `"rate"`     | `number` |  |  |  |
| `beat` | `"meter"`    | `duration` | `divisor` |  |  |
| `beat` | `"chord"`    | `root` | `mode` | `duration` |  |
| `beat` | `"key"`      | `name` |  |  |  |
| `beat` | `"sequence"` | `id` | `target` | `duration` |  |
| `beat` | `"text"`     | `string` | `duration` |  |  |
| `beat` | `"start"`    | reserved |  |  |  |
| `beat` | `"stop"`     | reserved |  |  |  |




---

### `"note"`

```js
[beat, "note", name, dynamic, duration]
```

`name` – FLOAT [0-127] or STRING<br/>
Represents the pitch of a note.
If `name` is a number, it is a MIDI note number, but may be a float and so can represent any frequency. MIDI note number `69` is `440Hz`.
If `name` is a string it is an arbitrary pitch name. Implementations must accept at least the 128 pitch names `'C0'` - `'G9'`, and
the use of both the hash `#` and the unicode sharp `♯`, and both the small letter `b` and the unicode flat `♭` in their spellings, but
output only the unicode spellings in any Sequence data output.

`dynamic` – FLOAT [0-1]<br/>
Represents the force of the note's attack.
A `dynamic` larger than `1` is permissible, but negative `dynamic` is invalid.

`duration` – FLOAT [0-n]<br/>
Represents the duration of the note in beats.

---

### `"param"`

```js
[beat, "param", name, value]
[beat, "param", name, value, curve]
[beat, "param", name, value, "target", duration]
```

`name` – STRING<br/>
The name of the param to control.
In a WebAudio context this would typically map to an AudioParam on the instrument being targetted.

`value` – FLOAT<br/>
The destination value of the param.

`curve` – STRING `"step"`, `"linear"`, `"exponential"` or `"target"`<br/>
The ramp to use for transition to `value`.
This parameter is optional. If it is not present the event describes a `"step"` curve.
If `curve` is `"target"` the event has a fifth parameter:

`duration` – FLOAT<br/>
The decay time of the `"target"` curve.

---

### `"rate"`

```js
[beat, "rate", rate]
[beat, "rate", rate, curve]
[beat, "rate", rate, "target", duration]
```

`rate`  – FLOAT<br/>
Rate of playback of a sequence. Nominally in beats per second, but sequences may be played
from other sequences, and rates are accumulative. If sequence A is playing at rate `2` and
contains sequence B playing at rate `1.5`, sequence B is playing at an absolute rate of `3`,
or 3 beats per second, a tempo of 90bpm.

`curve` – STRING, optional<br/>
One of `"step"`, `"linear"`, `"exponential"` or `"target"`.
Represents the type of ramp to use to transition to the new rate. Where `curve` is `"target"` a duration is required:

`duration` – STRING, optional<br/>
Where `curve` is `"target"`, represents the target duration of the target curve.

Where there is no `"rate"` event at beat `0`, consumers should assume a playback rate of `2`,
as if there were an initial `[0, "rate", 2]` event in the data. A rate of `2` is a tempo of 120bpm.


---

### `"meter"`

```js
[beat, "meter", duration, division]
```

`duration` – INT<br/>
The duration of a bar, in beats.

`division` – INT<br/>
The duration of a division, in beats.

Here are some common time signatures as meter events:

| time | event |
| :--- | :---- |
| 4/4  | `[0, "meter", 4, 1]` |
| 3/4  | `[0, "meter", 3, 1]` |
| 6/8  | `[0, "meter", 3, 1.5]` |
| 2/4  | `[0, "meter", 2, 1]` |
| 7/8  | `[0, "meter", 3.5, 1.5]` |
| 7/8  | `[0, "meter", 3.5, 2]` |

A meter event MUST occur at a beat that is a full bar from a previous meter event. The second event here is valid:

```json
[0, "meter", 4, 1]
[4, "meter", 3, 1]
```

Where here it is invalid:

```json
[0, "meter", 4, 1]
[2, "meter", 3, 1]
```

Consumers may choose to recover from invalid `"meter"` events by pushing them to the start of the following bar,
or choose to throw an error.

Meter events have no effect on the rate of the beat clock (although they may have an effect on a metronome or
rhythm generator). Where no `"meter"` event is defined at beat `0` consumers should assume a default meter of
4/4 - ie, `[0, "meter", 4, 1]`.

---

### `"chord"`

```js
[beat, "chord", root, mode, duration]
```

`root` – INT [0-11] or STRING, represents the root of a chord.
Where `root` is a number it represents root note as a MIDI number `0-11`.
Where `root` is a string it must be a root note name, ie. `C`, `C♯`, `D` ... `A`, `B♭`, `B`.

`chord` – STRING, represents the mode of a chord.
The mode identifier may be arbitrary, but these mode names have fixed meanings:

| Symbol     | Meaning |
| :--------- | :----------------------------------- |
| `"∆♯11"`   | 4th mode of the major scale (lydian) |
| `"∆"`      | 1st mode of the major scale (ionian) |
| `"7"`      | 5th mode of the major scale (myxolydian) |
| `"-7"`     | 2nd mode of the major scale (dorian) |
| `"-♭6"`    | 6th mode of the major scale (aoelian) |
| `"7sus♭9"` | 3rd mode of the major scale (phrygian) |
| `"ø"`      | 7th mode of the major scale (locrian) |
| `"7♯11"`   | 4th mode of melodic minor |
| `"-∆"`     | 1st mode of melodic minor |
| `"∆♭6"`    | 5th mode of melodic minor |
| `"-♭9"`    | 2nd mode of melodic minor |
| `"ø7"`     | 6th mode of melodic minor |
| `"∆♯5"`    | 3rd mode of melodic minor |
| `"7alt"`   | 7th mode of melodic minor |
| `"°"`      | Diminished whole tone / half tone |
| `"7♭9"`    | Diminished half tone / whole tone |
| `"+7"`     | Whole tone |

`duration` – FLOAT, the duration of the chord in beats.

A chord event provides information about the root and mode of the music. A chord event can
be interpreted by a music generator, or used by a notation renderer to display chord symbols.

---

### `"key"`

```js
[beat, "key", name]
```

`name` – STRING<br/>
The name of a major key, a capital letter followed optionally by an accidental, as in `"A♭"`, `"A"`, `"A♯"`, `"B♭"`, `"B"`, `"C"`, and so on up to `"G♯"`.

Represents a visual key change in written notation only. Does not affect how a performance sounds.
<blockquote>Harmonic generators should use `"chord"` events to generate sound based on modes.</blockquote>

---

### `"key"`

```js
[beat, "param", name, value, duration, curve]
```

`name` – STRING<br/>
The name of a parameter.

`value` – NUMBER<br/>
The new value of the parameter.

`duration` – STRING<br/>
The duration of the parameter change. Where `curve` is `"step"` or `"hold"`, has no effect.

`curve` – STRING<br/>
The type of transition to the new parameter value. One of `"step"`, `"exponential"`, `"linear"`, `"target"`, `"curve"` or `"hold"`.

Represents a parameter change. Data corresponds to the capabibilities of an AudioParam in the WebAudio API.
Implementations may support further curve types, and a sequence should include a named map of user defined curves (TODO!).

---

### `"sequence"`

```js
[beat, "sequence", sequenceId, targetId, duration]
```

`sequenceId` – STRING<br/>
The id of a sequence found in the `sequences` array

`targetId`   – STRING<br/>
The id of an instrument to play the sequence through.

`duration`   – FLOAT<br/>
The duration in beats to play the sequence.

Renders a sequence from the `sequences` array. For example, this event plays the sequence "my-sequence" at beat `0.5` for `3` beats:

```json
[0.5, "sequence", "my-sequence", 3]
```

<blockquote>TBD. It is not clear exactly how to spec targetId to select a target instrument in an interoperable manner. In Soundstage, it refers to the id of a node in the `nodes` array, where nodes are WebAudio nodes in the Soundstage graph.</blockquote>


---

### `"text"`

```js
[beat, "text", string, duration]
```

`string` – STRING<br/>
A string of text.

`duration`   – FLOAT<br/>
The duration in beats that the text spans.


---

### `"start"`

```js
[beat, "start", identifier, value]
```

Reserved event name. Basically, both `"note"` and `"sequence"` events, which have duration, may be decomposed into matching `"start"` and `"stop"` events without duration in internal implementations.
Neither should appear in exported SequenceJSON.

---

### `"stop"`

```js
[beat, "stop", identifier, value]
```

Reserved event name. See `"start"`.

---

## Implementations

- <a href="http://github.com/soundio/soundstage">Soundstage</a> is a WebAudio wrapper and playback sequencer that consumes and outputs Sequence JSON.
- <a href="http://github.com/stephband/scribe/">Scribe</a> is a music notation interpreter and HTML renderer that consumes and outputs Sequence JSON. It also parses ABC notation to Sequence JSON, as well as a sequence text format that is basically Sequence JSON without any of the JSON syntax or quote marks, just spaces between values.

## References

- OSC spec: <a href="http://opensoundcontrol.org/spec-1_0">http://opensseqoundcontrol.org/spec-1_0</a>
- OSC example messages: <a href="http://opensoundcontrol.org/files/OSC-Demo.pdf">http://opensoundcontrol.org/files/OSC-Demo.pdf</a>
- Music XML: <a href="http://www.musicxml.com/for-developers/">http://www.musicxml.com/for-developers/</a>
- VexFlow: <a href="http://www.vexflow.com/">http://www.vexflow.com/</a>

<!--
## Contributions

Stephen Band, Stelio Tzonis, Al Johri and Jason Sigal.
-->
