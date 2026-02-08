import { Lexicons } from 'npm:@atproto/lexicon';

const lexiconJson = JSON.parse(await Deno.readTextFile('./lexicon/io.sound.sequence.json'));

try {
    const lexicons = new Lexicons([lexiconJson]);
    console.log('✅ Lexicon is valid!');
    console.log('\nLexicon ID:', lexiconJson.id);
    console.log('Definitions:', Object.keys(lexiconJson.defs));
} catch (error) {
    console.error('❌ Lexicon validation failed:');
    console.error(error.message);
    Deno.exit(1);
}
