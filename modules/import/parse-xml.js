
/**
parseXML(xmlString)
Parses MusicXML string and returns the parsed object directly.
Uses deno.land/x/xml parser which returns objects like:
  { 'score-partwise': { '@version': '4.0', 'part-list': {...}, part: [...] } }
Attributes are prefixed with '@', text content is in '#text' or as direct value.
**/

import { parse } from 'https://deno.land/x/xml@7.0.3/mod.ts';


export default function parseXML(xmlString) {
    const parsed = parse(xmlString);

    if (!parsed || !parsed['score-partwise']) {
        throw new Error('Not a valid MusicXML score-partwise document');
    }

    return parsed;
}


/**
getText(obj)
Extracts text content from an XML object.
**/

export function getText(obj) {
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number') return String(obj);
    if (obj && obj['#text']) return String(obj['#text']);
    return '';
}


/**
getAttr(obj, name)
Gets attribute value from an XML object.
**/

export function getAttr(obj, name) {
    return obj?.[`@${name}`];
}


/**
getChild(obj, tag)
Gets first child element with tag name, normalizing arrays to single element.
**/

export function getChild(obj, tag) {
    const value = obj?.[tag];
    return Array.isArray(value) ? value[0] : value;
}


/**
getChildren(obj, tag)
Gets all child elements with tag name, normalizing to array.
**/

export function getChildren(obj, tag) {
    const value = obj?.[tag];
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}


/**
findDeep(obj, tag)
Recursively searches for first occurrence of tag anywhere in object tree.
**/

export function findDeep(obj, tag) {
    if (!obj || typeof obj !== 'object') return null;

    // Check if current object has this tag
    if (obj[tag]) {
        const value = obj[tag];
        return Array.isArray(value) ? value[0] : value;
    }

    // Search in object values (skip attributes and special keys)
    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('@') || key.startsWith('#')) continue;
        if (typeof value === 'object' && value !== null) {
            const found = findDeep(value, tag);
            if (found) return found;
        }
    }

    return null;
}
