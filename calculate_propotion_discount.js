/**
 * A utility help to calculate Proportion Discount
 * @template T
 * @param {T & {
 *  price_bill_discount: string;
 *  lists: Array<{
 *      seq_number?: string | null;
 *      price_grand_total: string;
 *      proportion_discount_ratio?: string;
 *      proportion_discount_price?: string;
 *  }>;
 * }} billAndLists 
 * @param {{
 *  toFixed?: 0|1|2;
 * }} options
 * @returns {T & {
 *  price_bill_discount: string;
 *  lists: Array<{
 *      seq_number?: string | null;
 *      price_grand_total: string;
 *      proportion_discount_ratio?: string;
 *      proportion_discount_price?: string;
 *  }>;
 * }}
 */
const proportionDiscountSerializer = (billAndLists, options = {}) => {
    if (options?.toFixed !== undefined && !Number.isFinite(options?.toFixed)) { throw new Error(`Parameter options.toFixed have error`); }
    if (Number.isFinite(options?.toFixed) && ![0,1,2].includes(options?.toFixed)) { throw new Error(`Parameter options.toFixed between 0-2`); }

    /**
     * Config toFixed
     * @type {number}
     */
    const config_toFixed = options?.toFixed !== undefined ? options.toFixed : 2;

    const billAndLists_data = {
        ...billAndLists
    };

    // Data Serializer
    billAndLists_data.price_bill_discount = Number(billAndLists_data?.price_bill_discount).toFixed(config_toFixed) || Number(0).toFixed(config_toFixed);
    billAndLists_data.lists = billAndLists_data?.lists?.map(w => ({
        ...w,
        seq_number: w?.seq_number || null,
        proportion_discount_ratio: Number(0).toFixed(config_toFixed),
        proportion_discount_price: Number(0).toFixed(config_toFixed)
    })) || [];

    // Data Validator
    if (!Number.isFinite(Number(billAndLists_data.price_bill_discount))) { throw new Error(`ส่วนลดท้ายบิล (price_bill_discount) ต้องเป็นตัวเลข`); }
    if ((Number(billAndLists_data.price_bill_discount)) < 0) { throw new Error(`ส่วนลดท้ายบิล (price_bill_discount) ต้องเป็นตัวเลข และมีค่ามากกว่าหรือเท่ากับ 0`); }
    if (billAndLists_data.lists.length === 0) { return billAndLists_data; }
    if (billAndLists_data.lists.filter(w => Number(w.price_grand_total) >= 0).length === 0) { throw new Error(`ราคารวมของรายการต้องมีรายการที่มากกว่าหรือเท่ากับ 0 อย่างน้อย 1 รายการ`); }

    /**
     * ราคารวมทั้งหมดจากแต่ละรายการ จะต้องมีค่ามากกว่าหรือเท่ากับ 0
     */
    const inline_price_grand_total = billAndLists_data.lists.reduce((prev, curr) => {
        if (Number(curr.price_grand_total) > 0) {
            prev += Number(curr.price_grand_total);
        }
        return prev;
    }, 0).toFixed(config_toFixed);
    if (Number(inline_price_grand_total) < 0) { throw new Error(`ราคารวมทั้งหมดแต่ละลายการจะต้องมากกว่าหรือเท่ากับ 0: ผลลัพธ์รวมทั้งหมดแต่ละรายการ (${inline_price_grand_total})`); }
    if (Number(inline_price_grand_total) === 0) { return billAndLists_data; }

    // คำนวณและใส่ข้อมูล Proportion Discount Ratio ใน bill_data.lists[].proportion_discount_ratio
    billAndLists_data.lists.forEach(element => {
        if (Number(element.price_grand_total) > 0) {
            element.proportion_discount_ratio = Number(element.price_grand_total / inline_price_grand_total).toFixed(config_toFixed);
        }
    });

    /**
     * ตรวจสอบ ProportionDiscountRatio เท่ากับ 1 แล้วหรือยัง ถ้ายังจะไม่ให้เติมส่วนต่างให้กับรายการที่มี ProportionDiscountRatio สูงที่สุด หรือราคารวมของแต่ละรายการสินค้าสูงที่สุด
     */
    const totalInlineProportionDiscountRatio = billAndLists_data.lists.reduce((prev, curr) => {
        return (Number(prev) + Number(curr.proportion_discount_ratio)).toFixed(config_toFixed)
    }, '0.00');
    if (Number(totalInlineProportionDiscountRatio) !== 1) {
        // if (Number(totalInlineProportionDiscountRatio) > 1) {
        //     throw new Error(`ค่า Proportion discount ratio รวมกันต้องไม่เกิน 1: ค่าปัจจุบัน (${totalInlineProportionDiscountRatio})`);
        // }
        if (Number(totalInlineProportionDiscountRatio) < 0) {
            throw new Error(`ค่า Proportion discount ratio รวมกันต้องไม่ต่ำกว่า 0: ค่าปัจจุบัน (${totalInlineProportionDiscountRatio})`);
        }

        const missingProportionDiscount = (1 - Number(totalInlineProportionDiscountRatio)).toFixed(config_toFixed + 1);
        const findIndexOfMaxProppotion = billAndLists_data.lists.reduce((prev, curr, idx, arr) => {
            if (idx === 0) { return prev; }
            if (Number(curr?.proportion_discount_ratio) > Number(arr[prev].proportion_discount_ratio)) { return idx; }
            if (Number(curr?.price_grand_total) > Number(arr[prev].price_grand_total)) { return idx; }
            return prev;
        }, 0);
        billAndLists_data.lists[findIndexOfMaxProppotion].proportion_discount_ratio = (Number(billAndLists_data.lists[findIndexOfMaxProppotion].proportion_discount_ratio) + (Number(missingProportionDiscount))).toFixed(config_toFixed);

        /**
         * ตรวจสอบ ProportionDiscountRatio อีกครั้งว่าเท่ากับ 1 แล้วหรือยัง ถ้ายังจะไม่ให้ทำงานต่อ
         */
        const totalInlineProportionDiscountRatio__Recheck = billAndLists_data.lists.reduce((prev, curr) => {
            return (Number(prev) + Number(curr.proportion_discount_ratio)).toFixed(config_toFixed)
        }, '0.00');
        if (Number(totalInlineProportionDiscountRatio__Recheck) !== 1) {
            throw new Error(`ค่า Proportion discount ratio ต้องมากกว่าหรือเท่ากับ 0 และไม่เกิน 1 จากการเติมความถี่ส่วนลดตามสัดส่วน ที่ขาดหายไป: รายการที่ (${findIndexOfMaxProppotion}), ความถี่ส่วนลดตามสัดส่วนที่เติมไปแล้ว (${billAndLists_data.lists[findIndexOfMaxProppotion].proportion_discount_ratio})`);
        }
    }

    // คำนวณและใส่ข้อมูล Proportion Discount Price ใน bill_data.lists[].proportion_discount_ratio
    billAndLists_data.lists.forEach(element => {
        element.proportion_discount_price = (Number(element.proportion_discount_ratio) * Number(billAndLists_data.price_bill_discount)).toFixed(config_toFixed);
    });

    const totalInlineProportionDiscountPrice = billAndLists_data.lists.reduce((prev, curr) => {
        return (Number(prev) + Number(curr.proportion_discount_price))
    }, 0).toFixed(config_toFixed);

    if (Number(totalInlineProportionDiscountPrice) !== Number(billAndLists_data.price_bill_discount)) {
        const findMaxiumIndex = billAndLists_data.lists.reduce((prev, curr, idx, arr) => {
            if (idx === 0) { return prev; }
            if (Number(curr?.proportion_discount_ratio) > Number(arr[prev].proportion_discount_ratio)) { return idx; }
            if (Number(curr?.price_grand_total) > Number(arr[prev].price_grand_total)) { return idx; }
            return prev;
        }, 0);
        if (Number(totalInlineProportionDiscountPrice) < Number(billAndLists_data.price_bill_discount)) {
            const missingProportionDiscountPrice = (Number(billAndLists_data.price_bill_discount) - Number(totalInlineProportionDiscountPrice)).toFixed(config_toFixed + 1);
            billAndLists_data.lists[findMaxiumIndex].proportion_discount_price = (Number(billAndLists_data.lists[findMaxiumIndex].proportion_discount_price) + Number(missingProportionDiscountPrice)).toFixed(config_toFixed);
        }
        if (Number(totalInlineProportionDiscountPrice) > Number(billAndLists_data.price_bill_discount)) {
            const missingProportionDiscountPrice = (Number(totalInlineProportionDiscountPrice) - Number(billAndLists_data.price_bill_discount)).toFixed(config_toFixed);
            billAndLists_data.lists[findMaxiumIndex].proportion_discount_price = (Number(billAndLists_data.lists[findMaxiumIndex].proportion_discount_price) - Number(missingProportionDiscountPrice)).toFixed(config_toFixed);
        }
        /**
         * ตรวจสอบ ProportionDiscountPrice อีกครั้งว่าเท่ากับราคาส่วนลดท้ายบิลแล้วหรือยัง ถ้ายังจะไม่ให้ทำงานต่อ
         */
        const totalInlineProportionDiscountPrice__ReCheck = billAndLists_data.lists.reduce((prev, curr) => {
            return (Number(prev) + Number(curr.proportion_discount_price))
        }, 0).toFixed(config_toFixed);
        if (Number(totalInlineProportionDiscountPrice__ReCheck) !== Number(billAndLists_data.price_bill_discount)) {
            throw Error(`ค่า Proportion discount price ไม่สอดคล้องกันกับส่วนลดท้ายบิล จากการเติมราคาส่วนลดตามสัดส่วน ที่ขาดหายไป: รายการที่ (${findMaxiumIndex}), ราคาส่วนลดตามสัดส่วนที่เติมไปแล้ว (${billAndLists_data.lists[findMaxiumIndex].proportion_discount_price})`);
        }
    }

    return billAndLists_data;
};



// Test
const xBill = {
    price_bill_discount: '0.21',
    lists: [
        {
            seq_number: '1',
            price_grand_total: '4800.00'
        },
        {
            seq_number: '2',
            price_grand_total: '5000.00'
        },
        {
            seq_number: '3',
            price_grand_total: '700.00'
        }
    ]
};
console.log(proportionDiscountSerializer(xBill, { toFixed: 2 }));