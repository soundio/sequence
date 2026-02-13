# Serialisation Format

A compact binary format for Sequence events.


## Byte structure

Events are serialised to a variable-length encoding. Most events use fixed byte
counts, while `"text"` and `"sequence"` events include an explicit length byte:

```
beat(8) | address(2) | [length(1)] | values(variable)
```

- **beat**:    Float64 - when the event occurs
- **address**: Uint16 - bit-packed routing and parameter info (see below)
- **length**:  Uint8 - byte count of values field (only for text and sequence)
- **values**:  Variable bytes - event-specific data


## Addresses

A 16-bit address encodes three fields:

```
[RRPPPPPPPPPPCCCC]
```

- **Route** (2 bits):
  - `0` - Routes event to sequencer (everything but `"param"` events)
  - `1` - Routes event out of sequencer (all `"param"` events)
  - `2` - Unused
  - `3` - Unused

- **Param** (10 bits): Event or Param name

- **Curve** (4 bits): Curve type
  - `0` - `"step"`
  - `1` - `"linear"`
  - `2` - `"exponential"`
  - `3` - `"target"`
  - `4` - `"curve"`
  - `5` - `"hold"`
  - `6` - `"cancel"`
  - `>7` - Unused, may be used in future to indicate data layout of unregistered
    event types


## Value Bytes

Most events use fixed byte counts defined in `TYPEBYTES`:

- **note**: 16 bytes (pitch, dynamic, duration)
- **chord**: 11 bytes (root, mode, duration, bass)
- **meter**: 4 bytes (duration, divisor)
- **key**: 1 byte (root)
- **clef**: 1 byte (clef id)
- **start/stop**: 8 bytes (pitch, dynamic)

Events with curve-based automation (`"param"`, `"rate"`) vary by curve type:

| Curve | Bytes | Data |
|-------|-------|------|
| step/linear/exponential | 4 | Float32 value |
| target | 12 | Float32 value + Float64 timeConstant |
| curve | 10+ | Float64 duration + Uint16 bytelength + Float32[] array |
| hold/cancel | 0 | None |

Curve events now support arbitrary curve data as an array of Float32 values. The
bytelength field stores the array size in bytes (n × 4), or 0 if no array data.

The `"text"` and `"sequence"` events require a length byte because their size is
genuinely unpredictable (variable-length strings and transform chains).
