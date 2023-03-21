
const output = ["", ""];

let functionGrounds = false;

function pureWrite(str) {
    if (prevent_write.is)
        return;
    if (!functionGrounds)
        output[0] += str;
    else
        output[1] += str;
}
let prevent_write = {
    is: 0
};

function write(str) {
    if (prevent_write.is)
        return;
    if (!functionGrounds)
        output[0] += langPrefix + str + langPostfix;
    else
        output[1] += langPrefix + str + langPostfix;
}

function get_current() {
    return output[1].concat(output[0]);
}

let compiles = true;

let line;

function setLine(num) {
    line = num;
}

function getLine() {
    return line;
}

const errors = {
    "improper_num_of_args": "`Operator not given proper number of arguments. Operator '${args[0]}', expected '${args[1]}' args.`",

    "variable_does_not_exist": "`Variable '${args[0]}' does not exist.`",

    "unbalanced_parenthesis": "`Unbalanced Parenthesis.`",
    "unbalanced_braces": "`Unbalanced Curly Braces.`",

    "incorrect_return_type": "`Incorrect return type. Expected [${args[0]}], given [${args[1] ?? 'none'}].`",
    "no_return": "`Function that should return a value does not do so. Expected [${args[0]}].`",

    "not_a_function": "`You attempted to call a value that was not a function as though it were one. Expected [fn], given [${args[0] ?? 'none'}].`",
    "incorrect_params": "`Incorrect parameters passed to a function. Expected [${args[0]}], given [${args[1]}].`",

    "invalid_type": "`Invalid type. Expected [${args[0]}], given [${args[1]}].`",

    "incorrect_array_type": "`Inconsistent typing within array. Array starts with [${args[0]}], given [${args[1]}].`",

    "cannot_modify_global": "`Unable to modify global variable [${args[0]}], even if within an impure context.`",

    "no_heap": "`You are compiling this program to not use heap memory. This should be fine if you know what you're doing. Setting \\`--garbageCollect\\` to false...`",
    // "no_maximum_heap": "`You are compiling this program to have zero maximum heap memory. This should be fine if you know what you're doing.`",
    // "init_heap_exceeds_max": "`Minimum heap size cannot be larger than maximum heap size.`",
    "invalid_heap": "`Invalid heap size \\`${args[0]}\\`. Heap sizes must be powers of 2 and less than or equal to 65536.`",

    "invalid_coercion_call": "`Invalid use of coercion? The compiler probably messed up on this one...`",

    "cant_coerce_down": "`Unable to implicitly cast from [${args[0]}] to [${args[1]}].`",

    "cant_coerce": "`Unable to cast to anything from [${args[0]}]. Attempted to cast to [${args[1]}].`",

    "impure_reference_from_pure": "`Unable to reference an impure value \\`${args[0]}\\` from a pure context.`",
    "impure_fn_from_pure": "`Unable to call an impure function \\`${args[0]}\\` from a pure context.`",
    "impure_include_from_pure": "`Unable to call an impure function \\`${args[0]}\\` from a pure context. Try using \\`#trust include\\` instead of \\`#include\\` if you believe the included function is pure.`",
    "impure_operator_from_pure": "`Unable to use an impure operator \\`${args[0]}\\` from a pure context.`",
    "loop_from_pure": "`Unable to use a loop from a pure context.`",

    "invalid_compile_time_function": "`Invalid compile time function \\`${args[0]}\\`.`",

    "unicode_not_supported": "`Characters outside of utf-8 are not supported. In string: \\`${args[0]}\\`.`",

    "unexpected_include_word": "`Unexpected include word \\`${args[0]}\\`. Assuming you meant \\`${args[1]}\\`.`",
}

function format_args (arg) {
    if (arg && arg.match && arg.match(/^p[0-9]*_/))
        return arg.replace(/^p[0-9]*_/, '');
    return arg;
}

