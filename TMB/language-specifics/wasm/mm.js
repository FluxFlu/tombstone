const { write, log_error } = require(`../../tombstone`);
const { Parameter } = require(`./parameter`);
const { add, mult, createDefaultOperator, softEquals, not, subtract, bit_and } = require(`./stdMath`);
const { evaluated, getSize, exists, getPtrType, getType } = require(`./variableUtils`);
const { pushNums } = require(`./stackUtils`);
const { options } = require(`../../../mtc`);
const { if_s, endif_s, else_s, new_loop } = require("./std");

const ptr = options.pointerSize;

const pages = options.maxHeapSize * 2000; // The number of pages available to use

const meta_memory = Math.ceil(pages / 257); // We store one page per bit of meta memory, which means we store 256 pages per page of meta memory, which means 1/257 of our pages need to be meta memory. 

const soft_add = (n, i) => {
    const pushed = pushNums("11", "i32", n, i);
    n = pushed.unzipped[0]
    i = pushed.unzipped[1]

    if (!n || !exists(i))
        return log_error(`improper_num_of_args`, true, '+', 2);

    const type = pushed.type;
    write(`${type}.add`);
    return n;
}

function getArrayLength(array) {
    array = pushNums("1", "i32", array);
    return new Parameter(() => new evaluated("i32"));
}

function getReferencePtr(array) {
    array = add(array, 4);
    return new Parameter(() => new evaluated("i32"));
}

function accessArrayValue(array, index) {
    const type = getPtrType(Parameter.vm(array)) || getType(Parameter.vm(array));
    soft_add(add(array, 8), mult(index, getSize(type) == 64 ? 8 : 4))
    return new Parameter(() => new evaluated(`Accessed Value`, type))
}

