const { wasm_optimize } = require("./wasm_optimize");

function optimize(file, language) {
    switch(language) {
       case "wasm":
            return wasm_optimize(file);
    }
    return file;
}

module.exports = { optimize }
