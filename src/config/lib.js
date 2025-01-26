
export const genCode = async (lastCode, codeStart) => {
  try {
    const year = new Date().getFullYear() + 543; // ปี พ.ศ. 2568
    const yearSuffix = year.toString().slice(-2); // ตัดเอาเฉพาะสองตัวท้าย เช่น 68
    const prefix = `${codeStart}${yearSuffix}`; // รหัสคงที่ เช่น BD68

    let nextNumber = "0001";
    if (lastCode) {
    //   const lastCode = rows[0].code; // ตัวอย่าง: BD68/0012
      const lastNumber = parseInt(lastCode.split("/")[1]); // ดึงส่วนตัวเลข: 12
      nextNumber = String(lastNumber + 1).padStart(4, "0"); // เพิ่มเลข +1 และเติม 0 ด้านหน้า
    }

    const newCode = `${prefix}/${nextNumber}`; // ตัวอย่าง: BD68/0013
    return newCode

  } catch (error) {
    console.log(error);
    return false
  }
};
