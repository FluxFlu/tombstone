const { write, log_error, getPure, fileData } = require("../../tombstone");
const { Parameter } = require("./parameter");
const { pushNums, pushNumsLiteral } = require("./stackUtils");
const { evaluated, get_variables, getBiggestValue, isNumber, exists, getType, getLiteral } = require("./variableUtils");
const { options } = require("../../../mtc");
const { addPointerCount, removePointerCount } = require("./circular_dependency_mm");
const { endif_s, if_s } = require("./std");

// Perform the actual set operation
function rawSet(n, i) {
    // Mark the get_variables() as initialized (for GC purposes)
    if (get_variables()[n])
        get_variables()[n].initialized = true;

    // What to do if the left operand is part of an array rather than a singular get_variables()
    if (n instanceof evaluated && n.type == "Accessed Value") {
        write(`${n.misc}.store`);
        return;
    }

    // Throw an error if n is a global variable
    if (get_variables(n).scope == "global")
        log_error("cannot_modify_global", true, get_variables(n).spot);

    // What to do otherwise
    write(`${get_variables(n).scope}.set $${get_variables(n).spot}`);
}

function set(n, i, done_purely) {
    // Error if done impurely from a pure context
    if (!done_purely && getPure())
        return log_error("impure_operator_from_pure", true, '=')

    // Push numbers to stack and unzip them from parameters in the process.
    // Also, if they're pointers, then update the reference value count for garbage collection purposes. 

    if (get_variables()[Parameter.vm(n)] && get_variables()[Parameter.vm(n)].size && get_variables()[Parameter.vm(n)].initialized || n instanceof Parameter && Parameter.vm(i).type == "Reference Value") {
        removePointerCount(n);
    }

    const pushed = pushNums("01", Parameter.getBiggestValue(n, i), n, i);

    if (get_variables()[Parameter.vm(i)] && get_variables()[Parameter.vm(i)].size || i instanceof Parameter && Parameter.vm(i).type == "Reference Value") {
        addPointerCount(i);
    }

    n = pushed.unzipped[0];
    i = pushed.unzipped[1];

    // Make sure both get_variables() exist
    if (!n || !exists(i))
        return log_error(`improper_num_of_args`, true, "=", 2);

    // If the right operand is a literal, then set the left operand to that
    if (+i == i) {
        rawSet(n, i);
        return;
    }

    // If the left operand is part of an array, then continue based on that.
    if (n instanceof evaluated && n.type == "Accessed Value") {
        rawSet(n, i);
        return;
    }

    // If the left operand is not an existing get_variables(), throw an error
    if (!get_variables()[n])
        return log_error(`variable_does_not_exist`, true, n);

    // Set the left operand to the right operand (which is a get_variables() in this instance)
    if (isNumber(i) || i instanceof evaluated || get_variables()[i] && get_variables()[i].type == "fn")
        rawSet(n, i);
}

function setGlobal(n, i, type) {
    n = Parameter.unzip(n);
    i = Parameter.unzip(i);
    if (!n || !exists(i))
        return log_error(`improper_num_of_args`, true, "=", 2);

    if (!get_variables()[n])
        return log_error(`variable_does_not_exist`, true, n);

    write(`(global $${n} ${getLiteral(type)} ${'(' + pushNumsLiteral(type, n, i).join('), (') + ')'})`);
}

function setGlobalFunction(n, i) {
    n = Parameter.unzip(n);
    i = Parameter.unzip(i);
    if (!(n && i))
        return log_error(`improper_num_of_args`, true, "=", 2);

    if (!get_variables()[n])
        return log_error(`variable_does_not_exist`, true, n);

    if (!get_variables()[i])
        return log_error(`variable_does_not_exist`, true, i);

    write(`(global $${n} global.get $${i})`);
}

const createDefaultOperator = (wasm, char) => {
    return (n, i) => {

        if (!(n && i))
            return log_error(`improper_num_of_args`, true, char, 2);
        const pushed = pushNums("11", Parameter.getBiggestValue(n, i), n, i);
        n = pushed.unzipped[0];
        i = pushed.unzipped[1];

        if (!(n && i))
            return log_error(`improper_num_of_args`, true, char, 2);

        // if (!isNaN(+n) && !isNaN(+i)) {
        //     return +eval("" + n + char + i);
        // }
        const type = pushed.type;
        write(`${type}.${wasm}`);
        return new evaluated(type);
    }
}

const add = createDefaultOperator("add", '+');

const subtract = createDefaultOperator("sub", '-');

const mult = createDefaultOperator("mul", '*');

const divide = createDefaultOperator("div_s", '/');

const modulo = createDefaultOperator("rem_s", '%');

const exponent = (n, i) => {
    
// Doesn't work yet...

    // n = Parameter.unzip(n);

    // if (!exists(n))
    //     return log_error(`improper_num_of_args`, true, char, 2);

    // const type = pushNums("10", Parameter.getBiggestValue(n, i), n, i).type;

    // i = Parameter.unzip(i);

    // if (!exists(i))
    //     return log_error(`improper_num_of_args`, true, char, 2);

    // write(`(${type}.eqz)\n\t(if (then (${type}.const 1) (end)))`);
    // return new evaluated(type);
}


const bit_and = createDefaultOperator("and", '&');

const bit_or = createDefaultOperator("or", '|');

const bit_xor = createDefaultOperator("xor", '^');

