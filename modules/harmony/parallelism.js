
function chromaticGroups(arr1, arr2) {
    var l1 = arr1.length, i1 = -1,
        l2 = arr2.length, i2 = -1,
        arr3 = [],
        // Transposing by 0 is not parallelism
        ignore = { 0: true },
        intersection, t, n;

    // For every value in arr1, transpose every value in arr2 to match it
    // and then test the intersection for length.
    while (++i1 < l1) {
        n = arr1[i1];
        i2 = -1;
        //console.log('n', n);
        while (++i2 < l2) {
            t = n - arr2[i2];
        //console.log('t', t);
            if (Math.abs(t) > parallelGroupTransposeLimit) { continue; }

            // We may have already tested and stored this transposition.
            if (ignore[t]) { continue; }
            ignore[t] = true;

            // Get all matching notes
            intersection = intersect(arr1, arr2.map(createAddFn(t)));

            // Throw away any results that are only a single note
            if (intersection.length === 1) { continue; }

            arr3.push({
                array: intersection,
                trans: -t
            });
        }
    }

    return arr3;
}

function findParallels(arr1, arr2) {
    // Seeks out all parallel groups and reports back the highest rated set
    // of groups.

    // Something about this is not quite right. It skips over lower level solutions
    // when higher level ones have already been found. Or something

    var rate = 0,
        output = {
            rating: 0,
            level: 0,
            groups: []
        },
        groups, l, group, rate1, rate2, diff1, diff2, obj, trans;

    // A quick exit
    if (arr1.length === 0) {
        return output;
    }

    // Get all possible chromatic groups
    groups = chromaticGroups(arr1, arr2);
    l = groups.length;

    while (l--) {
        group = groups[l];
        rate1 = group.array.length / arr1.length;

        // A quick exit when the group matches arr1 exactly
        if (rate1 === 1) {
            output.rating = 1;
            output.groups = [group];
            return output;
        }

        // subtract this group from both arrays, and then use those difference
        // arrays to get the leftover parallels.
        diff1 = diff(arr1, group.array);
        diff2 = diff(arr2, group.array.map(fnAdd(group.trans)));
        obj = findParallels(diff1, diff2);
        rate2 = obj.rating * (1 - rate1);

        // Use the output object given by the bottom level recursion. In the
        // case where a group is giving an identical rating to a previous one,
        // use the group that requires less transposition.
        if (rate < rate1 + rate2 ||
            rate === rate1 + rate2 && group.trans < trans) {

            obj.rating = rate1 + rate2;

            // Keep a track of the winning combination of groups
            obj.groups.push(group);

            // Increment it's level. We use level to detect how for the
            // recursion has gone - if it doesn't recurse, there's only
            // one parallel group, and thus no contrary motion.
            obj.level++;

            trans = group.trans;
        }
        else {
            obj = false;
        }
    }

    return obj || output;
}

export function parallelism(arr1, arr2) {
    var lengths;

    // Single notes or silence do not count as parallelism
    if (arr1.length < 2) { return 0; }

    return Math.max.apply(Math, chromaticGroups(arr1, arr2)
        .map(propArray)
        .map(propLength)) / arr1.length ;
}

export function contraryParallelism(arr1, arr2) {
    // It's impossible to have contrary parallelism with less than 4 notes.
    if (arr1.length < 4) { return 0; }

    var data = findParallels(arr1, arr2);

    // Parallels from one level deep are not 'contrary', as there
    // is only one of them.
    if (data.level === 0) { return 0; }

    //console.log(data.groups);

    return data.rating;
}
