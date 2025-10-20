import { bls12_381 } from '@noble/curves/bls12-381';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { keccak256 } from 'ethers';

// BLS12-381 curve order (r - the order of G1/G2 subgroups)
const CURVE_ORDER = bls12_381.params.r;

/**
 * 将输入数据进行哈希，然后 mod p（BLS12-381 的阶）
 * @param inputs 输入数据数组
 * @returns 哈希后 mod p 的 bigint 值
 */
export function H_p(...inputs: (string | Uint8Array | bigint)[]): bigint {
  // 将所有输入拼接
  let combinedBytes: Uint8Array[] = [];
  
  for (const input of inputs) {
    if (typeof input === 'string') {
      // 将字符串转换为字节
      combinedBytes.push(new TextEncoder().encode(input));
    } else if (input instanceof Uint8Array) {
      combinedBytes.push(input);
    } else if (typeof input === 'bigint') {
      // 将 bigint 转换为 32 字节
      const hex = input.toString(16).padStart(64, '0');
      combinedBytes.push(hexToBytes(hex));
    }
  }
  
  // 拼接所有字节
  const totalLength = combinedBytes.reduce((sum, arr) => sum + arr.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const bytes of combinedBytes) {
    combined.set(bytes, offset);
    offset += bytes.length;
  }
  
  // 使用 ethers 的 keccak256 进行哈希
  const hash = keccak256(combined);
  
  // 转换为 bigint 并 mod p
  const hashBigInt = BigInt(hash);
  return hashBigInt % CURVE_ORDER;
}

// 定义点类型
export type G1Point = ReturnType<typeof bls12_381.G1.Point.fromBytes>;

/**
 * Hash to Curve: 将输入哈希映射到 BLS12-381 曲线上的点
 * @param input 输入数据
 * @returns 曲线上的点
 */
export function H_G(input: string | Uint8Array): G1Point {
  let inputBytes: Uint8Array;
  
  if (typeof input === 'string') {
    // 如果是字符串，转换为字节
    inputBytes = new TextEncoder().encode(input);
  } else {
    inputBytes = input;
  }
  
  // 使用 BLS12-381 的 hash to curve 功能
  const point = bls12_381.G1.hashToCurve(inputBytes, {
    DST: 'VRF_BLS12381_HASH_TO_CURVE',
  });
  
  // hashToCurve 返回的是 H2CPoint，需要转换为 ProjectivePoint
  // H2CPoint 实际上已经是一个 ProjectivePoint，所以可以直接转换
  return point as any as G1Point;
}

/**
 * 将点序列化为字节数组
 */
function pointToBytes(point: G1Point): Uint8Array {
  return point.toBytes(true); // compressed format
}

/**
 * VRF Prover 输出
 */
export interface VRFProof {
  c: bigint;
  s_1: bigint;
  preout: Uint8Array;
}

/**
 * VRF Prover 计算
 * @param sk 私钥（scalar）
 * @param pk 公钥（曲线上的点）
 * @param input 输入数据
 * @param r_1 可选的随机数（用于测试，生产环境应该自动生成）
 * @returns VRF 证明
 */
export function prove(
  sk: bigint,
  pk: G1Point,
  input: string | Uint8Array,
  r_1?: bigint
): VRFProof {
  // 1. 计算 preout = sk · H_G(in)
  const H_in = H_G(input);
  const preout_point = H_in.multiply(sk);
  
  // 2. 在 F_p 中选取随机数 r_1（如果未提供）
  if (r_1 === undefined) {
    const r_1_bytes = bls12_381.utils.randomSecretKey();
    r_1 = BigInt('0x' + bytesToHex(r_1_bytes)) % CURVE_ORDER;
  }
  
  // 3. 计算 R = r_1 · G 和 R_m = r_1 · H_G(in)
  const R = bls12_381.G1.Point.BASE.multiply(r_1);
  const R_m = H_in.multiply(r_1);
  
  // 4. 计算 c = H_p(in, pk, preout, R, R_m)
  let inputBytes: Uint8Array;
  if (typeof input === 'string') {
    inputBytes = new TextEncoder().encode(input);
  } else {
    inputBytes = input;
  }
  
  const c = H_p(
    inputBytes,
    pointToBytes(pk),
    pointToBytes(preout_point),
    pointToBytes(R),
    pointToBytes(R_m)
  );
  
  // 5. 计算 s_1 = r_1 + c · sk
  const s_1 = (r_1 + c * sk) % CURVE_ORDER;
  
  return {
    c,
    s_1,
    preout: pointToBytes(preout_point),
  };
}

/**
 * VRF Verifier 验证
 * @param pk 公钥
 * @param input 输入数据
 * @param proof VRF 证明
 * @returns 验证成功返回随机输出，失败返回 null
 */
export function verify(
  pk: G1Point,
  input: string | Uint8Array,
  proof: VRFProof
): Uint8Array | null {
  const { c, s_1, preout } = proof;
  
  // 从字节恢复 preout 点
  const preout_point = bls12_381.G1.Point.fromBytes(preout);
  
  // 1. 计算 R = s_1 · G - c · pk
  const s1_G = bls12_381.G1.Point.BASE.multiply(s_1);
  const c_pk = pk.multiply(c);
  const R = s1_G.subtract(c_pk);
  
  // 1. 计算 R_m = s_1 · H_G(in) - c · preout
  const H_in = H_G(input);
  const s1_H = H_in.multiply(s_1);
  const c_preout = preout_point.multiply(c);
  const R_m = s1_H.subtract(c_preout);
  
  // 2. 判断 c = H_p(in, pk, preout, R, R_m)
  let inputBytes: Uint8Array;
  if (typeof input === 'string') {
    inputBytes = new TextEncoder().encode(input);
  } else {
    inputBytes = input;
  }
  
  const c_computed = H_p(
    inputBytes,
    pointToBytes(pk),
    preout,
    pointToBytes(R),
    pointToBytes(R_m)
  );
  
  // 3. 如果相等，计算 out = H(preout, in) 并输出 out，否则输出 false
  if (c_computed !== c) {
    return null;
  }
  
  // 计算最终输出 out = H(preout, in)
  const hash = keccak256(
    '0x' + bytesToHex(preout) + bytesToHex(inputBytes)
  );
  
  return hexToBytes(hash.slice(2));
}

/**
 * 生成密钥对
 * @returns { sk: 私钥, pk: 公钥 }
 */
export function generateKeyPair(): {
  sk: bigint;
  pk: G1Point;
} {
  const skBytes = bls12_381.utils.randomSecretKey();
  const sk = BigInt('0x' + bytesToHex(skBytes)) % CURVE_ORDER;
  const pk = bls12_381.G1.Point.BASE.multiply(sk);
  
  return { sk, pk };
}

