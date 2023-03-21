const { options } = require("../../../mtc");
const { fileData } = require("../../tombstone");

let variables = {};
let scope = "global";

const get_variables = (n) => {
    if (exists(n)) {
        if (variables[fileData.current + n])
            return variables[fileData.current + n];
        if (variables[n])
            return variables[n];
        return null;
    }
    return variables;
}

const reset_all_variableUtils = () => {
    variables = {};
    scope = "global"
}

const getScope = () => scope;
const setScope = x => { scope = x };


class evaluated {
    constructor(type, misc, size) {
        this.type = type;
        this.misc = misc;
        this.size = size;
    }
}


function getType(n) {
    if (!n)
        return null
    else if (variables[n])
        return variables[n].size ? "i" + options.pointerSize : variables[n].type;
    else
        return valType(n);
}

function getPtrType(n) {
    if (n instanceof evaluated)
        return n.misc
    else if (variables[n] && variables[n].ptrType)
        return variables[n].ptrType.replaceAll('*', '');
    else {
        // Yeah you probably messed up if you ended up here...
        // Just for good measure I'll call an error
        // log_compiler_error("variableUtils.js, line 36", true);

        // No, instead I'll assume you treated something like a pointer that's a normal value and do this:
        return getType(n);
    }
}

const typeSizes = {
    "i32": 32,
    "i64": 64,
    "f32": 32,
    "f64": 64,
    "fn": 32,
    "str": 32,
    "nil": 32
}
function getSize(n) {
    if (typeSizes[n])
        return typeSizes[n];
    if (typeof n == "bigint") {
        return 64;
    }
    if (n instanceof evaluated) {
        if (n.type == "Reference Value" || n.type == "Accessed Value")
            return options.pointerSize;
        return typeSizes[n.type];
    }
    if (isNaN(+n)) {
        if (variables[n] && !isNaN(+variables[n].type.substring(1)))
            return variables[n].type.substring(1);
    } else return 32;
}

function valType(n) {
    if (n instanceof evaluated) {
        if (n.type == "Reference Value" || n.type == "Reference Value")
            return "i" + options.pointerSize
        return n.type
    }
    if (typeof n == "bigint")
        return "i64"
    if (isNaN(+n)) {
        return null;
    } else {
        if (n.toString().includes('.'))
            return `f${getSize(n)}`;
        else
            return `i${getSize(n)}`;
    }
}


function getBiggestValue(...n) {
    while (n.length == 1 && Array.isArray(n[0]))
        n = n[0];
    let lowestBid = 32;
    let d = false;

    for (let i = 0; i < n.length; i++) {
        if (getType(n[i]) == "fn")
            return "fn";
        if (typeSizes[n[i]]) {
            if (n[i] == "fn")
                return "fn";
            if (typeSizes[n[i]] > lowestBid)
                lowestBid = typeSizes[n[i]]
            if (n[i][0] == 'f')
                d = true;
        }
        if ((!variables[n[i]] && n[i] && n[i].includes && n[i]?.includes('.')) || (variables[n[i]]?.type && getLiteral(variables[n[i]]?.type)[0] == 'f')) {
            d = true;
        }
        if (getSize(n[i]) > lowestBid || +variables[n[i]]?.type?.substring(1) > lowestBid) {
            lowestBid = getSize(n[i]);
        }
        if (n[i] instanceof evaluated) {
            if (getType(n[i].type) == "fn")
                return "fn";
            if (getType(n[i].misc) == "fn")
                return "fn";
            if (n[i].type == "Accessed Value" && getSize(n[i].misc) > lowestBid) {
                lowestBid = getSize(n[i].misc);
            } else if (getSize(n[i].type) > lowestBid) {
                if (n[i].type[0] == 'f')
                    d = true;
                lowestBid = getSize(n[i].type);
            }

            // F vs I
            if (n[i].type == "Accessed Value" && n[i].misc[0] == 'f') {
                d = true;
            } else if (n[i].type[0] == 'f')
                d = true;
        }
    }
    return (d ? 'f' : 'i') + lowestBid
}

const literals = {
    "i32": "i32",
    "i64": "i64",

    "f32": "f32",
    "f64": "f64",

    "str": "i32",

    "fn": "i32",
    // "obj": "i32",

    "nil": "i32"
}

function getLiteral(value) {
    return literals[value];
}

const numbers = { "i32": true, "i64": true, "f32": true, "f64": true };
function isNumber(value) {
    return numbers[value] || variables[value] ? numbers[variables[value].type] : numbers[valType(value)];
}

function isLiteral(value) {
    return numbers[value] || typeof value == "bigint" || !isNaN(+value);
}

function exists(value) {
    return (value || value === 0 || value === 0n);
}

module.exports = { reset_all_variableUtils, getType, getPtrType, getSize, valType, getBiggestValue, getLiteral, literals, evaluated, get_variables, getScope, setScope, isNumber, isLiteral, exists };