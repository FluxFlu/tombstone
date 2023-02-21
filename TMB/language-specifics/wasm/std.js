const { write, log_error, getPure } = require("../../tombstone");
const { Parameter } = require("./parameter");
const { pushNums } = require("./stackUtils");

function if_s(n) {
    n = Parameter.unzip(n);
    if (!n)
        return log_error(`incorrect_params`, true, "any", "");

    pushNums("1", "i32", n);
    write(`(if (then`);
}

function else_s() {
    write(`) (else `)
}

function endif_s() {
    write(`))`);
}

let curr_loop = 0n;
function new_loop() {
    return (curr_loop++).toString().split('').map(e => String.fromCharCode(+e + 65)).join('')
}

const loopStack = [];

function while_s(n) {
    if (getPure())
        return log_error("loop_from_impure", true);
    const loop = new_loop();
    write(`(loop $` + loop);
    if_s(n);
    loopStack.unshift(loop);
}

function endwhile_s(s) {
    write(`br $` + loopStack.shift())
    endif_s();
    write(`)`);
}

module.exports = { if_s, endif_s, else_s, new_loop, while_s, endwhile_s }