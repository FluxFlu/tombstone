const { intToString, currentFunction } = require("../../compilation/declarationHandler");
const { write, pureWrite, log_error, get_current, getPure, getPurityStack, global, fileData } = require("../../tombstone");
const { Parameter } = require("./parameter");
const { get_variables, getLiteral, isLiteral, exists } = require("./variableUtils");
const { evaluated, setScope, getScope, getType, valType } = require("./variableUtils");
const { pushNums } = require("./stackUtils");
const { options } = require("../../../mtc");
const { removePointerCount, changePointerCount } = require("./mmCount");
const { Bitmap } = require("./mm");

class fsig {
    constructor(params, result) {
        this.params = params;
        this.result = result;
    }
    static get(params, return_value) {
        let n;
        for (let i in fsigs) {
            if (fsigs[i].result != return_value)
                continue;
            if (fsigs[i].params.length != params.length)
                continue;
            n = true;
            for (let j in fsigs[i].params) {
                if (fsigs[i].params[j] != params[j]) {
                    n = false;
                    break;
                }
            }
            if (n) {
                return fsigs[i];
            }
        }
    }
    equals(other) {
        if (!other)
            return false;
        if (!other.result)
            return false;
        if (this.params.length != other.params.length)
            return false;
        if (this.result != other.result)
            return false;
        for (let i in this.params)
            if (this.params[i] != other.params[i])
                return false;
        return true;
    }
    exists() {
        for (let i in fsigs) {
            if (this.equals(fsigs[i])) {
                return true;
            }
        }
        return false;
    }
}

let fsigs = [];

let returned;
let currentReturnType;
let functionList = [];
let returnTypeStack = [];
let selfFunction = { name: null, params: null, result: null, scope: null, pure: null }

function reset_all() {
    returned = null;
    currentReturnType = null;
    // functionList = [];
    returnTypeStack = [];
    selfFunction = { name: null, params: null, result: null, scope: null, pure: null };
    // fsigs = [];
}

function functionTable(num, names) {
    reset_all();
    if (global.isLinked)
        return;
    functionGrounds = true;
    write(`(table ${num} funcref)`);

    functionGrounds = false;

    write(`(elem (i32.const 0)`);
    for (let i = 0; i < names.length; i++) {
        pureWrite(" $f" + names[i]);
    }
    pureWrite(')');
}

function createsig(parameters, type) {
    parameters = parameters.map(e => e.includes("*") ? " i" + options.pointerSize + " TEMP" : e).filter((e) => e.split(' ')[2] != undefined).map(e => e.split(' ')[0] + e.split(' ')[1]);
    const sig = new fsig(parameters, type);
    if (!sig.exists()) {
        fsigs.push(sig);
    }
}
function fsighandle() {
    if (global.isLinked)
        return;
    for (let i = 0; i < fsigs.length; i++) {
        let params = "(param " + fsigs[i].params.map(e => getLiteral(e)).join(") (param ") + ") ";
        if (fsigs[i].params.length == 0)
            params = "";
        write(`(type $fsig${intToString(i)} (func ${params}${fsigs[i].result != "nil" ? `(result ${fsigs[i].result})` : ""}))`);
        fsigs[i].name = intToString(i);
    }
}


function function_s(name, type, parameters, locals, export_b, pure) {
    functionList.push({ name: name, type: type, parameters: parameters, locals: locals, scope: getScope() });
    setScope("local");
    returned = false;
    currentReturnType = type;
    // currentFunctionName = name;
    if (global.isLinked && export_b) {
        global.exports[export_b] = ({name: export_b, fn: name, pure: pure});
        write('(func $f' + name);
    } else if (export_b) {
        write('(func $f' + name + ' (export "' + export_b + '")');
        // currentExport = export_b;
    } else {
        write('(func $f' + name);
        // currentExport = null;
    }
    for (let i = 0; i < parameters.length; i++) {
        if (parameters[i].split(' ')[2] == undefined)
            continue;
        const paramType = parameters[i].split(' ')[1].includes("*") ? "i" + options.pointerSize : parameters[i].split(' ')[1];
        const paramName = parameters[i].split(' ')[2];

        pureWrite(` (param $${paramName} ${getLiteral(paramType)})`);
    }
    if (type != "nil")
        pureWrite(" (result " + type + ")");

    for (let i = 0; i < locals.length; i++) {
        if (locals[i].split(' ')[2] == undefined)
            continue;
        const localType = locals[i].split(' ')[1];
        const localName = locals[i].split(' ')[2];
        pureWrite(` (local $${localName} ${getLiteral(localType)})`);
    }
    returnTypeStack.push(type);
    getPurityStack().unshift(pure);
}

function endfunction_s() {
    if (!returned && currentReturnType != "nil")
        log_error("no_return", true, currentReturnType);


    //     return_s(0)
    if (currentReturnType != "nil") {
        write(getLiteral(currentReturnType) + '.const 0');
        write('return');
    }
    write(')');
    setScope("global");
    getPurityStack().shift()
}

