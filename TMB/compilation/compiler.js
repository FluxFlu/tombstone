// let endParenthesis;

const { log_error, log_compiler_error } = require("../tombstone");
const { allVariables, disallowedWords } = require("./reserve");
const { types, token } = require("./tokenizationHandler");

const terminatingTokens = [/*',', */';', '\n'];

const preventParameterizing = {"return_s": true}

function compile(tokens) {

    const tree = [];
    const curlyStack = [];
    const whileStack = [];

    let currly = "";
    let whilecurr = "";
    endParenthesis = 0;
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type == "Line Break") {
            if (tokens[i].value != '\n')
                tree.push(`setLine(${tokens[i].value});`);
            continue;
        }
        if (tokens[i].type == "bigOperator") {
            tree.push(tokens[i].value);
            continue;
        }
        if (tokens[i].value == "export" || tokens[i].value == "entry") {
            // tree.push("export_s");
            continue;
        }
        if (tokens[i].value == "let") {
            let name = tokens[i + 1];
            tokens.splice(i, 3);
            let j = i;
            for (; !terminatingTokens.includes(tokens[j].value); j++);
            let contents = tokens.splice(i, j - i);
            tree.push(`pointer(${name}, ${contents});`);
            continue;
        }
        else if (allVariables.includes(tokens[i].value)) {
            tokens[i].value = `"${tokens[i].value}"`;
            if (tokens[i + 1].value == '(') {
                if (tokens[i + 2].value == ')') {
                    tokens.splice(i + 2, 0, token(tokens[i].value, tokens[i].value));
                    tokens[i].value = `call`;
                    tokens[i].type = "Identifier";
                } else {
                    tokens.splice(i + 1, 0, token("Operator", '('));
                    tokens.splice(i + 2, 0, token(tokens[i].value, tokens[i].value));
                    tokens.splice(i + 3, 0, token("Operator", ','));
                    tokens[i].value = `call`;
                    tokens[i].type = "Identifier";
                    tokens.splice(i + 4, 1);
                }
            }
        }
        if (tokens[i].type == "Identifier" && tokens[i + 1].value == '(' && tokens[i - 1].value != "(() => {return (" && !terminatingTokens.includes(tokens[i - 1].value) && !preventParameterizing[tokens[i].value]) {
            tokens.splice(i + 2, 0, token("ParameterObject", "new Parameter"));
            tokens.splice(i + 3, 0, token("Operator", "(() => {return ("));
            let brack = 1;
            let j;
            for (j = i + 4; tokens[j]; j++) {
                if (tokens[j].value == '(')
                    brack++;
                if (tokens[j].value == ')')
                    brack--;
                if (!brack) {
                    tokens.splice(j, 0, token("Operator", ');})'))
                    break;
                }
                if (brack == 1 && tokens[j].value == ',') {
                    tokens.splice(j++, 0, token("Operator", ');})'));
                    tokens.splice(++j, 0, token("ParameterObject", "new Parameter"));
                    tokens.splice(++j, 0, token("Operator", "(() => {return ("));
                }
            }
            tokens.splice(++j + 1, 0, token("Operator", ');})'));
            tree.push("new Parameter(() => {return (")
        }

        if ((tokens[i].value == ',' || tokens[i].type == "Separator" || i == tokens.length - 1/* || precedenceOperatorList.includes(tokens[i].value)*/) && endParenthesis) {
            while (endParenthesis--)
                tree.push(')');
            if (endParenthesis < 0)
                endParenthesis = 0;
        }
        if (types[tokens[i].value] && tokens[i + 1].value != '(' && tokens[i].type == "Identifier") {

            let impure = false;
            if (tokens[i - 1].value == `impure`) {
                impure = true;
                tree.pop();
                tokens.splice(i - 1, 1);
                i--;
            }

            let o = 0;

            tokens.splice(i + 3 + o, 0, token("Identifier", "pointer"));
            tokens.splice(i + 4 + o, 0, token("Operator", '('));
            tokens.splice(i + 5 + o, 0, token("Identifier", `"${tokens[i + 1].value}"`));
            tokens.splice(i + 6 + o, 0, token("Operator", ','));
            tokens.splice(i + 7 + o, 0, token("Identifier", `"${tokens[i].value}"`));
            tokens.splice(i + 8 + o, 0, token("Operator", ','));
            tokens.splice(i + 9 + o, 0, token("Identifier", `"${tokens[i].misc ?? 'n'}"`));
            tokens.splice(i + 10 + o, 0, token("Operator", ','));

            if (tokens[i].value == "fn" && tokens[i + 12 + o].value == ", getDeclarationList()[currentFunctionPlusPlus()](")
                tokens.splice(i + 12 + ++o, 0, token("Object", `(() => {selfFunction.name = "${tokens[i + 1].value}"; selfFunction.pure = ${!impure}; `))

            let j;
            for (j = i + 10 + o; tokens[j].type != "Separator"; j++);
            tokens.splice(j++, 0, token("Operator", ","))
            tokens.splice(j++, 0, token("Identifier", "false"))
            tokens.splice(j++, 0, token("Operator", ','));
            tokens.splice(j++, 0, token("Boolean", !impure));
            tokens.splice(j++, 0, token("Operator", ')'));

            tokens.splice(i, 3);
        } else if (types[tokens[i].value] && tokens[i].type == "Identifier" && tokens[i - 2].value != 'new Array_t' && tokens[i + 1].value != '(') {
            const ftype = tokens[i].value;
            tokens[i].value = `function_s`;
            tokens.splice(i + 1, 0, new token("Operator", '('));
            tokens[i + 2].value = `"${tokens[i + 2].value}"`;
            tokens.splice(i + 3, 1, new token("Operator", ','));
            tokens.splice(i + 4, 0, new token("Identifier", `"${ftype}"`));
            tokens.splice(i + 5, 0, new token("Operator", ','));
            tokens.splice(i + 6, 0, new token("Operator", '["'));
            let j;
            if (i + 7 > tokens.length)
                return;
            for (j = i + 7; tokens[j].value != '{'; j++) {
                tokens[j].type = "Parameter";
                if (tokens[j].value == ',')
                    tokens[j].value = `", "`;
                if (!tokens[j + 1]) {
                    log_compiler_error("unknown", true);
                }
            }
            let useQuotes = '"';

            if (j - i == 8) {
                tokens[i + 6].value = '[ ';
                useQuotes = ' ';
            }

            tokens.splice(j - 1, 2, new token("Operator", useQuotes + ']'));
            tokens.splice(j, 0, new token("Operator", ')'));
            tokens.splice(j + 1, 0, new token("Separator", ';'));

            curlyStack.push("function");
        }

        if (["if", "while"].includes(tokens[i].value)) {
            currly = tokens[i].value;
            tree.push(tokens[i].value + "_s");
            if (tokens[i].value == "while")
                whilecurr = 1;
        } else if (tokens[i].value == "else") {
            tree.push("else_s();");
            continue;
        } else if (tokens[i].value == '{') {
            if (whilecurr) {
                whilecurr = "";
                let brack = 1;
                for (let j = tree.length - 2; brack; j--) {
                    if (tree[j] == '(')
                        brack--;
                    else if (tree[j] == ')')
                        brack++;
                    if (brack)
                        whilecurr = tree[j] + ' ' + whilecurr;
                }
            }
            tree.push(';');
            curlyStack.push(currly);
            if (currly == "while")
                whileStack.push(whilecurr);
        } else if (tokens[i].value == '}') {
            whilecurr = false;
            if (curlyStack[curlyStack.length - 1] == "while")
                tree.push(`${whileStack.pop()}\nendwhile_s();`);
            if (curlyStack[curlyStack.length - 1] == "if" && tokens[i + 1] && tokens[i + 1].value != "else")
                tree.push("end" + curlyStack.pop() + "_s();");
        } else {
            if (tokens[i].type == "Identifier"
                && (tokens[i].value[0] != '"' && tokens[i].value[0] != '\'' && tokens[i].value[0] != '`')
                && !disallowedWords.includes(tokens[i].value)
                && !types[tokens[i].value]
            )

                tree.push(`"${tokens[i].value}"`);
            else if (types[tokens[i].value]) {
                tree.push("coerce_to_" + tokens[i].value)
            } else
                tree.push(tokens[i].value);
        }
    }
    return tree;
}

module.exports = { compile, terminatingTokens };