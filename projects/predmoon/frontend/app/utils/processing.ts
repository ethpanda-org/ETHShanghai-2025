//Calculate percentage
export const percentage = (amount: number, type: string) => {
  let percentage = Math.round(amount * 100);

  if (type === "str" && percentage < 1) {
    return "<" + 1;
  }

  return percentage;
};

//US dollar unit conversion
export const convertCurrency = (amount: number) => {
  if (amount > 1000) {
    const k = (amount / 1000).toFixed(0);
    if (Number(k) > 999) {
      // If the amount is greater than 1 million, convert to millions
      const m = (amount / 1000000).toFixed(0);
      return m + "m";
    }
    return k + "k";
  }
  return amount;
};

//Comma separated amounts
export const amountSeparate = (amount: number) => {
  amount = Math.round(amount);
  return amount.toLocaleString();
};

/**
 * The number converts to 324,120
 *
 * @param value quantity
 * @return Formatted quantity
 */
export const formatNumberWithCommas = (value: number) => {
  // return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  // Convert a number to a string
  if (value === 0) return 0;
  const numStr = value.toString();
  // Split string by decimal point
  const parts = numStr.split(".");
  // Process the integer part and add commas to separate
  const integerPart = parts[0]
    ? parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : "";
  // If there is a decimal part, concatenate the integer part and the decimal part
  if (parts.length > 1) {
    return `${integerPart}.${parts[1]}`;
  }
  // If there is no decimal part, return the integer part directly.
  return integerPart;
};

//The amount on the button is rounded to one decimal place (if the page feels weird, I changed it to two decimal places)
export const amountMoney = (amount: number) => {
  // return Math.round(amount * 10) / 10;
  return Number(amount.toFixed(2));
};

// The string retains the first six digits and the last four digits are encrypted
export const encryptMiddle = (str: string) => {
  if (str) {
    const midLen = str.length - 6 - 4;
    const starCount = midLen > 0 ? midLen.toString().replace(/\d/g, "..") : "";
    return str.substr(0, 6) + starCount + str.substr(-4);
  }
};

//Unit conversion: Change $ to ¢ (the backend gives $, and the front-end page displays ¢, which needs to be converted)
export const unitConvert = (amount:number) => {
  return parseFloat((amount * 100).toFixed(2));
};
//Unit conversion: Change $ to ¢ (backend displays are all $, front-end page displays ¢ need to be converted) There is a minimum price jump
export const unitConvert2 = (amount:number, priceSize:number) => {
  let num = limitPricePrecision(priceSize);
  return (amount * 100).toFixed(num);
};

//Minimum order price jumps. Convert $ to ¢ (backend displays all $, frontend displays integers)
export const limitPricePrecision = (priceSize:number) => {
  // let num = parseFloat((priceSize * 100).toFixed(2))
  let num = priceSize * 100;
  const numStr = priceSize.toString();
  // Use regular expression to match numbers after decimal point
  const match = numStr.match(/\.(\d+)/);
  // If no match is found, the number of decimal places is 0
  if (!match || !match[1]) {
    return 0;
  }
  // Returns the length of the matched decimal part
  return match[1].length;
};

// The result amount has more than 6 decimal places, and the precision is 6
export const formatResultPrice = (total:number) => {
  const numStr = total.toString();
  // Use regular expression to match numbers after decimal point
  const match = numStr.match(/\.(\d+)/);
  if (match && match[1] && match[1].length > 6) {
    return total.toFixed(6);
  } else {
    return total;
  }
};

export const shortenNumber = (value: any) => {
  const num =
    typeof value === "string"
      ? parseFloat(value.replace(/[^\d.-]/g, ""))
      : Number(value);

  if (isNaN(num)) return value;

  const isNegative = num < 0;
  let absNum = Math.abs(num);
  const units = ["", "K", "M", "B", "T"];
  let unitIndex = 0;

  while (absNum >= 1000 && unitIndex < units.length - 1) {
    absNum /= 1000;
    unitIndex++;
  }

  let decimalPlaces = 2;
  if (unitIndex > 0) {
    if (absNum >= 100) decimalPlaces = 0;
    else if (absNum >= 10) decimalPlaces = 1;
  }

  let result = absNum.toFixed(decimalPlaces);
  if (decimalPlaces > 0 && result.includes(".")) {
    result = result.replace(/\.?0+$/, "");
  }

  return (isNegative ? "-" : "") + result + units[unitIndex];
};

export const formatTitle = (title: string) => {
  if (title) {
    return encodeURIComponent(
      title
        .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/gi, "")
        .replace(/[ /?]+/g, "-")
        .toLowerCase()
    );
  }
  return "";
};

export const shortenAddress = (
  address: string,
  startLength = 4,
  endLength = 4
) => {
  if (!address) return "";
  if (address.length !== 42 || !address.startsWith("0x")) {
    return address;
  }
  const start = address.substring(0, startLength + 2);
  const end = address.substring(address.length - endLength);
  return `${start}...${end}`;
};

export const shortenHash = (
  hash: string,
  startLength = 4,
  endLength = 0
) => {
  if (!hash) return "";
  let pre = ''
  if (endLength === 0) {
    pre = hash.substring(0, startLength);
    return `${pre}`;
  }
  pre = hash.substring(0, startLength);
  const end = hash.substring(hash.length - endLength);
  return `${pre}...${end}`
};

