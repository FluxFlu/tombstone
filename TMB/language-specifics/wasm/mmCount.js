const { write } = require("../../tombstone");
const { Parameter } = require("./parameter");
const { get_variables } = require("./variableUtils");
const { pushNums } = require("./stackUtils");
const { new_loop } = require("./std");
const { Bitmap, getReferencePtr, ptr } = require("./mm");


function loadCurr(current_spot) {
    write(`i${ptr}.const 8`);
    write(`i${ptr}.load`)
    // The position of the array is loaded
    if (current_spot) {
        write(`i${ptr}.const ` + current_spot * 4)
        write(`i${ptr}.add`)
    }
    write(`i${ptr}.load`)
    // The current value in the array is loaded
}

function setCurr(current_spot, fn) {
    write(`i${ptr}.const 8`);
    write(`i${ptr}.load`)
    // The position of the array is loaded
    if (current_spot) {
        write(`i${ptr}.const ` + current_spot * 4)
        write(`i${ptr}.add`)
    }
    fn();
    write(`i${ptr}.store`)
    // The current value in the array is stored
}

function addCurr(current_spot, fn) {
    write(`i${ptr}.const 8`);
    write(`i${ptr}.load`)
    // The position of the array is loaded
    if (current_spot) {
        write(`i${ptr}.const ` + current_spot * 4)
        write(`i${ptr}.add`)
    }
    loadCurr(current_spot);
    fn();
    write(`i${ptr}.add`)
    write(`i${ptr}.store`)
    // The current value in the array is stored
}

function changePointerCount(array, by, current_spot) {

    if (get_variables()[Parameter.vm(array)]) {
        const v = Parameter.vm(array);
        array = new Parameter(() => pushNums("1", null, v));
    }
    if (array.value && array.value.toString().includes(".getReferenceValue()"))
        array.value = () => Bitmap.page_to_ptr(Bitmap.loadBase());

    if (current_spot) {

        Bitmap.setStatic(() => {loadCurr(current_spot); write(`i32.const 8`); write(`i32.sub`); write(`i${ptr}.load`); loadCurr(current_spot); write(`i32.add`)});

        const loop = new_loop();
        write(`(loop $` + loop);

        
        loadCurr(current_spot);
        
        write(`i32.load`);
        
        write(`i32.const 4`);
        write(`i32.add`);
        
        loadCurr(current_spot);
        
        write(`i32.load`);

        write(`i32.const 4`);
        write(`i32.add`);
        write(`i32.load`);
        write(`i32.const 1`);
        write(`i32.` + by);
        
        write(`i32.store`);

        addCurr(current_spot, () => write(`i32.const 4`));

        loadCurr(current_spot);
        Bitmap.loadStatic();
        write(`i${ptr}.lt_u`)
        write(`(if(then`)
        write(`br $` + loop)
        write(`))`)

        write(`)`)

        
    } else {
        getReferencePtr(array);
        getReferencePtr(array);

        write(`i32.load`);
        write(`i32.const 1`);
        write(`i32.` + by);
        write(`i32.store`);
    }
    if (Parameter.vm(array).size) {
        if (!current_spot) {
            Bitmap.setCount(() => (Bitmap.loadBase()));
            Bitmap.malloc(Math.ceil(this.pointerSize * ptr / 256));
            Bitmap.setStatic(() => Bitmap.loadCount());
            Bitmap.setCount(() => Bitmap.page_to_ptr(Bitmap.loadBase()));
            Bitmap.setBase(() => Bitmap.loadStatic());
            current_spot = 0;
        }
        setCurr(current_spot + 1, () => { write(`i32.const 8`); pushNums("1", "i32", array); write(`i32.add`); for (let i = 0; i < current_spot; i++)  {write(`i32.load`); write(`i32.const 8`);  write(`i32.add`); }});
        if (!current_spot || current_spot < Parameter.vm(array).size)
            changePointerCount(array, by, current_spot + 1);
        if (!current_spot)
            Bitmap.free(new Parameter(() => Bitmap.loadCount()), this.pointerSize * ptr / 8);
    }
}

module.exports = { changePointerCount }