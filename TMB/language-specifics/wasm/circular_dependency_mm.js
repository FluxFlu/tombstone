const { write, log_error } = require("../../tombstone");
const { Parameter } = require("./parameter");
const { evaluated, exists } = require("./variableUtils");
const { options } = require("../../../mtc");
const { pushNums } = require("./stackUtils");
const { if_s } = require("./std");

const add = ((n, i) => {
    const pushed = pushNums("11", Parameter.getBiggestValue(n, i), n, i);
    n = pushed.unzipped[0];
    i = pushed.unzipped[1];


    if (!n || !exists(i))
        return log_error(`improper_num_of_args`, true, '+', 2);

    const type = pushed.type;
    write(`${type}.add`);
    return new evaluated(type);
});

function getReferencePtr(array) {
    array = add(array, 4);
    return new Parameter(() => new evaluated("i32"));
}

const ptr = options.pointerSize;

const meta_memory = Math.ceil(options.maxHeapSize * 2000 / 257);

function page_to_ptr() {
    write(`i${ptr}.const 64`);
    write(`i${ptr}.sub`);
    write(`i${ptr}.const 32`);
    write(`i${ptr}.mul`);
    write(`i${ptr}.const ` + meta_memory);
    write(`i${ptr}.add`);
    return new evaluated("Reference Value", "i32");
}

function loadBase() {
    write(`i${ptr}.const 0`);
    write(`i${ptr}.load`);
    return new evaluated(`i${ptr}`);
}

function addPointerCount(array) {

    if (array.value && array.value.toString().includes(".getReferenceValue()"))
        array.value = () => page_to_ptr(loadBase());

    getReferencePtr(array);
    getReferencePtr(array);

    write(`i32.load`);
    write(`i32.const 1`);
    write(`i32.add`);
    write(`i32.store`);
}

function removePointerCount(array) {

    getReferencePtr(array);
    getReferencePtr(array);

    write(`i32.load`);
    write(`i32.const 1`);
    write(`i32.sub`);
    write(`i32.store`);
}

module.exports = { addPointerCount, removePointerCount }