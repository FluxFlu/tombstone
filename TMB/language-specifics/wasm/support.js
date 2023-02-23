// const { getLinkCount } = require("./linkage");

const { options } = require("../../../mtc");
const { fileData } = require("../../tombstone");

function formatLinkedLibraries(linkedLibraries) {
    return linkedLibraries.map(e => "lib_" + e.location + ": lib_" + e.location).join(', ');
}

// function formatLinkedFiles(linkedFiles) {
//     // return '
//     // return linkedFiles.map(e => "linked_" + getLinkCount() + ": file_" + e.location).join(', ');
// }

function genLibraryObj(lib) {
    let out = "{";
    Object.keys(lib).forEach(e => {
        const fn = lib[e];
        out += '\n';
        out += e;
        out += ': (';
        out += fn
        out += '),\n';
    })
    out += "}"
    return out;
}

function genSupport(language, linkedFiles, linkedLibraries, originalFileName, originalExports) {
    let out = "";
    const library_setup = require("../../libt/" + language + "/library_setup")
    if (language == "node") {
        out += '#!/usr/bin/env node';
        out += '\nconst fs = require("fs");';
        out += '\nlet wasmInstance;';
        out += '\n\n';
        linkedLibraries.filter(lib => library_setup[lib.location]).forEach(lib => out += "const lib_" + lib.location + " = " + genLibraryObj(library_setup[lib.location]) + '\n');
        out += `\n\nwasmInstance = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync("${originalFileName.replace("tmb", "wasm")}")), { ${formatLinkedLibraries(linkedLibraries)} });`;
        out += `\n\nconst { setMemory, memory ${originalExports ? ', ' : ''}${originalExports.join(', ')} } = wasmInstance.exports;`;
        out += `\n\nmodule.exports = { ${originalExports.join(', ')} }`;
        out += '\nfunction register_string(location, string) {';
        out += `\n      setMemory(15, 1);`
        out += `\n      setMemory(location, string.length);`
        out += '\n  for(let i = 0; i < Math.ceil(string.length / 4); i++)';
        out += `\n      setMemory(location + i + 8,
            (string.charCodeAt(i + 0)      ) |
            (string.charCodeAt(i + 1) << 8 ) |
            (string.charCodeAt(i + 2) << 16) |
            (string.charCodeAt(i + 3) << 24)
        );`;
        out += '\n}';
	out += `\nprocess.argv.shift();`;
        out += `\nprocess.argv.shift();`;
	out += `\nprocess.argv = process.argv.join(' ')`;
        out += `\n`;
        out += `\nregister_string(${Math.ceil(options.maxHeapSize / 257) * 4}, process.argv)`;
        out += `\n`;
        out += fileData.entryPoint + `(${Math.ceil(options.maxHeapSize / 257) * 4});`;
    }
    return out;
}

module.exports = { genSupport }
