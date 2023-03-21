const { options } = require("../../../mtc");
const { fileData } = require("../../tombstone");
const { set, setGlobal, setGlobalFunction } = require("./set");
const { getScope, getLiteral, get_variables } = require("./variableUtils");

function declare(spot, type, misc, size, scope, ptrType, pure, isImport) {
    get_variables()[spot] = { spot: spot, type: type, misc: misc, size: size, scope: scope, ptrType: ptrType, pure: pure, isImport: isImport};
    return spot;
}

// let currentVariableIndex = 0;
function alloc(name, type, misc, size, pure, isImport) {
    // for (let i = 0; ; i++) {
    //     if (!get_bit(i)) {
            // set_bit(i);
            // let i;
            // if (getSize(type) == 8) {
                // if (!currentVariableIndex % 8)
                //     currentVariableIndex++;
                // i = currentVariableIndex;
                // while(i % 8)
                //     i++;
            // } else {
            //     i = currentVariableIndex + getSize(type);
            // }
            let ptrType = null
            if (type.includes('*') || size) {
                ptrType = type;
                type = 'i' + options.pointerSize;
            }
            const e = declare(name, type, misc, size, getScope(), ptrType, pure, isImport);
            return e
            // numset(i, 0);
            // if (type != '*' && type != "Type") {
                // variables[i].type = 1
                // if (typeRealtime)
                    // variables[i].type = type;
                // else
                    // variables[i].type = type;
            // }
            // return i;
    //     }
    // }
}


function pointer(name, type, size, value, misc, pure, second_pure, third_pure) {
    pure ||= second_pure || third_pure;
    // if (n instanceof Array) {
    //     let f = Array.from(n);
    //     f = f.map(e => alloc(variables[e].type, true, true));
    //     for (let i = 0; i < n.length; i++) {
    //         set(f[i], n[i]);
    //     }
    //     return f;
    // }
    if (get_variables()[value] && get_variables()[value].type == "fn") {
        misc = get_variables()[value].misc;
        // set()
        // return;
        // if (getScope() == "global") {
        //     const n = alloc(name, type, misc, +size);
        //     setGlobalFunction(n, value, getLiteral(type));
        //     return `${value}`;
        // }
    }
    if (getScope() == "global") {
        const n = alloc(fileData.current + name, type, misc, +size, pure);
        setGlobal(n, value, getLiteral(type));
    } else {
        const n = alloc(name, type, misc, +size, pure);
        set(n, value, true);
    }
    // alert(5);
    return `${value}`;
}

module.exports = { alloc, pointer };