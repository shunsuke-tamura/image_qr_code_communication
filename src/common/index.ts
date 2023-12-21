import { Bit } from "../types";

// 配列をn個ずつに分割する
export const splitArray = <T>(
  array: T[],
  n: number,
  adjustment?: (result: T[][]) => void
): T[][] => {
  const result = [];
  for (let i = 0; i < array.length; i += n) {
    result.push(array.slice(i, i + n));
  }
  if (adjustment) adjustment(result);
  return result;
};

export const bitArrayToUint8Array = (bitArray: Bit[]) => {
  const bytes = [];
  for (let i = 0; i < bitArray.length; i += 8) {
    const byte = bitArray.slice(i, i + 8).join("");
    bytes.push(parseInt(byte, 2));
  }
  return new Uint8Array(bytes);
};

const uint8ArrayToBitArray = (uint8Array: Uint8Array) => {
  const bitArray: Bit[] = [];

  uint8Array.forEach((byte) => {
    for (let i = 7; i >= 0; i--) {
      bitArray.push(byte & (1 << i) ? 1 : 0);
    }
  });

  return bitArray;
};

export const convertImageToBitArray = (file: File): Promise<Bit[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = (e) => {
      console.log(e.target?.result);

      const imageBinaryArray = reader.result as ArrayBuffer;
      if (imageBinaryArray.byteLength > 0) {
        resolve(uint8ArrayToBitArray(new Uint8Array(imageBinaryArray)));
      } else {
        reject(new Error("Failed to convert image to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

// 10進数を2進数の配列に変換する
export const decimalToBitArray = (decimal: number, length: number): Bit[] => {
  const bits = decimal
    .toString(2)
    .split("")
    .map((bit) => (bit === "0" ? 0 : 1));
  while (bits.length < length) {
    bits.unshift(0);
  }
  return bits;
};
