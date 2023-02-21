const { write, log_compiler_error, log_error, get_current } = require("../../tombstone");
const { safeParameterUnzip } = require("./circular_dependency_parameter");
const { Parameter } = require("./parameter");
const { getType, exists, get_variables, evaluated } = require("./variableUtils");

function generate_coerce(from, to, term, requires_explicit, S) {
    return (value, implicit) => {
        if (requires_explicit && implicit)
            return log_error("cant_coerce_down", true, from, to);

        if (!value || !exists(value))
            return log_error("invalid_coercion_call", true);

        value = Parameter.unzip(value);

        if (get_variables(value)) {
            get_variables(value).type = to;
            write(`${get_variables(value).scope}.get $` + get_variables(value).spot)
        }
        console.trace()


        write(to + "." + term + "_" + from + (S ? "_s" : ""));
        console.log(get_current())

        // if (value instanceof evaluated)
        //     return new evaluated(to)
        return new evaluated(to);
    }
}

function coerce_to_i32(value, implicit) {
    const from = getType(Parameter.vm(value));
    switch (from) {
        case "i64": {
            return generate_coerce("i64", "i32", "wrap", true, false)(value, implicit)
        }
        case "f32": {
            return generate_coerce("f32", "i32", "trunc", true, true)(value, implicit)
        }
        case "f64": {
            return generate_coerce("f64", "i32", "trunc", true, true)(value, implicit)
        }
    }
}

function coerce_to_i64(value, implicit) {
    const from = getType(Parameter.vm(value));
    switch (from) {
        case "i32": {
            return generate_coerce("i32", "i64", "extend", false, true)(value, implicit)
        }
        case "f32": {
            return generate_coerce("f32", "i64", "trunc", true, true)(value, implicit)
        }
        case "f64": {
            return generate_coerce("f64", "i64", "trunc", true, true)(value, implicit)
        }
    }
}

function coerce_to_f32(value, implicit) {
    const from = getType(Parameter.vm(value));
    switch (from) {
        case "i32": {
            return generate_coerce("i32", "f32", "convert", true, true)(value, implicit)
        }
        case "i64": {
            return generate_coerce("i64", "f32", "convert", true, true)(value, implicit)
        }
        case "f64": {
            return generate_coerce("f64", "f32", "demote", true, false)(value, implicit)
        }
    }
}

function coerce_to_f64(value, implicit) {
    const from = getType(Parameter.vm(value));
    switch (from) {
        case "i32": {
            return generate_coerce("i32", "f64", "convert", true, true)(value, implicit)
        }
        case "i64": {
            return generate_coerce("i64", "f64", "convert", true, true)(value, implicit)
        }
        case "f32": {
            return generate_coerce("f32", "f64", "promote", false, false)(value, implicit)
        }
    }
}

function coerce_to_str(value, implicit) {
    return log_error("cant_coerce", true, "str", getType(Parameter.vm(value)));
}

function coerce_to_fn(value, implicit) {
    return log_error("cant_coerce", true, "fn", getType(Parameter.vm(value)));
}

const coercions = {
    "i32": coerce_to_i32,
    "i64": coerce_to_i64,
    "f32": coerce_to_f32,
    "f64": coerce_to_f64,
    "fn": coerce_to_fn,
    "str": coerce_to_str,
}

function coerce(value, desiredType) {
    value = safeParameterUnzip(value);
    if (getType(value) == desiredType)
        return value;
    if (!coercions[getType(value)]) {
        return
    }
    return coercions[desiredType](value, true);
}

module.exports = { coerce, coerce_to_i32, coerce_to_i64, coerce_to_f32, coerce_to_f64, coerce_to_str, coerce_to_fn }