const { types } = require("./tokenizationHandler");

let reservedWords = [];

const allowedFunctions = [
    // "print",
    // "scan",
    // "scanNum",
    // "operate",
    //    "cast",
    "while",
    "for",
    "if",
    "else",
    "export",
]

const disallowedWords = [
    "abstract",
    "arguments",
    "await",
    "boolean",
    "break",
    "byte",
    "case",
    "catch",
    "char", // ########
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "double",
    "enum",
    "eval",
    "extends",
    "false",
    "final",
    "finally",
    "goto",
    "implements",
    "import",
    "in",
    "instanceof",
    "interface",
    "let",
    "long",
    "native",
    "new",
    "null",
    "package",
    "private",
    "protected",
    "public",
    "short",
    "static",
    "super",
    "switch",
    "synchronized",
    "this",
    "throw",
    "throws",
    "transient",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "volatile",
    "with",
    "yield",


    "accessArrayValue", //# /language-specifics/wasm/array.js
    "compile",
    "handleDeclarations",
    "intToString",
    "declarationList",
    "currentFunction",
    "precedences",
    "precompile",
    "reserver",
    "Tokenize",
    "pointer",
    "alloc",
    "garbageCollect",
    "functionTable",
    "createsig",
    "fsighandle",
    "function_s",
    "endfunction_s",
    "call",
    "return_s",
    "getType",
    "getSize",
    "valType",
    "getBiggestValue",
    "pushNums",
    "pushNumsLiteral",
    "getLiteral",
    "literals",
    "set",
    "setGlobal",
    "add",
    "subtract",
    "mult",
    "divide",
    "modulo",
    "exponent",
    "not",
    "and",
    "or",
    "bit_and",
    "bit_not",
    "bit_or",
    "bit_xor",
    "right_shift",
    "right_shift_unsigned",
    "left_shift",
    "softEquals",
    "hardEquals",
    "notEquals",
    "hardNotEquals",
    "flessThan",
    "flessThanOrEqualTo",
    "fgreaterThan",
    "fgreaterThanOrEqualTo",
    "fplusplus",
    "fminusminus",
    "plusEquals",
    "minusEquals",
    "multEquals",
    "divEquals",
    "modEquals",
    "exponentEquals",
    "leftShiftEquals",
    "rightShiftEquals",
    "unsignedRightShiftEquals",
    "bitAndEquals",
    "bitOrEquals",
    "bitXorEquals",
    "andEquals",
    "orEquals",
    "if_s",
    "endif_s",
    "else_s",
];

function reserve(token) {
    for (let i = 0; i < reservedWords.length; i++) {
        if (token == reservedWords[i])
            token = token + "_r"
        // token = token.replaceAll(eval(`/(?<=([^A-Za-z]|^))${reservedWords[i]}(?=([^A-Za-z]|$))/g`), reservedWords[i] + '_r');
    }
    return token;
}

let allVariables = [];
function reserver(tokens) {
    reservedWords = disallowedWords;
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type == "Identifier")
            tokens[i].value = reserve(tokens[i].value);
        if (types[tokens[i].value] && tokens[i + 1].type == "Identifier")
            allVariables.push(reserve(tokens[i + 1].value));
    }
    return tokens;
}

module.exports = { reserver, allVariables, disallowedWords }