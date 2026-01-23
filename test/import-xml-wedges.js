
import run from 'fn/test.js';
import importMusicXML from '../modules/parse/parse-music-xml.js';
import toGain from 'fn/to-gain.js';


// Test diminuendo from ff (-9dB) to mf (-18dB) over beats 0-3
const diminuendoXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>3</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction>
        <direction-type><dynamics><ff/></dynamics></direction-type>
      </direction>
      <direction>
        <direction-type><wedge type="diminuendo"/></direction-type>
      </direction>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>2</duration>
        <type>eighth</type>
      </note>
      <note>
        <pitch><step>F</step><octave>4</octave></pitch>
        <duration>2</duration>
        <type>eighth</type>
      </note>
    </measure>
    <measure number="2">
      <direction>
        <direction-type><dynamics><mf/></dynamics></direction-type>
      </direction>
      <direction>
        <direction-type><wedge type="stop"/></direction-type>
      </direction>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <direction>
        <direction-type><dynamics><mf/></dynamics></direction-type>
      </direction>
      <direction>
        <direction-type><wedge type="stop"/></direction-type>
      </direction>
    </measure>
  </part>
</score-partwise>`;


run('importMusicXML() - diminuendo wedge interpolation', [{
    beat0: toGain(-9),      // ff at start
    beat1: toGain(-12),     // 1/3 through: -9 + (1/3)*(-9) = -12dB
    beat2: toGain(-15),     // 2/3 through: -9 + (2/3)*(-9) = -15dB
    beat2_5: toGain(-16.5), // 2.5/3 through: -9 + (2.5/3)*(-9) = -16.5dB
    beat3: toGain(-18)      // mf at end
}], (test, done) => {
    const sequence = importMusicXML(diminuendoXML);
    const partSeq = sequence.sequences.find(s => s.id.includes('P1'));
    const noteEvents = partSeq.events.filter(e => e[1] === 'note');

    test({
        beat0: noteEvents[0][3],   // C at beat 0
        beat1: noteEvents[1][3],   // D at beat 1
        beat2: noteEvents[2][3],   // E at beat 2
        beat2_5: noteEvents[3][3], // F at beat 2.5
        beat3: noteEvents[4][3]    // G at beat 3
    });

    done();
});


// Test crescendo from p (-27dB) to f (-13.5dB)
const crescendoXML = `<?xml version="1.0" encoding="UTF-8"?>
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
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction>
        <direction-type><dynamics><p/></dynamics></direction-type>
      </direction>
      <direction>
        <direction-type><wedge type="crescendo"/></direction-type>
      </direction>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>8</duration>
        <type>half</type>
      </note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>8</duration>
        <type>half</type>
      </note>
    </measure>
    <measure number="2">
      <direction>
        <direction-type><dynamics><f/></dynamics></direction-type>
      </direction>
      <direction>
        <direction-type><wedge type="stop"/></direction-type>
      </direction>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;


run('importMusicXML() - crescendo wedge interpolation', [{
    beat0: toGain(-27),     // p at start
    beat2: toGain(-20.25),  // halfway: -27 + 0.5*13.5 = -20.25dB
    beat4: toGain(-13.5)    // f at end
}], (test, done) => {
    const sequence = importMusicXML(crescendoXML);
    const partSeq = sequence.sequences.find(s => s.id.includes('P1'));
    const noteEvents = partSeq.events.filter(e => e[1] === 'note');

    test({
        beat0: noteEvents[0][3],  // C at beat 0 (p)
        beat2: noteEvents[1][3],  // D at beat 2 (halfway)
        beat4: noteEvents[2][3]   // E at beat 4 (f)
    });

    done();
});


// Test without wedge (should use constant dynamic)
const noWedgeXML = `<?xml version="1.0" encoding="UTF-8"?>
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
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction>
        <direction-type><dynamics><mf/></dynamics></direction-type>
      </direction>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;


run('importMusicXML() - constant dynamic without wedge', [{
    allSame: true,
    value: toGain(-18)  // mf
}], (test, done) => {
    const sequence = importMusicXML(noWedgeXML);
    const partSeq = sequence.sequences.find(s => s.id.includes('P1'));
    const noteEvents = partSeq.events.filter(e => e[1] === 'note');

    test({
        allSame: noteEvents[0][3] === noteEvents[1][3],
        value: noteEvents[0][3]
    });

    done();
});
