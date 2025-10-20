import { bls12_381 } from '@noble/curves/bls12-381'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { keccak256 } from 'ethers'

const CURVE_ORDER = bls12_381.params.r

export type G1Point = ReturnType<typeof bls12_381.G1.Point.fromBytes>

function H_p(...inputs: (string | Uint8Array | bigint)[]): bigint {
  const combinedBytes: Uint8Array[] = []
  for (const input of inputs) {
    if (typeof input === 'string') {
      combinedBytes.push(new TextEncoder().encode(input))
    } else if (input instanceof Uint8Array) {
      combinedBytes.push(input)
    } else if (typeof input === 'bigint') {
      const hex = input.toString(16).padStart(64, '0')
      combinedBytes.push(hexToBytes(hex))
    }
  }
  const totalLength = combinedBytes.reduce((sum, arr) => sum + arr.length, 0)
  const combined = new Uint8Array(totalLength)
  let offset = 0
  for (const bytes of combinedBytes) {
    combined.set(bytes, offset)
    offset += bytes.length
  }
  const hash = keccak256(combined)
  const hashBigInt = BigInt(hash)
  return hashBigInt % CURVE_ORDER
}

export function H_G(input: string | Uint8Array): G1Point {
  const inputBytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  const point = bls12_381.G1.hashToCurve(inputBytes, { DST: 'VRF_BLS12381_HASH_TO_CURVE' })
  return point as any as G1Point
}

function pointToBytes(point: G1Point): Uint8Array {
  return point.toRawBytes(true)
}

export interface VRFProof {
  c: bigint
  s_1: bigint
  preout: Uint8Array
}

export function prove(
  sk: bigint,
  pk: G1Point,
  input: string | Uint8Array,
  r_1?: bigint
): VRFProof {
  const H_in = H_G(input)
  const preout_point = H_in.multiply(sk)

  if (r_1 === undefined) {
    const r_1_bytes = bls12_381.utils.randomPrivateKey()
    r_1 = BigInt('0x' + bytesToHex(r_1_bytes)) % CURVE_ORDER
  }

  const R = bls12_381.G1.ProjectivePoint.BASE.multiply(r_1)
  const R_m = H_in.multiply(r_1)

  const inputBytes = typeof input === 'string' ? new TextEncoder().encode(input) : input

  const c = H_p(
    inputBytes,
    pointToBytes(pk),
    pointToBytes(preout_point),
    pointToBytes(R),
    pointToBytes(R_m)
  )

  const s_1 = (r_1 + c * sk) % CURVE_ORDER

  return {
    c,
    s_1,
    preout: pointToBytes(preout_point)
  }
}

export function verify(
  pk: G1Point,
  input: string | Uint8Array,
  proof: VRFProof
): Uint8Array | null {
  const { c, s_1, preout } = proof
  const preout_point = bls12_381.G1.ProjectivePoint.fromHex(bytesToHex(preout))

  const s1_G = bls12_381.G1.ProjectivePoint.BASE.multiply(s_1)
  const c_pk = pk.multiply(c)
  const R = s1_G.subtract(c_pk)

  const H_in = H_G(input)
  const s1_H = H_in.multiply(s_1)
  const c_preout = preout_point.multiply(c)
  const R_m = s1_H.subtract(c_preout)

  const inputBytes = typeof input === 'string' ? new TextEncoder().encode(input) : input

  const c_computed = H_p(
    inputBytes,
    pointToBytes(pk),
    preout,
    pointToBytes(R),
    pointToBytes(R_m)
  )

  if (c_computed !== c) {
    return null
  }

  const hash = keccak256('0x' + bytesToHex(preout) + bytesToHex(inputBytes))
  return hexToBytes(hash.slice(2))
}

export function generateKeyPair(): { sk: bigint; pk: G1Point } {
  const skBytes = bls12_381.utils.randomPrivateKey()
  const sk = BigInt('0x' + bytesToHex(skBytes)) % CURVE_ORDER
  const pk = bls12_381.G1.ProjectivePoint.BASE.multiply(sk)
  return { sk, pk }
}


