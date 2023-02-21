const safeParameterUnzip = (n) => {
    while (n && n.value && typeof n.value == "function")
        n = n.value();
    return n;
}

module.exports = { safeParameterUnzip }