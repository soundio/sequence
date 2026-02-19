
import { hsidFrom } from './hsid.js';

const INTERVALNAMES = [
    'unison',
    'semitone',
    '2nd',
    '-3rd',
    '∆3rd',
    '4th',
    'tritone',
    '5th',
    '♭6th',
    '6th',
    '-7th',
    '∆7th',
    '8ve',
    '♭9th',
    '9th',
    '♯9th',
    '10th',
    '11th',
    '♯11th',
    '12th',
    '♭13th',
    '13th'
];

export function getIntervalFrom(numbers) {
    const hsid = hsidFrom(numbers);
    return INTERVALNAMES[hsid] || hsid;
}

export function getIntervalOf() {
    return getIntervalFrom(arguments);
}
