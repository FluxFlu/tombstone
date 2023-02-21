const garbage = [
    ["><", ''],
    ["<>", ''],
    ["+-", ''],
    ["-+", ''],
    ["[]", ''],
    ["[-][-]", "[-]"],
];

function checkIncludes(file) {
    for (let i = 0; i < garbage.length; i++)
        if (file.includes(garbage[i][0]))
            return true;
    return false;
}

function replaceall(file) {
    for (let i = 0; i < garbage.length; i++)
        file = file.replaceAll(garbage[i][0], garbage[i][1]);
    return file;
}

function bf_optimize(file) {
    while (checkIncludes(file))
        file = replaceall(file);
    return file;
}