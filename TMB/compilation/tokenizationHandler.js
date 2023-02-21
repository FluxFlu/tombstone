
function token(type, value, misc) {
    return {type: type, value: value, misc: misc};
}

const types = {"str": true, "fn": true, "i32": true, "i64": true, "f32": true, "f64": true};

const operatorList = ['(', ')', '#', "=>", '+', '-', '=', '*', "**", '/', '~', '^', '|', '&', "<<", ">>", ">>>", '%', "||", "&&", "++", "--", '!', '{', '}', '<', '>', "<=", ">=", "!==", "===", "==", "!=", "+=", "-=", "*=", "/=", "%=", "**=", "||=", "&&=", "^=", "&=", "|=", ">>=", ">>>=", "<<=", '[', ']'];

const endLines = [";", "{", "}", "\n"];

let operateFinal;
function finality(operator) {
    for (let i = 0; i < operatorList.length; i++) {
        for (let x = 0; x < operator.length; x++) {
            if (operator[x] != operatorList[i][x])
                break;
            if (x == operator.length - 1)
                return false;
        }
    }
    return true;
}

function Tokenize(string) {
    let literal = false;
    let tokens = [];
    let currentToken = "";
    let currentTokenType;
    let dotCheck;
    let lineBreaks = 1;
    let commented = false;
    for (let i = 0; i < string.length; i++) {
        if (string[i] == '\n') {
            tokens.push(token(currentTokenType, currentToken));
            if (string[i - 1] && !endLines.includes(string[i - 1]))
                tokens.push(token("Separator", ';'));
            currentToken = "";
            currentTokenType = "";
            tokens.push(token("Line Break", ++lineBreaks));
            tokens.push(token("Line Break", '\n'));
        }

        // Handles multiline comments. This can't be done in a regex because it needs to be handled properly with newline tracking.
        if (string[i] == "/" && string[i + 1] == "*") {
            commented = true;
        }
        if (string[i] == "*" && string[i + 1] == "/") {
            commented = false;
            i++;
            continue;
        }
        if (commented)
            continue;


        if (string[i] == '"' || string[i] == '\'' || string[i] == '`') {
            if (!literal) {
                tokens.push(token(currentTokenType, currentToken));
                currentToken = "";
                literal = string[i];
                if (string[i] == '\'') 
                    currentToken += '`';
                    currentToken += string[i];
            }
            else if (literal && literal == string[i]) {
                literal = false;
                currentToken += string[i];
                if (string[i] == '\'') 
                    currentToken += '`';
            }
            continue;
        } else if (literal) {
            currentTokenType = "String";
            currentToken += string[i];
        } else if (string[i].match(eval(`/[0-9${dotCheck ? '.' : ''}${currentToken == "Number" ? '' : '-'}]/`)) && (string[i] != '-' || string[i + 1].match(/[0-9]/)) && currentTokenType != "Identifier") {
            dotCheck = true;
            if (currentTokenType != 'Number' && currentToken) {
                tokens.push(token(currentTokenType, currentToken));
                currentToken = "";
            }
            currentTokenType = "Number";
            currentToken += string[i];
            if (string[i].includes('.'))
                dotCheck = false;
        } else if (string[i] == ';') {
            tokens.push(token(currentTokenType, currentToken));
            tokens.push(token("Separator", ';'));
            currentToken = "";
            currentTokenType = undefined;
        } else if (string[i].match(/[A-Za-z_]/) || (currentTokenType == "Identifier" && string[i].match(/[A-Za-z_0-9]/))) {
            if (currentTokenType != "Identifier" && currentToken) {
                tokens.push(token(currentTokenType, currentToken));
                currentToken = "";
            }
            currentTokenType = "Identifier";
            currentToken += string[i];
        } else if (string[i].match(/[\#\(\)\{\}\[\]\.\+\=\-\*\/\~\^\%\!\&\|\,\<\>]/)) {
            if ((currentTokenType != "Operator" && currentToken) || finality(currentToken + string[i])) {
                tokens.push(token(currentTokenType, currentToken));
                currentToken = "";
            }
            currentTokenType = "Operator";
            currentToken += string[i];
        }
         else if (string[i] == ' ' && currentTokenType != "String") {
            tokens.push(token(currentTokenType, currentToken));
            currentToken = "";
            currentTokenType = undefined;
        }
    }
    tokens.push(token(currentTokenType, currentToken));
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type == undefined || tokens[i].value == '') {
            tokens.splice(i, 1);
            i--;
        }
        if (!tokens[i])
            continue;
        if (tokens[i].type == "Number" && tokens[i].value?.match(/[\-]/g)?.join('')?.length > 1)
            tokens[i].type = "Operator";
    }
    tokens.forEach(e => {if (e.type == "Number") e.value = `"${e.value}"`});
    return tokens;
}


module.exports = { Tokenize, operatorList, token, types };