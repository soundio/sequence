
import run from 'fn/test.js';
import importMusicXML from '../modules/parse/parse-music-xml.js';


// Test with dynamics - p marking
const dynamicXML = `<?xml version="1.0" encoding="UTF-8"?>
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
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <direction placement="below">
        <direction-type>
          <dynamics>
            <p/>
          </dynamics>
        </direction-type>
      </direction>
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
    <measure number="2">
      <direction placement="below">
        <direction-type>
          <dynamics>
            <f/>
          </dynamics>
        </direction-type>
      </direction>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;


run('importMusicXML() - dynamics parsing', [{
    firstNoteDynamic: 0.0446683592150963,   // p = -27dB
    secondNoteDynamic: 0.0446683592150963,  // still p
    thirdNoteDynamic: 0.21134890398366465   // f = -13.5dB
}], (test, done) => {
    const sequence = importMusicXML(dynamicXML);
    const partSeq = sequence.sequences.find(s => s.id.includes('P1'));

    const noteEvents = partSeq.events.filter(e => e.type === 'note');

    test({
        firstNoteDynamic: noteEvents[0][3],   // First note with p
        secondNoteDynamic: noteEvents[1][3],  // Second note still p
        thirdNoteDynamic: noteEvents[2][3]    // Third note with f
    });

    done();
});


// Test default dynamic when no marking present
const noMarkingXML = `<?xml version="1.0" encoding="UTF-8"?>
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
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;


run('importMusicXML() - default dynamic when no marking', [{
    dynamic: 0.1  // Default -20dB
}], (test, done) => {
    const sequence = importMusicXML(noMarkingXML);
    const partSeq = sequence.sequences.find(s => s.id.includes('P1'));
    const noteEvent = partSeq.events.find(e => e.type === 'note');

    test({
        dynamic: noteEvent[3]
    });

    done();
});


// Test multiple dynamics
const multiDynamicXML = `<?xml version="1.0" encoding="UTF-8"?>
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
      <direction><direction-type><dynamics><pp/></dynamics></direction-type></direction>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
    <measure number="2">
      <direction><direction-type><dynamics><mf/></dynamics></direction-type></direction>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
    <measure number="3">
      <direction><direction-type><dynamics><fff/></dynamics></direction-type></direction>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;


run('importMusicXML() - multiple dynamics pp, mf, fff', [{
    ppDynamic: 0.0266072505979881,      // pp = -31.5dB
    mfDynamic: 0.12589254117941673,     // mf = -18dB
    fffDynamic: 0.5956621435290105      // fff = -4.5dB
}], (test, done) => {
    const sequence = importMusicXML(multiDynamicXML);
    const partSeq = sequence.sequences.find(s => s.id.includes('P1'));
    const noteEvents = partSeq.events.filter(e => e.type === 'note');

    test({
        ppDynamic: noteEvents[0][3],
        mfDynamic: noteEvents[1][3],
        fffDynamic: noteEvents[2][3]
    });

    done();
});
