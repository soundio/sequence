
import run from 'fn/test.js';
import importMusicXML from '../modules/import-xml.js';


// Simple single-note MusicXML test
const simpleXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <movement-title>Test Piece</movement-title>
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <sound tempo="120"/>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;


run('importMusicXML() - simple single-part piece', [{
    "name": "Test Piece",
    "events": [
        [0, "key", "C"],
        [0, "rate", 2],
        [0, "meter", 4, 1],
        [0, "sequence", "section-0", 0, 4]
    ],
    "sequences": [{
        "id": "section-0-P1",
        "name": "Piano",
        "events": [
            [0, "note", 60, 0.1, 1],
            [1, "note", 62, 0.1, 1]
        ]
    }, {
        "id": "section-0",
        "events": [
            [0, "sequence", "section-0-P1", 0, 4]
        ]
    }]
}], (test, done) => {
    const sequence = importMusicXML(simpleXML);
    test(sequence);
    done();
});


// Test with chord symbols
const chordXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Lead</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <harmony>
        <root>
          <root-step>C</root-step>
        </root>
        <kind>major</kind>
      </harmony>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>16</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;


run('importMusicXML() - with harmony/chord symbols', [{
    "events": [
        [0, "key", "C"],
        [0, "meter", 4, 1],
        [0, "sequence", "section-0", 0, 4]
    ],
    "sequences": [{
        "id": "section-0-P1",
        "name": "Lead",
        "events": [
            [0, "chord", "C", "", 4],
            [0, "note", 64, 0.1, 4]
        ]
    }, {
        "id": "section-0",
        "events": [
            [0, "sequence", "section-0-P1", 0, 4]
        ]
    }]
}], (test, done) => {
    const sequence = importMusicXML(chordXML);
    test(sequence);
    done();
});


// Test with key signature
const keyXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Test</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>2</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;


run('importMusicXML() - key signature conversion', [{
    "events": [
        [0, "key", "D"],
        [0, "meter", 4, 1],
        [0, "sequence", "section-0", 0, 4]
    ],
    "sequences": [{
        "id": "section-0-P1",
        "name": "Test",
        "events": [
            [0, "note", 62, 0.1, 1]
        ]
    },
    {
        "id": "section-0",
        "events": [
            [0, "sequence", "section-0-P1", 0, 4]
        ]
    }]
}], (test, done) => {
    const sequence = importMusicXML(keyXML);
    test(sequence);
    done();
});