// Log an error
function log_error(error, serious, ...args) {
    // console.trace();
    if (serious) {
        let i = 0;
        if (errors[error])
            while(errors[error].match(/(?<!format_args\()args\[[0-9]*\]/))
                errors[error] = errors[error].replace(/(?<!format_args\()args\[[0-9]*\]/, `format_args(args[${i++}])`)
        console.error("\u001b[31m\033[1mError: \u001b[0m\033[0m" + eval(errors[error]) + '\n # File `' + fileData.current_file + '`\n # Line ' + getLine());
        compiles = false;
        throw error;
    } else {
        console.warn("\u001b[33m\033[1mWarning: \u001b[0m\033[0m" + eval(errors[error]) + '\n # File `' + fileData.current_file + '`\n # Line ' + getLine());
    }
}

// Log a compiler error (doesn't mention line).
function log_compiler_error(error, serious, ...args) {
    const e = eval(errors[error]);
    if (serious) {
        console.error("\u001b[31m\033[1mError: \u001b[0m\033[0m" + e);
        compiles = false;
        throw error;
    } else {
        console.warn("\u001b[33m\033[1mWarning: \u001b[0m\033[0m" + e);
    }
}

const purityStack = [];

function getPure() {
    return purityStack[0];
}

function getPurityStack() {
    return purityStack;
}

const global = {
    isLinked: false,
    previousExports: {},
    exports: {},
}

const fileData = {
    current: "",
    current_file: "",
    entryPoint: ""
}

module.exports = { write, pureWrite, prevent_write, log_error, log_compiler_error, getPure, getPurityStack, global, fileData, get_current /* get_current is for debugging. */ };


const { compile } = require("./compilation/compiler");
let { handleDeclarations, intToString, getDeclarationList, currentFunctionPlusPlus, getAllExports, resetExports } = require("./compilation/declarationHandler");
const precedences = require("./compilation/precedences");
const { precompile } = require("./compilation/precompiler");
const { reserver, allVariables } = require("./compilation/reserve");
const { Tokenize } = require("./compilation/tokenizationHandler");
const { pointerNotation } = require("./compilation/pointerNotation");

const { pointer, alloc, get_variables } = require("./language-specifics/wasm/variableHandling");
const { functionTable, createsig, fsighandle, function_s, endfunction_s, call, return_s, selfFunction } = require("./language-specifics/wasm/stdFunctions")
const { getType, getSize, valType, getBiggestValue, pushNums, pushNumsLiteral, getLiteral, literals, reset_all_variableUtils } = require("./language-specifics/wasm/variableUtils")
const { set, setGlobal } = require("./language-specifics/wasm/set");
const { add, subtract, mult, divide, modulo, exponent, not, bit_and, bit_not, bit_or, bit_xor, right_shift, right_shift_unsigned, left_shift, softEquals, flessThan, fgreaterThan, fgreaterThanOrEqualTo, flessThanOrEqualTo, fplusplus, fminusminus, hardEquals, notEquals, hardNotEquals, and, or, plusEquals, minusEquals, multEquals, divEquals, modEquals, exponentEquals, leftShiftEquals, rightShiftEquals, unsignedRightShiftEquals, bitAndEquals, bitOrEquals, bitXorEquals, andEquals, orEquals, } = require("./language-specifics/wasm/stdMath");
const { if_s, endif_s, else_s, while_s, endwhile_s } = require("./language-specifics/wasm/std");
const { createHeap } = require("./language-specifics/wasm/heap");
const { accessArrayValue, Array_t, String_t } = require("./language-specifics/wasm/mm");
const { Parameter } = require("./language-specifics/wasm/parameter");
const { optimize } = require("./optimization/optimize");
const { options } = require("../mtc");
const { handleImports, importedToPointer, linkedFiles, linkedLibraries, compiledFiles, get_include_map, name_from_dir, base_dir } = require("./language-specifics/wasm/linkage");
const { genSupport } = require("./language-specifics/wasm/support");
const { coerce_to_f32, coerce_to_f64, coerce_to_fn, coerce_to_str, coerce_to_i32, coerce_to_i64 } = require("./language-specifics/wasm/coercion");

let langPrefix = "";
let langPostfix = "";

function checkValidHeapSize(size_param) {
    let size = size_param;

    if (!size)
        return;

    while (size > 1)
        size /= 2;

    if (size % 2 && size != 1)
        log_compiler_error("invalid_heap", true, size_param)
}

function tombstone_cleanup(isLinked) {
    reset_all_variableUtils();
    output[0] = ""
    output[1] = ""
    prevent_write.is = 0;
    line = 1;
    resetExports();
    if (isLinked)
        fileData.entryPoint = "";
}


function tombstone(file, filename, isLinked) {
    compiles = true;
    // if (options.minHeapSize > options.maxHeapSize)
    //     log_compiler_error("init_heap_exceeds_max", true);

    if (!options.maxHeapSize) {
        log_compiler_error("no_heap", false);
        options.garbageCollect = false;
    }
    // if (!options.maxHeapSize)
    //     log_compiler_error("no_maximum_heap", false);
    // if (!options.minHeapSize)
    //     log_compiler_error("no_initial_heap", false);

    checkValidHeapSize(options.minHeapSize);
    // checkValidHeapSize(options.maxHeapSize);

    if (!compiles)
        return null;
    if (!file)
        return "";

    tombstone_cleanup(isLinked);

    langPrefix = "";
    langPostfix = "";

    switch (options.language) {
        case "gnuasm":
        case "node":
        case "js":
            langPrefix = "\n\t";
            break;
    }

    file = file.replaceAll(/\/\/.*?(?=$)/gm, '');
    const imports = [];
    if (file.match(/^\#.*?\n/gm))
        file.match(/^\#.*?\n/gm).forEach(e => imports.push(e.replace('#', '').replace('\n', '')));
    const included_functions = [];
    handleImports(tombstone, imports, included_functions, allVariables);
    global.isLinked = isLinked;

    file = file.replaceAll(/^\#.*?$/gm, '')

    file = Tokenize(file);
    if (!compiles) {
        tombstone_cleanup(isLinked);
        return null;
    }

    file = reserver(file);
    if (!compiles) {
        tombstone_cleanup(isLinked);
        return null;
    }

    file = pointerNotation(file);
    if (!compiles) {
        tombstone_cleanup(isLinked);
        return null;
    }

    file = precedences(file, 2);
    if (!compiles) {
        tombstone_cleanup(isLinked);
        return null;
    }

    file = precompile(file);
    if (!compiles) {
        tombstone_cleanup(isLinked);
        return null;
    }

    file = handleDeclarations(file);
    if (!compiles) {
        tombstone_cleanup(isLinked);
        return null;
    }

    file = compile(file).join(' ');
    if (!compiles) {
        tombstone_cleanup(isLinked);
        return null;
    }
    file = importedToPointer(included_functions) + file;
    global.previousExports = global.exports;
    global.exports = {};
    const includeMap = Object.keys(get_include_map());
    includeMap.forEach(e => {
        if (global.previousExports[e])
            global.previousExports[get_include_map()[e].name] = ({ name: get_include_map()[e].name, fn: global.previousExports[e].fn, pure: global.previousExports[e].pure || get_include_map()[e].pure  })
    });
    
    fileData.current = name_from_dir(filename);
    fileData.current_file = filename;

    console.log(file)
    
    eval(file);
    

    let returnValue = output[1].concat(output[0]);
    let support;
    if (options.language == "gnuasm") {
        returnValue = `\t.global main\n\n${output}`;
    }
    if (options.language == "js" || options.language == "node") {
        returnValue = `${returnValue}`;
        support = genSupport(options.language, linkedFiles, linkedLibraries, filename, getAllExports());
    }
    if (options.optimize)
        returnValue = optimize(returnValue, options.language);
    tombstone_cleanup(isLinked);
    if (!compiles)
        return null;
    return { code: returnValue, imports: imports, support: support, compiledFiles: compiledFiles };
}
module.exports = tombstone;