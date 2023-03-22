const { write, log_error, getPure, fileData } = require("../../tombstone");
const { Parameter } = require("./parameter");
const { pushNums } = require("./stackUtils");
const { evaluated, exists, getType } = require("./variableUtils");
const { endif_s, if_s } = require("./std");

const createDefaultOperator = (wasm, char) => {
    return (n, i) => {
        if (!(exists(n) && exists(i)))
            return log_error(`improper_num_of_args`, true, char, 2);
        const pushed = pushNums("11", Parameter.getBiggestValue(n, i), n, i);
        n = pushed.unzipped[0];
        i = pushed.unzipped[1];
        if (!(exists(n) && exists(i)))
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

module.exports = {
    add, subtract, mult, divide, modulo, exponent,
    not, and, or,
    bit_and, bit_not, bit_or, bit_xor, right_shift, right_shift_unsigned, left_shift,
    softEquals, hardEquals, notEquals, hardNotEquals,
    flessThan, flessThanOrEqualTo, fgreaterThan, fgreaterThanOrEqualTo,
};