
const { operatorList, token, types, Tokenize } = require("./tokenizationHandler");


function pointerNotation(tokens) {
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].value == '[' && tokens[i].type == "Operator") {
            // Accessing an array value
            if (tokens[i - 1].type == "Identifier" && !types[tokens[i - 1].value]) {
                let brack = 1;
                for (let j = i + 1; tokens[j]; j++) {
                    if (tokens[j].value == ']' && tokens[j].type == "Operator")
                        brack--;
                    if (tokens[j].value == '[' && tokens[j].type == "Operator")
                        brack++;
                    if (!brack) {
                        tokens.splice(j, 1, token("Operator", ')'))
                        tokens.splice(i, 1, token("Operator", ","));
                        j = i;
                        if (tokens[i - 1].value == ')') {
                            for (j = i - 2; j > 0; j--) {
                                if (tokens[j].value == ')' && tokens[j].type == "Operator")
                                    brack--;
                                if (tokens[j].value == '(' && tokens[j].type == "Operator")
                                    brack++;
                                if (!brack)
                                    break;
                            }
                        }
                        tokens.splice(j - 1, 0, token("Identifier", "accessArrayValue"));
                        tokens.splice(j, 0, token("Operator", "("));
                        break;
                    }
                }
            }
            // Creating an array
            else if (tokens[i - 1].type == "Identifier" && types[tokens[i - 1].value]) {
                tokens[i].value = "new Array_t";
                tokens[i].type = "Obj";
                tokens.splice(i + 1, 0, token("Operator", '('));
                let brack = 1;
                for (let j = i + 2; tokens[j]; j++) {
                    if (tokens[j].value == ']' && tokens[j].type == "Operator")
                        brack--;
                    if (tokens[j].value == '[' && tokens[j].type == "Operator")
                        brack++;
                    if (!brack) {
                        tokens[j].value = ')'
                        tokens.splice(j + 1, 0, token("Method", ".getReferenceValue()"))
                        break;
                    }
                }
                tokens[i - 1].type = "array_type"
                tokens[i - 1].value = `"${tokens[i - 1].value}", `
                tokens.splice(i + 2, 0, tokens[i - 1])
                tokens.splice(i - 1, 1)
            }
        }
    }
    return tokens;
}

module.exports = { pointerNotation };