class Bitmap {
    static first = false;
    static get_page(number) {
        // Number should be in bits, but like representing pages.

        // Push the number
        pushNums("1", 'i' + ptr, number);

        // Divide it by 8 to convert from bits to bytes. This will be the pointer to the value itself in meta memory.
        write(`i${ptr}.const 8`);
        write(`i${ptr}.div_u`);

        // Load the number.
        write(`i${ptr}.load`);


        // Do calculations to get whether that bit within that byte of meta memory is 1 or 0. The actual formula looks something like `return (1 << (ptr % 4)) & (*(ptr / 8))`
        write(`i${ptr}.const 1`);
        pushNums("1", 'i' + ptr, number);
        write(`i${ptr}.const 4`);
        write(`i${ptr}.rem_u`);
        write(`i${ptr}.shl`);

        write(`i${ptr}.and`);

        return new evaluated(`i${ptr}`);
    }
    static set_page(number) {
        // Number should be in bits, but like representing pages.

        // Push the number. This version of the number will be the lefthand side of the set operation. (the "N" in "N = ...")
        pushNums("1", 'i' + ptr, number);


        // Divide it by 8 to convert from bits to bytes. This will be the pointer to the value itself in meta memory.
        write(`i${ptr}.const 8`);
        write(`i${ptr}.div_u`);


        // Repeat the last operations, but this time we load the number. This is some value on the righthand side of the set operation. (the N in " = ...N...")
        pushNums("1", 'i' + ptr, number);
        write(`i${ptr}.const 8`);
        write(`i${ptr}.div_u`);
        write(`i${ptr}.load`);


        // Do calculations to create a version of the original value but with this specific bit set to 1. The actual formula looks something like `*(ptr / 8) = (1 << (ptr % 4)) | (*(ptr / 8))`.
        write(`i${ptr}.const 1`);
        pushNums("1", 'i' + ptr, number);
        write(`i${ptr}.const 4`);
        write(`i${ptr}.rem_u`);
        write(`i${ptr}.shl`);

        write(`i${ptr}.or`);

        write(`i${ptr}.store`);
        return new evaluated(`i${ptr}`);
    }
    static clear_page(number) {
        // Number should be in bits, but like representing pages.

        // Push the number. This version of the number will be the lefthand side of the set operation. (the "N" in "N = ...")
        pushNums("1", 'i' + ptr, number);


        // Divide it by 8 to convert from bits to bytes. This will be the pointer to the value itself in meta memory.
        write(`i${ptr}.const 8`);
        write(`i${ptr}.div_u`);


        // Repeat the last operations, but this time we load the number. This is some value on the righthand side of the set operation. (the N in " = ...N...")
        pushNums("1", 'i' + ptr, number);
        write(`i${ptr}.const 8`);
        write(`i${ptr}.div_u`);
        write(`i${ptr}.load`);

        // Do calculations to create a version of the original value but with this specific bit set to 0. The actual formula looks something like `*(ptr / 8) = ((1 << (ptr % 4)) ^ -1) & (*(ptr / 8))`.
        write(`i${ptr}.const 1`);
        pushNums("1", 'i' + ptr, number);
        write(`i${ptr}.const 4`);
        write(`i${ptr}.rem_u`);
        write(`i${ptr}.shl`);

        write(`i${ptr}.const -1`);
        write(`i${ptr}.xor`);

        write(`i${ptr}.and`);

        write(`i${ptr}.store`);
        return new evaluated(`i${ptr}`);
    }
    static ptr_to_page() {
        // For example, let's say this is ptr 8064 (third page) and we have a meta_memory of 8000

        // Subtract the meta memory. (8064 - 8000 = 64)
        write(`i${ptr}.const ` + meta_memory);
        write(`i${ptr}.sub`);

        // Convert from a pointer to bits representing the page (64 / 32 = 2 pages. This makes sense, as a page is 32 bytes, so the 64th byte would be within the third page, or page 2)
        write(`i${ptr}.const 32`);
        write(`i${ptr}.div_u`);

        // Add the values used to protect the base, static, and count during calculations (2 + 96 = 98)
        write(`i${ptr}.const 96`);
        write(`i${ptr}.add`);
    }
    static page_to_ptr() {
        // For example, let's say this is page 2, which would mean we're being passed 98

        // Take off the values used to protect the base, static, and count during calculations (98 - 96 = 2)
        write(`i${ptr}.const 96`);
        write(`i${ptr}.sub`);

        // Convert from bits representing pages to a pointer to the actual page (2 * 32 = 64 bytes. This makes sense, as a page is 8 words, or 32 bytes, so page 2 would be at 64 bytes.)
        write(`i${ptr}.const 32`);
        write(`i${ptr}.mul`);

        // Add the meta memory, to protect from overwriting our hard earned bitmap area.
        write(`i${ptr}.const ` + meta_memory);
        write(`i${ptr}.add`);

        // Add one for good luck.
        // write(`i${ptr}.const 1`);
        // write(`i${ptr}.add`);
        return new evaluated("Reference Value", "i32");
    }
    static get_first_free(n) {
        n ||= 1;
        // n = Number of bytes (8) to allocate

        const loop_name = new_loop();
        this.setBase(() => write(`i${ptr}.const 96`)); // Start at bit 96 (Because the base, static, and count are all i32s, so 0-31, 32-63, and 64-95) as so to not overwrite the base, static, and count
        write("(loop $" + loop_name);
        //{


        this.setStatic(this.loadBase); // Start at where the base is (in bits)

        const inner_loop_name = new_loop();

        //{{ begin inner loop
        write("(loop $" + inner_loop_name);

        // if ( !get_page(static) & !(static - base > n) ) {
        /*
         * If the current page is empty,
         * And we haven't allocated enough pages to just return them,
         * 
         * Then keep going.
         * 
         * Otherwise, end the loop.
         */
        if_s(bit_and(not(this.get_page(new Parameter(() => this.loadStatic()))), not(createDefaultOperator("gt_u", "Malloc")(subtract(this.loadStatic(), this.loadBase()), n)))); // 

        // static++;
        this.addStatic(() => write(`i${ptr}.const 1`)); // Add 1 bit (representing 1 page) to the static. 

        // goto inner loop;
        write(`br $` + inner_loop_name);

        // } end if
        endif_s();

        // }} end inner loop
        write(`)`);

        // if (static - base > n) {
        /*
         * If we have allocated enough pages to just return them,
         * 
         * Then set the end of the contiguous block to be the smallest satisfactory value (base + n)
         * And end the loop
         * 
         * Otherwise, set the value we start looping from next time to be the value we just stopped looping from
         * And then keep looping.
         */
        if_s(createDefaultOperator("gt_u", "Malloc")(new Parameter(() => subtract(this.loadStatic(), this.loadBase())), new Parameter(() => n))) // If we found a contiguous loop that's big enough, then end the loop

        // static = base + n
        this.setStatic(() => add(this.loadBase(), n)); // Set the static to be the base plus n. This represents the end of the contiguous loop. This works without conversion because both are represented in bits (1).

        // } else {
        else_s();

        // base = static
        this.setBase(this.loadStatic);

        // base++
        this.addBase(() => write(`i${ptr}.const 1`))

        // goto loop;
        write(`br $` + loop_name);

        // } end if
        endif_s();

        // } end loop
        write(")");
    }
    static malloc(number) {
        // number = Number of pages (256) to allocate.

        this.get_first_free(number); // Load the location of the first free big enough contiguous loop into the base, and the final location present in that loop into the static.

        const loop_name = new_loop();

        write(`(loop $` + loop_name);
        //{

        if_s(not(softEquals(this.loadBase(), this.loadStatic()))); // Check if the base is not equal to the static.

        this.set_page(new Parameter(() => this.loadBase())); // set_page marks that the page is now being used. It accepts a byte (8) parameter. We do this for each page in the contiguous loop to mark each page (256) as used.

        this.addBase(() => write(`i${ptr}.const 1`)); // Add one byte (8) to the base, to show it moving towards the static.
        write(`br $` + loop_name);
        endif_s();
        //}
        write(`)`)

        return new evaluated(`i${ptr}`);
    }
    static free(array) {

        // base = ptr_to_page(array + array.length);
        // write(`i32.const 3963`)
        // write(`call $log`)

        this.setBase(() => this.ptr_to_page(add(pushNums("1", null, array).unzipped[0], getArrayLength(array)))); // Get the end position of the array and store it in the base.

        // static = ptr_to_page(array);
        this.setStatic(() => this.ptr_to_page(pushNums("1", null, array).unzipped[0])); // Get the position of the array and store it in the static

        // We make sure to convert the base and static from a pointer to a page number.

        const loop_name = new_loop();

        // $ loop
        write(`(loop $` + loop_name); // Loop.

        // if (base != static) {
        softEquals(this.loadBase(), this.loadStatic())
        if_s(not(new evaluated("i32")));

        // At this point we continue the loop.

        // clear_page(static)
        this.clear_page(new Parameter(() => this.loadStatic())); // Clear the page that's at static.

        // static++;
        this.addStatic(() => write(`i32.const 1`)); // Increment by 1

        // goto loop;
        write(`br $` + loop_name);

        // }
        endif_s();

        write(`)`) // End loop
    }
    static addPointerCount(array) {
        getReferencePtr(array);
        getReferencePtr(array);
        write(`i32.load`);
        write(`i32.const 1`);
        write(`i32.add`);
        write(`i32.store`);
    }
    static removePointerCount(array) {
        getReferencePtr(array);
        getReferencePtr(array);
        write(`i32.load`);
        write(`i32.const 1`);
        write(`i32.sub`);
        write(`i32.store`);
    }
    static getPointerCount(array) {
        getReferencePtr(array);
        write(`i32.load`);
        return new evaluated("i32");
    }
    static loadBase() {
        write(`i${ptr}.const 0`);
        write(`i${ptr}.load`);

        return new evaluated(`i${ptr}`);
    }
    static loadStatic() {
        write(`i${ptr}.const 4`);
        write(`i${ptr}.load`);

        return new evaluated(`i${ptr}`);
    }
    static loadCount() {
        write(`i${ptr}.const 8`);
        write(`i${ptr}.load`);

        return new evaluated(`i${ptr}`);
    }
    static addBase(fn) {
        write(`i${ptr}.const 0`);
        this.loadBase();
        fn();
        write(`i${ptr}.add`);
        write(`i${ptr}.store`);
        return new evaluated(`i${ptr}`);
    }
    static addStatic(fn) {
        write(`i${ptr}.const 4`);
        this.loadStatic();
        fn();
        write(`i${ptr}.add`);
        write(`i${ptr}.store`);
        return new evaluated(`i${ptr}`);
    }
    static addCount(fn) {
        write(`i${ptr}.const 8`);
        this.loadCount();
        fn();
        write(`i${ptr}.add`);
        write(`i${ptr}.store`);
        return new evaluated(`i${ptr}`);
    }
    static setBase(fn) {
        write(`i${ptr}.const 0`);
        fn();
        write(`i${ptr}.store`);
        return new evaluated(`i${ptr}`);
    }
    static setStatic(fn) {
        write(`i${ptr}.const 4`);
        fn();
        write(`i${ptr}.store`);
        return new evaluated(`i${ptr}`);
    }
    static setCount(fn) {
        write(`i${ptr}.const 8`);
        fn();
        write(`i${ptr}.store`);
        return new evaluated(`i${ptr}`);
    }

