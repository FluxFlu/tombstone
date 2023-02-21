const { write, global } = require("../../tombstone");
const { options } = require("../../../mtc");

function createHeap() {
    if (global.isLinked)
        return;
    write(`(memory (export "memory") ${options.minHeapSize} ${options.maxHeapSize})`);
}

module.exports = { createHeap };