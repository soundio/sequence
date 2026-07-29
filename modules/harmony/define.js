
const definition = { value: undefined };

export default function define(name, object, value) {
    definition.value = value;
    Object.defineProperty(object, name, definition);
}
