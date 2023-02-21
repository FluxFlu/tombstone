const garbage = [
    [/.*?\.const .*?\n\s*drop\n/g, ''],
    // ["<>", ''],
    // ["+-", ''],
    // ["-+", ''],
    // ["[]", ''],
    // ["[-][-]", "[-]"],
];

function checkIncludes(file) {
    for (let i = 0; i < garbage.length; i++)
        if (
            (garbage[i][0] instanceof String && file.includes(garbage[i][0])) ||
            (garbage[i][0] instanceof RegExp && file.match(garbage[i][0]))
        )
            return true;
    return false;
}

function replaceall(file) {
    for (let i = 0; i < garbage.length; i++)
        file = file.replaceAll(garbage[i][0], garbage[i][1]);
    return file;
}

function wasm_optimize(file) {
    while (checkIncludes(file))
        file = replaceall(file);
    return file;
}

module.exports = { wasm_optimize }