function return_s(n) {

    n = Parameter.unzip(n);
    
    // if (get_variables(n))
    //     n = get_variables(n)

    // Garbage collect
    if (options.garbageCollect) {
        const toCull = functionList[functionList.length - 1].locals.concat(functionList[functionList.length - 1].parameters).map(e => e.split(' ')[2]);
        toCull.forEach(e => {
            if (e != n) {
                if (exists(Parameter.vm(e)) && get_variables(Parameter.vm(e)) && get_variables(Parameter.vm(e)).size && get_variables(Parameter.vm(e)).initialized || e instanceof Parameter && Parameter.vm(e).type == "Reference Value") {
                    changePointerCount(e, "sub");
                }
            }
        });
        Bitmap.garbageCollect();
    }

    returned = true;

    if (n instanceof evaluated) {
        if (n.type == "Reference Value" || n.type == "Accessed Value") {
            pushNums('1', 'i' + options.pointerSize, n);
        }

        return write(`return`);
    }

    if (isLiteral(n)) {
        write(`${getLiteral(currentReturnType)}.const ${n}`);
        write(`return`);
    } else {
        n = pushNums('1', currentReturnType, n).type;
        write(`return`);
        if (n != currentReturnType)
            log_error("incorrect_return_type", true, currentReturnType, getType(n));
    }
}

function paramsEqual(left, right) {
    left = getType(Parameter.vm(left));
    right = getType(Parameter.vm(right));

    if (left instanceof evaluated)
        if (left.type == "Accessed Value" || left.type == "Reference Value")
            left = left.misc
        else
            left = left.type

    if (right instanceof evaluated)
        if (right.type == "Accessed Value" || right.type == "Reference Value")
            right = right.misc
        else
            right = right.type
    if (!left && !right)
        return true;
    if (!left || !right)
        return false;
    if (left == right)
        return true;
    if (right.length != left.length)
        return false;
    for (let i in left)
        if (left[i] != right[i])
            return false;
    return true;
}

function call(n, ...i) {

    n = Parameter.unzip(n);

    // if (currentExport == n) {
    //     return callLiteral(n, ...i);
    // }

    // // Call a function included in the file rather than only ones created within the file.
    // if (included_functions.includes(n)) {
    //     write(``)
    // }

    // Allow functions to call themselves.
    if (n == selfFunction.name) {
        get_variables(n) = {
            spot: n,
            type: "fn",
            misc: { args: selfFunction.params, result: selfFunction.result },
            size: 0,
            scope: selfFunction.scope,
            pure: selfFunction.pure,
        }
    }

    get_variables(n).misc.args = get_variables(n).misc.args.map(e => e.includes("*") ? "i" + options.pointerSize : e)
    if (!n || !get_variables(n))
        return log_error("variable_does_not_exist", true, n);
        if (get_variables(n).type != "fn")
        return log_error("not_a_function", true, get_variables(n).type);
    let callError = false;

    let bitmap = "";
    const coercemap = [];
    for (let l = 0; l < i.length; l++) {
        bitmap += "1";
        coercemap.push(get_variables(n).misc.args[l].includes("*") ? "i" + options.pointerSize : get_variables(n).misc.args[l]);
    }
    if (i.length > 0)
        i = pushNums(bitmap, coercemap, i).unzipped;
    let argTypes = i.filter(e => e != "").map(e => {
        if (getType(Parameter.vm(e)))
            return getType(Parameter.vm(e))
        else {
            callError = true;
            return log_error("variable_does_not_exist", true, e);
        }
    }).filter(e => e && e != "");

    if (callError)
        return;
    if (get_variables(n).misc.args instanceof Array && !paramsEqual(argTypes, get_variables(n).misc.args)) {
        log_error("incorrect_params", true, get_variables(n).misc.args.join(', '), argTypes.join(', '));
    } else if (get_variables(n).isImport) {
        if (getPure() && !get_variables(n).pure)
            log_error("impure_include_from_pure", true, get_variables(n).spot);
        write(`call $` + get_variables(n).spot);
        return new evaluated("i32");
    } else if (global.previousExports[get_variables(n).spot]) {
        if (getPure() && !global.previousExports[get_variables(n).spot].pure)
            log_error("impure_include_from_pure", true, get_variables(n).spot);
        write(`call $f` + global.previousExports[get_variables(n).spot].fn);
        return new evaluated("i32");
        // return new evaluated("i32");
    } else if (getPure() && get_variables(n) && !get_variables(n).pure) {
        log_error("impure_fn_from_pure", true, get_variables(n).spot);
    } else if (!paramsEqual(argTypes, get_variables(n).misc.args))
        log_error("incorrect_params", true, "", argTypes.join(', '));

    write(`(call_indirect (type $fsig${fsig.get(get_variables(n).misc.args, get_variables(n).misc.result).name}) (${get_variables(n).scope}.get $${get_variables(n).spot}))`)

    return new evaluated("i32");
}

module.exports = { functionTable, createsig, fsighandle, function_s, endfunction_s, call, return_s, selfFunction };