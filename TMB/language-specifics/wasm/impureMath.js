


// Impure operators

const { getPure, log_error } = require("../../tombstone");
const { Parameter } = require("./parameter");
const { set } = require("./set");
const { if_s, endif_s } = require("./std");
const { add, subtract, mult, divide, modulo, exponent, left_shift, right_shift, right_shift_unsigned, bit_and, bit_or, bit_xor, not } = require("./stdMath");
const { exists } = require("./variableUtils");

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
    fplusplus, fminusminus,
    plusEquals, minusEquals, multEquals, divEquals, modEquals, exponentEquals, leftShiftEquals, rightShiftEquals, unsignedRightShiftEquals, bitAndEquals, bitOrEquals, bitXorEquals, andEquals, orEquals,
}