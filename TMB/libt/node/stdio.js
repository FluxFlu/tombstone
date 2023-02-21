
function i32_to_str (value) {

}

const print = (value) => {
    const size = new Uint8Array(memory.buffer.slice(value, 4 + value))[0];
    console.log(Buffer.from(memory.buffer.slice(value + 8, size + 8 + value)).toString());
}

const printNum = (value) => {
    console.log(value)
}

// const error = (wasm)

module.exports = {
    print: print,
    printNum: printNum
}