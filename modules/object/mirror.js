
function toObject(object, [key, value]) {
    object[value] = key;
    return object;
}

export default function mirror(object) {
    return Object
    .entries(object)
    .reduce(toObject, {});
}
