const { token, types } = require("./tokenizationHandler");



let forUplink;
let forString;
let forOptions;
let forLookout;
let forLookoutCount = 0;

function precompile(tokens) {
    forUplink = 0;
    forString = [];
    forOptions = [];
    
    for (let i = 0; i < tokens.length; i++) {



        if (tokens[i].type == "Operator" && tokens[i].value == "=>" && tokens[i + 1].value != '{') {
            tokens.splice(i + 1, 0, token("Operator", '{'));
            tokens.splice(i + 2, 0, token("Identifier", "return"));

            for (let j = i; j < tokens.length; j++)
                if (terminatingTokens.includes(tokens[j].value)) {
                    tokens.splice(j, 0, token("Operator", '}'));
                    tokens.splice(j, 0, token("Separator", ';'));
                    break;
                }

        }
        if (tokens[i].type == "Operator" && tokens[i].value == "=>") {
            let brack = 1;
            for (let j = i + 2; j < tokens.length; j++) {
                if (tokens[j].value == '{')
                    brack++;
                if (tokens[j].value == '}')
                    brack--;
                if (!brack) {
                    if (!tokens[j + 1] || tokens[j + 1].type == "Line Break")
                        tokens.splice(j + 1, 0, token("Separator", ";"));
                    break;
                }
            }
        }

        if (tokens[i].type == "String") {
            tokens[i].value = `new Parameter(() => {return new String_t(${tokens[i].value}).getReferenceValue()})`
        }

        if (tokens[i].value == "for") {
            forUplink = 0;
            forString = [];
            forOptions = [];
            forUplink++;
            let j = 0;
            for (j = i + 2; forUplink; j++) {
                if (tokens[j].value == '(')
                    forUplink++;
                if (tokens[j].value == ')') {
                    forUplink--;
                }
                if (!forUplink) {
                    forOptions.push(forString);
                    forString = [];
                }
                if (tokens[j].value == ';') {
                    forOptions.push(forString);
                    forString = [];
                    continue;
                }
                forString.push(tokens[j]);
            }
            tokens.splice(i, j - i);
            for (j = 0; j < forOptions[0].length; j++) {
                tokens.splice(i + j, 0, forOptions[0][j]);
            }
            tokens.splice(i + j, 0, token("Separator", ";"));
            tokens.splice(i + j + 1, 0, token("Identifier", "while"));
            tokens.splice(i + j + 2, 0, token("Operator", "("));
            let n = 0;
            for (; n < forOptions[1].length; n++) {
                tokens.splice(i + j + n + 3, 0, forOptions[1][n]);
            }

            tokens.splice(i + j + n + 3, 0, token("Operator", ')'));
            if (tokens[i + j + n + 4].value != '{')
                tokens.splice(i + j + n + 4, 0, token("Operator", "{"));
            forLookout = forOptions[2];
            forLookoutCount = 0;
            for (j = i; j < tokens.length; j++) {
                if (tokens[j].value == '{')
                    forLookoutCount++;
                if (tokens[j].value == '}') {
                    forLookoutCount--;
                    if (forLookoutCount == 0) {
                        let l = 0;
                        for (l = 0; l < forLookout.length; l++)
                            tokens.splice(j + l, 0, forLookout[l]);
                        tokens.splice(j + l, 0, token("Separator", ';'));
                    }
                }
            }
        }
    }
    return tokens;
}

module.exports = { precompile }