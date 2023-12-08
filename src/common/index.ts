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
