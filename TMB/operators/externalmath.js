// Functions:
function figType(value) {
    if (variables[value].type == "char")
        return figure('\0');
    else if (variables[value].type == "int")
    return figure(0);
}


// Unary:

// !n
function fnot(n) {
    const f = figure(0);
    set(f, n);
    not(f);
    return f;
}

// ++n
function plusplusf(n) {
    const f = figType(n);
    plusplus(n);
    set(f, n);
    return f;
}

// --n
function minusminusf(n) {
    const f = figType(n);
    minusminus(n);
    set(f, n);
    return f;
}

// n++
function fplusplus(n) {
    const f = figType(n);
    set(f, n);
    plusplus(n);
    return f;
}

// n--
function fminusminus(n) {
    const f = figType(n);
    set(f, n);
    minusminus(n);
    return f;
}


// Binary:

function softEquals(n, i) {
    const f = figure(0);
    set(f, n);
    setequal(f, i);
    return f;
}

function notEquals(n, i) {
    const f = figure(0);
    set(f, n);
    setequal(f, i);
    not(f);
    return f;
}

function hardEquals(n, i) {
    console.log(variables[n]);
    console.log(variables[i]);
    if (variables[n]?.type != variables[i]?.type)
        return figure(0);
    const f = figure(0);
    set(f, n);
    setequal(f, i);
    return f;
}

function hardNotEquals(n, i) {
    if (variables[n]?.type != variables[i]?.type)
        return figure(1);
    const f = figure(0);
    set(f, n);
    setequal(f, i);
    return f;
}

function fadd(n, i) {
    const f = figType(n);
    set(f, n);
    add(f, i);
    return f;
}

function fsubtract(n, i) {
    const f = figType(n);
    set(f, n);
    subtract(f, i);
    return f;
}

function fmult(n, i) {
    const f = figType(n);
    set(f, n);
    mult(f, i);
    return f;
}

function fdivide(n, i) {
    const f = figType(n);
    set(f, n);
    divide(f, i);
    return f;
}

function fmodulo(n, i) {
    const f = figType(n);
    set(f, n);
    modulo(f, i);
    return f;
}

function fand(n, i) {
    const f = figure(0);
    set(f, n);
    and(f, i);
    return f;
}

function f_or(n, i) {
    const f = figure(0);
    set(f, n);
    or(f, i);
    return f;
}

function flessThan(n, i) {
    const f = figure(0);
    set(f, n);
    lessthan(f, i);
    return f;
}

function fgreaterThan(n, i) {
    const f = figure(0);
    set(f, n);
    greaterthan(f, i);
    return f;
}

function flessThanOrEqualTo(n, i) {
    const f = figure(0);
    set(f, n);
    lessthanorequalto(f, i);
    return f;
}

function fgreaterThanOrEqualTo(n, i) {
    const f = figure(0);
    set(f, n);
    greaterthanorequalto(f, i);
    return f;
}

// // If arrays are contiguous blocks of memory, where the variable of the array is just the head
// function arrayGet(array, i) {
//     const f = figure(0);
//     let h;
//     for (let x = 0; x < array.length; x++) {
//         set(f, i);
//         numsetequal(f, x);
//         if_s(f);
//             h = array + x;
//         endif_s();
//     }
//     return h;
// }