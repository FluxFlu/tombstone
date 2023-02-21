let bitmap = 3n;

function length() {
    return bitmap.toString(2).length;
}

function set_bit(n) {
    bitmap |= (1n << BigInt(n));
}
function clear_bit(n) {
    bitmap &= ~(1n << BigInt(n));
}
function get_bit(n) {
    return +((bitmap & (1n << BigInt(n))) > 0n);
}
function bitmap_print() {
    let total = "";
    for (let i = 0; i < length(); i++) total += '[' + get_bit(i) + ']';
    console.log(total);
}