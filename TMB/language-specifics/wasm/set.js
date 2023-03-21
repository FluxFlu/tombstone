const { options } = require("../../../mtc");
const { write } = require("../../tombstone");
const { addPointerCount, changePointerCount } = require("./mmCount");
const { Parameter } = require("./parameter");
const { pushNums, pushNumsLiteral } = require("./stackUtils");
const { get_variables, exists, evaluated, isNumber, getLiteral } = require("./variableUtils");

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

    if (options.garbageCollect && (get_variables()[Parameter.vm(n)] && get_variables()[Parameter.vm(n)].size && get_variables()[Parameter.vm(n)].initialized || n instanceof Parameter && Parameter.vm(i).type == "Reference Value")) {
        changePointerCount(n, "sub");
    }

    const pushed = pushNums("01", Parameter.getBiggestValue(n, i), n, i);
    if (options.garbageCollect && (get_variables()[Parameter.vm(i)] && get_variables()[Parameter.vm(i)].size || i instanceof Parameter && Parameter.vm(i).type == "Reference Value")) {
        changePointerCount(i, "add");
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

module.exports = { set, setGlobal, setGlobalFunction }