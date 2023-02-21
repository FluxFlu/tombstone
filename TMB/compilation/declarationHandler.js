const { options } = require("../../mtc");
const { getScope } = require("../language-specifics/wasm/variableUtils");
const { log_compiler_error, fileData } = require("../tombstone");
const { token, types } = require("./tokenizationHandler");

let currentFunctionNum = 0n;

let numFunctions = 0n;

let tokenGroups = {
    "functions": [],
    "variables": [],
};

let shortFunctionList = [];


function intToString(int) {
    const bin = int.toString(2);
    let binSplit = [];
    bin.split('').forEach((e, i) => {
        if (!(i % 6))
            binSplit.push([]);
        if (e == '-')
            e = '1';
        binSplit[binSplit.length - 1].push(e);
    });
    binSplit = binSplit.reverse();
    for (let i in binSplit) {
        binSplit[i] = binSplit[i].reverse();
        while (binSplit[i].length < 6)
            binSplit[i].push('0');
    }
    let finalBin = "";

    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_$";
    const nums = [1, 2, 4, 8, 16, 32];
    binSplit.forEach((e) => {
        let currNum = 0;
        for (let i = 0; i < e.length; i++) {
            if (e[i] == '1')
                currNum += nums[i];
        }
        finalBin += chars[currNum];
    })
    return finalBin;
}

let declarationList = {};

const getDeclarationList = () => declarationList;

function ptrPad(num) {
    let i = num;
    let str = ""
    while (i--)
        str += "*"
    return str
}

let allExports = [];

const getAllExports = () => allExports;

const resetExports = () => allExports = [];

let currentFunction = 0;
function currentFunctionPlusPlus() {
    return currentFunction++;
}

let functionOverallNum = 0n;

function handleDeclarations(tokens) {
    functionGrounds = false;
    currentFunctionNum = 0n;
    currentFunction = 0;
    declarationList = {};

    numFunctions = 0n;

    tokenGroups = {
        "functions": [],
        "variables": [],
    };


    shortFunctionList = [];

    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type == "Operator" && tokens[i].value == "=>") {
            let brack = 1;
            let j;
            for (j = i - 2; brack; j--) {
                if (j < 0)
                    return log_compiler_error("unbalanced_parenthesis", true);
                if (tokens[j].value == ')')
                    brack++;
                if (tokens[j].value == '(')
                    brack--;
            }
            let args = tokens.splice(j + 1, i - 1 - j);
            args.pop();
            args.shift();
            i = j + 1;

            brack--;
            for (j = i + 2; brack; j++) {
                if (j > tokens.length - 1)
                    return log_compiler_error("unbalanced_braces", true);
                if (tokens[j].value == '}')
                    brack++;
                if (tokens[j].value == '{')
                    brack--;
            }
            let funcContents = tokens.splice(i, j - i);
            funcContents.pop();
            funcContents.shift();
            funcContents.shift();

            let finalArgs = "";
            for (j = 0; j < args.length; j++) {
                if (args[j].value == ',')
                    finalArgs += '", "';
                else
                    finalArgs += ' ' + args[j].value + ptrPad(args[j].misc);
            }

            const pArgs = finalArgs;
            finalArgs = finalArgs.replaceAll(/[^*A-Za-z0-9_ ]/g, '').split(' ');
            finalArgs.shift();
            finalArgs = finalArgs.filter(e => e && e != ' ');
            let finalArgNames = finalArgs.filter((e, i) => i % 2);
            let finalArgTypes = finalArgs.filter((e, i) => !(i % 2));

            let type;
            if (!types[tokens[i - 1].value]) {
                type = "nil";
                tokens.splice(i, 0, token("Pointer", currentFunctionNum + "n, {args: [" + finalArgTypes.map(e => '"' + e + '"') + '], result: "nil"}'));
            } else {
                type = tokens.splice(--i, 1, token("Pointer", currentFunctionNum + ", {args: [" + finalArgTypes.map(e => '"' + e + '"') + '], '))[0].value;
                tokens[i + 0].value = tokens[i + 0].value + `result: "${type}"}`;
            }
            tokenGroups.functions.push(token("Function", `createsig(["${pArgs}"], "${type}");\n`));
            tokenGroups.functions.push(token("bigOperator", `getDeclarationList()["${currentFunctionNum}"] = (selfFunction) => {`));
            tokenGroups.functions.push(token("bigOperator", `functionGrounds = true;`));
            let varList = [];
            let funcBrackets = 0;
            for (let t = 0; t < funcContents.length; t++) {
                if (t + 2 >= funcContents.length)
                    break;
                if (types[funcContents[t].value] && funcContents[t + 2].value == '=' && !funcBrackets) {
                    varList.push(`" ${funcContents[t].misc > 0 ? "i" + options.pointerSize : funcContents[t].value} ${funcContents[t + 1].value}"`);
                }
            }
            let export_b = "";
            let pure = tokens[i - 4].value != "impure";
            if (tokens[i - 4] && (tokens[i - 4].value == "export" || tokens[i - 5] && tokens[i - 5].value == "export" && tokens[i - 4].value == "impure")) {
                export_b = tokens[i - 2]?.value ?? "";
            }
            if (tokens[i - 4] && tokens[i - 4].value == "entry" || tokens[i - 5] && tokens[i - 5].value == "entry" && tokens[i - 4].value == "impure") {
                export_b = tokens[i - 2]?.value ?? "";
                fileData.entryPoint = export_b;
            }
            if (export_b)
                allExports.push(export_b)
            tokenGroups.functions.push(token("Function", `function_s("${intToString(functionOverallNum)}", "${type}", ["${pArgs}"], [${varList.join(', ')}], "${export_b}", ${pure});\n`));

            for (j = 0; j < finalArgNames.length; j++)
                tokenGroups.functions.push(token("Function", `alloc("${finalArgNames[j]}", "${finalArgTypes[j]}", false, 0, true, false);`))
            tokenGroups.functions = tokenGroups.functions.concat(funcContents);
            tokenGroups.functions.push(token("Function", `\nendfunction_s();`));
            tokenGroups.functions.push(token("bigOperator", `functionGrounds = false;`));
            tokenGroups.functions.push(token("bigOperator", `}\n`));
            shortFunctionList.push(intToString(functionOverallNum));
            currentFunctionNum++;
            functionOverallNum++;
            numFunctions++;

            tokens.splice(i + 1, 0, token("Function", ", getDeclarationList()[currentFunctionPlusPlus()]("))
            tokens.splice(i + 2, 0, token("Function", `selfFunction.scope= "${getScope()}"; selfFunction.params = ["${finalArgTypes.join('", "')}"]; selfFunction.result = "${type}"; })())`))
        }
    }
    tokenGroups.functions.unshift(token("Function", `functionTable(${shortFunctionList.length}, ["${shortFunctionList.join('", "')}"]);`));
    tokenGroups.functions.unshift(token("Function", `createHeap();`));
    tokenGroups.functions.push(token("Function", `createsig([], "nil");\n`));
    tokenGroups.functions.push(token("Function", `fsighandle();`));
    tokens = tokenGroups.functions.concat(tokens);

    return tokens;
}

module.exports = { handleDeclarations, intToString, getDeclarationList, currentFunctionPlusPlus, getAllExports, resetExports };