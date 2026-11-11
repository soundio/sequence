
import { green, gray, bold } from "jsr:@std/fmt/colors";
import { rpitches }     from '../modules/pitch.js';
import { KEYNUMBERS } from '../modules/event/key.js';

// transform.js
const [inputPath, outputPath, transpose] = Deno.args;

// Logs ------------------------------------------------------------------------
if (!inputPath || !outputPath) {
    console.error(`deno run --allow-read --allow-write transform.js <input> <output> <fifths>`);
    Deno.exit(1);
}
// -----------------------------------------------------------------------------

const names  = Object.keys(KEYNUMBERS);
const fifths = Number(transpose);
const input  = await Deno.readTextFile(inputPath);
const output = input.replaceAll(rpitches, (_, letter, accidental = '', octave = '') => {
    const i = names.indexOf(letter + accidental);

    if (i === -1) {
        console.error(`Name ${ letter + accidental } does not exist in KEYNUMBERS`);
        Deno.exit(1);
    }

    return names[i + fifths] + octave;
});


await Deno.writeTextFile(outputPath, output);

// Logs ------------------------------------------------------------------------
console.log(green(`Transposed`), gray(`${ inputPath } -> ${ outputPath } by ${ fifths } fifth${ Math.abs(fifths) !== 1 ? 's' : '' }, (octave numbers ignored)`));