    static garbageCollect() {

        /**
         * for (let base = 64; base < meta_memory; base++) {
         *      if (*get_page(base) && !*(get_page(base) + 4)) {
         *          free(get_page(base))
         *      }
         * }
         */

        // Initialize base at 64
        this.setCount(() => write(`i32.const 64`))

        // Start the loop
        const loop_name = new_loop();
        write(`(loop $` + loop_name)
        this.page_to_ptr(this.loadCount())
        write(`i${ptr}.const 4`)
        write(`i${ptr}.add`)
        write(`i${ptr}.load`)
        write(`i${ptr}.eqz`)

        this.page_to_ptr(this.loadCount())
        write(`i${ptr}.load`)
        write(`i${ptr}.eqz`)
        write(`i${ptr}.eqz`)

        write(`i${ptr}.and`)

        write(`(if(then`)
        this.free(new Parameter(() => this.page_to_ptr(this.loadCount())))
        write(`))`)

        // if (base != meta_memory) {

        // Increment base, free the current page, and then continue looping.
        // base++;
        this.addCount(() => write(`i${ptr}.const 1`));
        this.loadCount(); // base
        write(`i${ptr}.const ` + meta_memory) // meta_memory
        write(`i${ptr}.le_u`) // <
        write(`(if(then`) // if (...) {

        // goto loop;
        write(`br $` + loop_name)
        write(`))`)

        write(`)`) // End loop
    }
}

