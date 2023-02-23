const { options } = require("../../../mtc");
const { write, getPure, log_error, get_current } = require("../../tombstone");
const { safeParameterUnzip } = require("./circular_dependency_parameter");
const { coerce } = require("./coercion");
const { getBiggestValue, evaluated, isLiteral, get_variables, getType, getLiteral } = require("./variableUtils");

function pushNums(bitmap, coercemap, ...n) {
    if (coercemap == "fn")
        coercemap = null
    while (n.length == 1 && n[0] instanceof Array)
        n = n[0];

    if (!Array.isArray(n))
        n = [n];

    if (coercemap && !Array.isArray(coercemap)) {
        const val = coercemap;

        coercemap = [];
        while (coercemap.length < n.length)
            coercemap.push(val);
    }

    const valType = getBiggestValue(n);

    const unzipped = [];
    for (let i = 0; i < n.length; i++) {
        n[i] = safeParameterUnzip(n[i]);
        unzipped.push(n[i])
        if (get_variables(n[i]) || n[i] instanceof evaluated) {
            if (getPure() && get_variables(n[i]) && !get_variables(n[i]).pure)
                log_error("impure_reference_from_pure", true, get_variables(n[i]).spot);
            if (bitmap[i] == "1" && !(n[i] instanceof evaluated)) {
                write(get_variables(n[i]).scope + ".get $" + get_variables(n[i]).spot);
                if (coercemap && coercemap[i]) {
                    n[i] = coerce(n[i], coercemap[i]) || n[i];
                }
            } else if (bitmap[i] == "1" && n[i].type == "Accessed Value") {
                write(n[i].misc + ".load")
            } else if (bitmap[i] == "1" && n[i].type != "Reference Value") {
                n[i] = coerce(n[i], coercemap[i]) || n[i];
            }
        } else if (bitmap[i] == "1") {
            if (coercemap) {
                coerce(n[i], coercemap[i])
                if (isLiteral(n[i]))
                    n[i] = new evaluated(coercemap[i]);
            } else
                write(valType + ".const " + n[i]);
        }
    }
    return { type: getBiggestValue(coercemap) || valType, values: n, unzipped: unzipped }
}

function pushNumsLiteral(type, ...n) {
    while (n.length == 1 && n[0] instanceof Array)
        n = n[0];

    const valType = type;
    let vals = [];
    for (let i = 0; i < n.length; i++) {
        if (get_variables(n[i]) || n[i] instanceof evaluated)
            ;
        else
            vals.push(valType + ".const " + n[i]);
    }
    return vals;
}

module.exports = { pushNums, pushNumsLiteral }