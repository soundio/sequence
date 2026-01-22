
/**
extractSections(structure)
Detects sections from barlines, repeats, and endings.

A section boundary is detected at:
- Barlines with style: "light-heavy", "heavy-heavy", or "double"
- Repeat barlines
- Volta endings (1st/2nd time bars)

Returns array of section objects with start/end measure numbers.
**/

export default function extractSections(structure) {
    const { parts } = structure;

    // Use first part to detect sections (assumes all parts have same structure)
    if (parts.length === 0) return [{ start: 1, end: 1 }];

    const measures = parts[0].measures;
    const sections = [];
    let sectionStart = 1;

    measures.forEach((measure, index) => {
        const isLastMeasure = index === measures.length - 1;
        const barline = measure.barline;

        // Check for section boundary markers
        const isSectionEnd =
            barline?.repeat?.direction === 'backward' ||
            barline?.ending?.type === 'stop' ||
            barline?.style === 'light-heavy' ||
            barline?.style === 'heavy-heavy' ||
            barline?.style === 'double' ||
            isLastMeasure;

        if (isSectionEnd) {
            sections.push({
                start: sectionStart,
                end: measure.number
            });
            sectionStart = measure.number + 1;
        }
    });

    // If no sections were detected, treat whole piece as one section
    if (sections.length === 0) {
        sections.push({
            start: 1,
            end: measures[measures.length - 1].number
        });
    }

    return sections;
}