class Array_t {
    constructor(type, ...values) {
        this.type = type;
        this.values = values;
        this.set();
    }
    create() {
        Bitmap.malloc(Math.ceil((this.values.length * getSize(this.type) + 64) / 256))
        Bitmap.setStatic(() => Bitmap.page_to_ptr(Bitmap.loadBase()))

        Bitmap.page_to_ptr(Bitmap.loadBase())
        write(`i${ptr}.const ` + this.values.length * getSize(this.type) / 8);
        write(`i${ptr}.store`)
    }
    set() {
        this.create();
        this.values.forEach((e, i) => {
            write(`i${ptr}.const ` + (i * (getSize(this.type) == 64 ? 8 : 4) + 8));
            Bitmap.loadStatic();
            write(`i${ptr}.add`);
            const type = pushNums(`1`, this.type, e).type;
            write(`${type}.store`);
            if (this.type != type)
                log_error("incorrect_array_type", true, this.type, type);
        });
    }
    getReferenceValue() {
        return new Parameter(() => Bitmap.page_to_ptr(Bitmap.loadBase()));
    }
}

class String_t {
    constructor(value) {
        this.value = value;
        this.set();
    }
    create() {
        Bitmap.malloc(Math.ceil((this.value.length * 8 + 64) / 256))
        Bitmap.setStatic(() => Bitmap.page_to_ptr(Bitmap.loadBase()))

        Bitmap.page_to_ptr(Bitmap.loadBase())
        write(`i${ptr}.const ` + this.value.length);
        write(`i${ptr}.store`)
    }
    chars_to_i32(i) {
        if (typeof this.value == "string") {
            if (this.value.charCodeAt(i + 0) > 255 || this.value.charCodeAt(i + 1) > 255 || this.value.charCodeAt(i + 2) > 255 || this.value.charCodeAt(i + 3) > 255)
                log_error("unicode_not_supported", true, this.value);
            return write(`i32.const ` + (
                (this.value.charCodeAt(i + 0)      ) |
                (this.value.charCodeAt(i + 1) << 8 ) |
                (this.value.charCodeAt(i + 2) << 16) |
                (this.value.charCodeAt(i + 3) << 24)
            ));
        }
        return pushNums(`1`, "i32", e);
    }
    set() {
        this.create();
        const len = Math.ceil(this.value.length / 4) * 4;
        for (let i = 0; i < len; i += 4) {
            write(`i${ptr}.const ` + (i + 8));
            Bitmap.loadStatic();
            write(`i${ptr}.add`);
            this.chars_to_i32(i)
            write(`i32.store`);
        }
    }
    getReferenceValue() {
        return new Parameter(() => Bitmap.page_to_ptr(Bitmap.loadBase()));
    }
}

module.exports = { Bitmap, accessArrayValue, Array_t, String_t };