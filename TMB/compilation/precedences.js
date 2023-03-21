// const operatorList = [];

const { terminatingTokens } = require("./compiler");
const { operatorList, token, types, Tokenize } = require("./tokenizationHandler");

const precedenceTerminatingTokens = [',', ';', '\n'];

const precedenceOperatorList = operatorList;
precedenceOperatorList.shift();
precedenceOperatorList.shift();

const precedenceOperators = {
    2: [ "++", "--" ],
    3: [ "!", "~" ],
    4: [ "**" ],
    5: [ "*", "/", "%" ],
    6: [ "+", "-" ],
    7: [ "<<", ">>", ">>>" ],
    8: [ '<', '>', "<=", ">=" ],
    9: [ "==", "!=", "===", "!==" ],
    10:[ "&" ],
    11:[ "^" ],
    12:[ "|" ],
    13:[ "&&" ],
    14:[ "||" ],
    15:[ '=', "+=", "-=", "**=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>=", ">>>=", "&&=", "||=" ],
}

const unaryLeftOperators = {
    "--": "fminusminus",
    "++": "fplusplus",
}

const unaryRightOperators = {
    "!": "not",
    "~": "bit_not",
}

const binaryOperators = {
    "**": "exponent",
    "*": "mult",
    "/": "divide",
    "%": "modulo",
    "+": "add",
    "-": "subtract",

    "&": "bit_and",
    "^": "bit_xor",
    "|": "bit_or",
    "~": "bit_not",

    "<<": "left_shift",
    ">>": "right_shift",
    ">>>": "right_shift_unsigned",

    "&&": "and",
    "||": "or",

    "==": "softEquals",
    "!=": "notEquals",
    "===": "hardEquals",
    "!==": "hardNotEquals",

    "<": "flessThan",
    ">": "fgreaterThan",
    "<=": "flessThanOrEqualTo",
    ">=": "fgreaterThanOrEqualTo",

    "+=": "plusEquals",
    "-=": "minusEquals",
    "*=": "multEquals",
    "/=": "divEquals",
    "%=": "modEquals",
    "**=": "exponentEquals",

    "&&=": "andEquals",
    "||=": "orEquals",

    "<<=": "leftShiftEquals",
    ">>=": "rightShiftEquals",
    ">>>=": "rightShiftUnsignedEquals",

    "&=": "bitAndEquals",
    "^=": "bitXorEquals",
    "|=": "bitOrEquals"
}

let endParenthesis = 0;

function precedenceDoubleSucc(tokens, i, func, terminatingTokens) {


    tokens[i] = token("Operator", ',');
    let brack = 0;
    let l;

    for (l = i + 1; brack != 1 && !(brack == 0 && precedenceOperatorList.includes(tokens[l].value)) && !(brack == 0 && terminatingTokens.includes(tokens[l].value)); l++) {

        if (tokens[l].value == '(')
            brack--;
        if (tokens[l].value == ')')
            brack++;
    }

    tokens.splice(l, 0, token("Operator", ')'));


    brack = 0;
    for (l = i - 1; brack != -1 && !(brack == 0 && precedenceOperatorList.includes(tokens[l].value)) && !(brack == 0 && terminatingTokens.includes(tokens[l].value)); l--) {
        if (tokens[l].value == '(')
            brack--;
        if (tokens[l].value == ')')
            brack++;
        if (brack == -1) {
            l++;
        }
    }


    tokens.splice(l + 1, 0, token("Operator", '('));
    tokens.splice(l + 1, 0, token("Identifier", func));

}
function precedenceLeftSucc(tokens, i, func, terminatingTokens) {
    tokens[i] = token("Operator", ',');
    let brack = 0;
    let l;
    brack = 0;
    for (l = i - 1; brack != -1 && !(brack == 0 && precedenceOperatorList.includes(tokens[l].value)) && !(brack == 0 && terminatingTokens.includes(tokens[l].value)); l--) {
        if (tokens[l].value == '(')
            brack--;
        if (tokens[l].value == ')')
            brack++;
        if (brack == -1) {
            l++;
        }
    }


    tokens.splice(i, 1, token("Operator", ')'));
    tokens.splice(l + 1, 0, token("Operator", '('));
    tokens.splice(l + 1, 0, token("Identifier", func));
}
function precedenceRightSucc(tokens, i, func, terminatingTokens) {
    tokens[i] = token("Operator", ',');
    let brack = 0;
    let l;
    for (l = i + 1; brack != 1 && !(brack == 0 && precedenceOperatorList.includes(tokens[l].value)) && !(brack == 0 && terminatingTokens.includes(tokens[l].value)); l++) {
        if (tokens[l].value == '(')
            brack--;
        if (tokens[l].value == ')')
            brack++;
    }
    tokens.splice(l, 0, token("Operator", ')'));
    tokens.splice(i, 1, token("Operator", '('));
    tokens.splice(i, 0, token("Identifier", func));
}

module.exports = function precedence(tokens, number) {
    if (!precedenceOperators[number]) {
        return tokens;
    }
    endParenthesis = 0;
    for (let i = 0; i < tokens.length; i++) {

        if (tokens[i].type == "Identifier" && tokens[i].value == "return") {
            tokens.splice(i + 1, 0, new token("Operator", '('));
            let j;
            for (j = i; !terminatingTokens.includes(tokens[j].value); j++);
            tokens.splice(j, 0, new token("Operator", ')'));
            tokens[i].value = "return_s";
        }
        
        if ((tokens[i].value == ',' || tokens[i].type == "Separator" || i == tokens.length - 1 || precedenceOperatorList.includes(tokens[i].value)) && endParenthesis) {
            while (endParenthesis--)
                tokens.splice(i, 0, token("Operator", ')'));
            if (endParenthesis < 0)
                endParenthesis = 0;
        }
        
        if (precedenceOperators[number].includes(tokens[i].value) && (!tokens[i - 1] || !types[tokens[i - 1].value])) {
            if (tokens[i].value == '=' && !types[tokens[i - 2].value] ) {
                precedenceDoubleSucc(tokens, i++, "set", terminatingTokens);
            } else if (unaryLeftOperators[tokens[i].value]) {
                const j = unaryLeftOperators[tokens[i].value];
                precedenceLeftSucc(tokens, i++, j, precedenceTerminatingTokens);
            } else if (unaryRightOperators[tokens[i].value]) {
                const j = unaryRightOperators[tokens[i].value];
                precedenceRightSucc(tokens, i++, j, precedenceTerminatingTokens);
            } else if (binaryOperators[tokens[i].value]) {
                const j = binaryOperators[tokens[i].value];
                precedenceDoubleSucc(tokens, i++, j, precedenceTerminatingTokens);
            }
        }
    }
    return precedence(tokens, number + 1);
}