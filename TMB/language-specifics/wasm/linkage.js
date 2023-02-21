const { log_error, log_compiler_error, global } = require("../../tombstone");
const { getLiteral } = require("./variableUtils");
const fs = require("fs");

function trust(args, function_list, allVariables) {
    args.shift()
    return include(args, function_list, allVariables, true)
}

function handleTypeParam(type, connect, connect_end) { // eg. `[i32, i64, i32]`
    type = type.slice(1, -1).split(', ').map(e => getLiteral(e));
    type = connect + type.join(connect + connect_end) + connect_end;
    return type;
}

const base_dir = process.cwd();

const dir_log = {}

let dir_count = 0;

const name_from_dir = (dir) => {
    if (!dir_log[dir])
        return dir_log[dir] = 'p' + (dir_count++) + '_'
    return dir_log[dir]
}

const linkedLibraries = [];

const linkedFiles = [];

const compiledFiles = [];

const include_map = {};
const get_include_map = () => include_map;
const reset_include_map = () => include_map = {};

function handleImportName(from, name, result, params) {
    // if (from[0] == `"`) {
    //     from = from.slice(1, -1);
    //     linkedFiles.push({location: from, result: result, params: params});
    //     return `"linked_${name_from_dir(base_dir + from)}" "` + name + `"`;
    // } else if (from[0] == `<`) {
    from = from.slice(1, -1);
    linkedLibraries.push({ location: from, result: result, params: params });
    return `"lib_${from}" "` + name + `"`;
    // }
}

function include(args, function_list, allVariables, pure) {
    const name = args.shift();
    const from_word = args.shift();
    if (from_word != "from") log_compiler_error("unexpected_include_word", false, from_word, "from"); // from
    const from = args.shift();
    const as_word = args.shift();
    if (as_word != "as") log_compiler_error("unexpected_include_word", false, as_word, "as"); // as
    const callName = args.shift();
    let returnValue
    if (args[args.length - 2] == "returns") {
        returnValue = args.pop();
        args.pop(); // returns
    }
    include_map[name] = {name: callName, pure: pure};

    args.shift() // with
    const params = args.join('')
    function_list.push({ name: callName, params: params, pure: pure, returnValue: returnValue, isLib: from[0] == '<' })
    allVariables.push(callName)
    if (from[0] == "<")
        return `(import ` + handleImportName(from, name, returnValue, params) + ` (func $${callName} ${handleTypeParam(params, "(param ", ")")}${returnValue ? " (result " + getLiteral(returnValue) + ')' : ""}))`
    else {
        const filename = base_dir + '/' + from.slice(1, -1);
        compiledFiles.push(tombstone(fs.readFileSync(filename, "utf-8"), filename, true));
        return ''
    };
}

const command_list = {
    "trust": trust,
    "include": include,
}

let tombstone;

function handleImports(tmb, imports, function_list, allVariables) {
    tombstone = tmb;
    for (let i = 0; i < imports.length; i++) {
        imports[i] = imports[i].split(' ');
        const cmd = imports[i].shift();
        if (!command_list[cmd])
            return log_compiler_error("invalid_compile_time_function", true, cmd);
        imports[i] = command_list[cmd](imports[i], function_list, allVariables);
    }
    return imports;
}

function importedToPointer(array) {
    array = array.map(e => {
        return `alloc("${e.name}", "fn", {args: ["${e.params.slice(1, -1).split(', ').join('", "')}"], result: "${e.returnValue}"}, 0, ${e.pure}, ${e.isLib});`
    });
    return array.join('\n')
}

module.exports = { handleImports, importedToPointer, linkedFiles, linkedLibraries, compiledFiles, get_include_map, reset_include_map, name_from_dir, base_dir }