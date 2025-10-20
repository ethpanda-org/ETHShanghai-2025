import Decimal from 'decimal.js';

export const add = (a: string | number | Decimal, b: string | number | Decimal) => new Decimal(a).add(new Decimal(b))
export const subtract = (a: string | number | Decimal, b: string | number | Decimal) => new Decimal(a).sub(new Decimal(b))
export const multiply = (a: string | number | Decimal, b: string | number | Decimal) => new Decimal(a).mul(new Decimal(b))
export const divide = (a: string | number | Decimal, b: string | number | Decimal) => new Decimal(a).div(new Decimal(b))
export const decimal = (a: string | number | Decimal) => new Decimal(a)