const bit_not = n => {
    n = Parameter.unzip(n);

    if (!exists(n))
        return log_error(`improper_num_of_args`, true, '~', 1);

    const type = pushNums("10", Parameter.getBiggestValue(n), n, '-1').type;
    write(`${type}.const -1`);
    write(`${type}.xor`);
    return new evaluated(type);
}



const left_shift = createDefaultOperator("shl", '<<');

const right_shift = createDefaultOperator("shr_s", '>>');

const right_shift_unsigned = createDefaultOperator("shr_u", '>>>');


const softEquals = createDefaultOperator("eq", "==");

const notEquals = (n, i) => {
    const pushed = pushNums("11", Parameter.getBiggestValue(n, i), n, i);
    n = pushed.unzipped[0];
    i = pushed.unzipped[1];

    // if (!isNaN(+n) && !isNaN(+i)) {
    //     return +eval("" + n + char + i);
    // }
    const type = pushed.type;
    write(`${type}.eq`);
    write(`i32.eqz`);
    return new evaluated(type);
}

const hardEquals = (n, i) => {
    if (getType(Parameter.vm(n)) != getType(Parameter.vm(i)))
        return 0;
    return createDefaultOperator("eq", "===")(n, i);
}

const hardNotEquals = (n, i) => {
    if (getType(Parameter.vm(n)) != getType(Parameter.vm(i)))
        return 0;
    return notEquals(n, i);
}

const not = n => {
    n = Parameter.unzip(n);
    if (!exists(n))
        return log_error(`improper_num_of_args`, true, '!', 1);

    const type = pushNums("1", Parameter.getBiggestValue(n), n).type;
    write(`${type}.eqz`);
    return new evaluated(type);
}


const flessThan = createDefaultOperator("lt_u", '<');
const flessThanOrEqualTo = createDefaultOperator("le_u", '<=');

const fgreaterThan = createDefaultOperator("gt_u", ">");
const fgreaterThanOrEqualTo = createDefaultOperator("ge_u", ">=");

const and = createDefaultOperator("mul", "&&");
const or = createDefaultOperator("or", "||");


// Impure operators

const fplusplus = n => {
    if (getPure())
        return log_error("impure_operator_from_pure", true, "++")

    n = Parameter.unzip(n);

    if (!exists(n))
        return log_error(`improper_num_of_args`, true, '!', 1);

    const type = set(n, add(n, 1), true);
    subtract(n, 1);
    return new evaluated(type);
}

const fminusminus = n => {
    if (getPure())
        return log_error("impure_operator_from_pure", true, "++")

    n = Parameter.unzip(n);

    if (!exists(n))
        return log_error(`improper_num_of_args`, true, '!', 1);

    const type = set(n, subtract(n, 1), true);
    add(n, 1);
    return new evaluated(type);
}

// N equals (impure continued)

const createNEquals = (fn, char) => {
    return (n, i) => {
        if (getPure())
            return log_error("impure_operator_from_pure", true, char)
    
        if (!exists(Parameter.vm(n)) || !exists(Parameter.vm(i)))
            return log_error(`improper_num_of_args`, true, char, 2);
    
        const type = set(n, fn(n, i), true);
        return n;
    }
}

const plusEquals = createNEquals(add, '+=');

const minusEquals = createNEquals(subtract, '-=');

const multEquals = createNEquals(mult, '*=');

const divEquals = createNEquals(divide, '/=');

const modEquals = createNEquals(modulo, '%=');

const exponentEquals = createNEquals(exponent, '**=');

const leftShiftEquals = createNEquals(left_shift, '<<=');

const rightShiftEquals = createNEquals(right_shift, '>>=');

const unsignedRightShiftEquals = createNEquals(right_shift_unsigned, '>>>=');

const bitAndEquals = createNEquals(bit_and, '&=');

const bitOrEquals = createNEquals(bit_or, '|=');

const bitXorEquals = createNEquals(bit_xor, '^=');


const andEquals = (n, i) => {
    if (getPure())
        return log_error("impure_operator_from_pure", true, "&&")

    if (!exists(Parameter.vm(n)) || !exists(Parameter.vm(i)))
        return log_error(`improper_num_of_args`, true, "&&", 2);

    if_s(n);
    set(n, i, true);
    endif_s();
    return n;
}

const orEquals = (n, i) => {
    if (getPure())
        return log_error("impure_operator_from_pure", true, "||")

    if (!exists(Parameter.vm(n)) || !exists(Parameter.vm(i)))
        return log_error(`improper_num_of_args`, true, "||", 2);

    if_s(not(n));
    set(n, i, true);
    endif_s();
    return n;
}



//

module.exports = {
    set, setGlobal, setGlobalFunction,
    createDefaultOperator,
    add, subtract, mult, divide, modulo, exponent,
    not, and, or,
    bit_and, bit_not, bit_or, bit_xor, right_shift, right_shift_unsigned, left_shift,
    softEquals, hardEquals, notEquals, hardNotEquals,
    flessThan, flessThanOrEqualTo, fgreaterThan, fgreaterThanOrEqualTo,
    fplusplus, fminusminus,
    plusEquals, minusEquals, multEquals, divEquals, modEquals, exponentEquals, leftShiftEquals, rightShiftEquals, unsignedRightShiftEquals, bitAndEquals, bitOrEquals, bitXorEquals, andEquals, orEquals,
};