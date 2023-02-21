const { write, prevent_write } = require("../../tombstone");
const { getBiggestValue, getType } = require("./variableUtils");

class Parameter {
    constructor(value) {
        this.value = value;
    }
    vm() {
        prevent_write.is++;
        const value = Parameter.unzip(this)
        prevent_write.is--;
        return value;
    }
    static vm (n) {
        if (n && n.vm)
            return n.vm();
        return n;
    }
    static unzip(n) {
        while (n instanceof Parameter)
            n = n.value();
        return n;
    }
    static getBiggestValue(n, i) {
        if (!i) {
            if (n.vm)
                return getBiggestValue(n.vm())
            return getBiggestValue(n);
        }
        if (n instanceof this)
            n = n.vm();
        if (i instanceof this)
            i = i.vm();
        return getBiggestValue(n, i);
    }
}

module.exports = { Parameter }