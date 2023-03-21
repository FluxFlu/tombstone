
const { operatorList, token, types, Tokenize } = require("./tokenizationHandler");

const terminatingTokens = { ',': true, ';': true };

function pointerNotation(tokens) {
    for (let i = 0; i < tokens.length; i++) {
        // Handle datatype pointer notation (eg. `i32**`)
        if (types[tokens[i].value] && tokens[i + 1] && tokens[i + 1].value) {

            if (!tokens[i].misc)
                tokens[i].misc = 0;

            while (tokens[i + 1].value == '**') {
                tokens[i].misc += 2;
                tokens.splice(i + 1, 1);
            }

            if (tokens[i + 1].value == '*') {
                tokens[i].misc++;
                tokens.splice(i + 1, 1);
            }

        }

        if (tokens[i].value == '[' && tokens[i].type == "Operator") {
            // Creating an array
            if (tokens[i - 1].type == "Identifier" && types[tokens[i - 1].value]) {
                tokens[i].value = "new Array_t";
                tokens[i].type = "Obj";
                tokens.splice(i + 1, 0, token("Operator", '('));
                let brack = 1;
                for (let j = i + 2; tokens[j]; j++) {
                    if (tokens[j].value == ']' && tokens[j].type == "Operator")
                        brack--;
                    if (tokens[j].value == '[' && tokens[j].type == "Operator") {
                        tokens.splice(j++, 0, token("ArrayMarker", ""))
                        brack++;
                    }
                    if (!brack) {
                        tokens[j].value = ')'
                        tokens.splice(j + 1, 0, token("Method", ".getReferenceValue()"))
                        break;
                    }
                }
                tokens[i - 1].type = "array_type"
                tokens[i - 1].value = `"${tokens[i - 1].value}", `
                tokens.splice(i + 2, 0, tokens[i - 1])
                tokens.splice(i + 3, 0, token("Operator", ','));
                tokens.splice(i + 3, 0, token("Identifier", tokens[i - 1].misc ?? 0));
                tokens.splice(i + 5, 0, token("Operator", ','));
                tokens.splice(i + 5, 0, token("ArrLen", 0));
                tokens.splice(i - 1, 1)
            }
        }
    }
    for (let i = tokens.length - 1; i; i--) {
        // Accessing an array value
        if (tokens[i].value == '[' && tokens[i].type == "Operator" && !types[tokens[i - 1].value] && tokens[i - 1].type != "ArrayMarker") {
            let brack = 1;
            for (let j = i + 1; tokens[j]; j++) {
                if (tokens[j].value == ']' && tokens[j].type == "Operator")
                    brack--;
                if (tokens[j].value == '[' && tokens[j].type == "Operator")
                    brack++;
                if (!brack) {
                    tokens.splice(j, 1, token("Operator", ')'))
                    tokens.splice(i, 1, token("Operator", ","));
                    for (j = i - 1; j && !brack && !terminatingTokens[tokens[j].value]; j--) {
                        if (tokens[j].value == ')' && tokens[j].type == "Operator")
                            brack--;
                        if (tokens[j].value == '(' && tokens[j].type == "Operator")
                            brack++;
                    }
                    tokens.splice(j + 2, 0, token("Identifier", "accessArrayValue"));
                    tokens.splice(j + 3, 0, token("Operator", "("));
                    break;
                }
            }
        }
    }
    return tokens;
}

module.exports = { pointerNotation };