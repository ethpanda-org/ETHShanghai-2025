// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title Ring/VRF-style verifier over BLS12-381 using EIP-2537 precompiles
/// @notice Implements:
///  R  = s1*G - c*pk
///  Rm = s1*H_G(in) - c*preout
///  check c == Hp(in, pk, preout, R, Rm)
///  if ok => out = H(preout, in)
/// @dev Uses EIP-2537 precompiles: G1 MSM (0x0c) and MAP_FP_TO_G1 (0x10). Encodings per spec.
///      G1 points are 128 bytes (x||y), each coordinate is 64-byte big-endian Fp element (top 16 bytes zero).
contract EIP2537VrfStyleVerifier {
    // --- EIP-2537 precompile addresses (per spec) ---
    address constant BLS12_G1MSM       = address(0x0c);
    address constant BLS12_MAP_FP_TO_G1= address(0x10);

    // --- BLS12-381 constants (per spec) ---
    // Main subgroup order q
    uint256 constant Q =
        0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001;

    // G1 generator (H1) coordinates from the spec (uncompressed 128 bytes: X(64) || Y(64), both big-endian).
    // See EIP-2537 "Generators: H1" (we use H1 as the canonical G1 generator) .
    bytes constant G1_GENERATOR = hex"000000000000000000000000000000000000000000000000000000000000000017f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac58000000000000000000000000000000000000000000000000000000000000000008b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3ed";

    // --- Errors ---
    error PrecompileFailure();   // low-level call to precompile failed (bad encoding/out of subgroup, etc.)
    error InvalidPointLength();  // pk/preout not 128 bytes
    error InvalidScalar();       // c or s1 not in [0, Q) (optional check)

    // --- Public API ---

    /// @param pk     G1 public key, 128-byte uncompressed (x||y), big-endian limbs as per EIP-2537
    /// @param inBlob Arbitrary input bytes "in"
    /// @param c      Fiat–Shamir challenge (interpreted mod q)
    /// @param s1     Response scalar (interpreted mod q)
    /// @param preout G1 point, 128-byte uncompressed (x||y), purported VRF pre-output
    /// @return ok    true if verified
    /// @return out   keccak256(preout || inBlob) when ok, otherwise bytes32(0)
    function verify(
        bytes calldata pk,
        bytes calldata inBlob,
        uint256 c,
        uint256 s1,
        bytes calldata preout
    ) external view returns (bool ok, bytes32 out) {
        if (pk.length != 128 || preout.length != 128) revert InvalidPointLength();

        // Optionally bound scalars into [0, q). (If caller already reduces, this is a no-op.)
        if (c >= Q || s1 >= Q) revert InvalidScalar();

        // 1) Compute H_G(in): hash-to-field (bytes -> Fp) then MAP_FP_TO_G1.
        //    We use a simple hash_to_field: fp = be64(0) || be32(keccak(in)) which is < p.
        bytes memory hIn = _mapToG1(_hashToFp(inBlob)); // 128 bytes (G1 point)

        // 2) R = s1*G + (q-c)*pk   (since -c*pk == (q-c)*pk mod q)
        bytes memory R = _g1Msm2(
            G1_GENERATOR, s1,
            pk, _negateModQ(c)
        );

        // 3) Rm = s1*H(in) + (q-c)*preout
        bytes memory Rm = _g1Msm2(
            hIn, s1,
            preout, _negateModQ(c)
        );

        // 4) Recompute c' = Hp(in, pk, preout, R, Rm) = keccak256(...) mod q
        uint256 cPrime = _hashToScalarQ(
            abi.encodePacked(inBlob, pk, preout, R, Rm)
        );

        if (cPrime != c) {
            return (false, bytes32(0));
        }

        // 5) out = H(preout, in) = keccak256(preout || inBlob)
        return (true, keccak256(abi.encodePacked(preout, inBlob)));
    }

    // --- Internals ---

    /// @dev Compute (q - c) mod q; when c==0 returns 0.
    function _negateModQ(uint256 c) private pure returns (uint256) {
        if (c == 0) return 0;
        unchecked { return Q - (c % Q); }
    }

    /// @dev Hash arbitrary bytes to a field element encoding (64 bytes big-endian) for MAP_FP_TO_G1.
    ///      Construction: 64 bytes with the top 32 bytes zero, low 32 = keccak256(data).
    function _hashToFp(bytes memory data) private pure returns (bytes memory fp64) {
        bytes32 h = keccak256(data);
        fp64 = new bytes(64);
        // top 32 bytes already zero (Solidity zeros new memory)
        assembly {
            mstore(add(fp64, 64), h) // write h at the tail (low limb) => big-endian 64 = 0x00..00 || h
        }
    }

    /// @dev MAP Fp -> G1 using the 0x10 precompile. Input: 64 bytes; Output: 128 bytes (G1 point).
    function _mapToG1(bytes memory fp64) private view returns (bytes memory out128) {
        if (fp64.length != 64) revert PrecompileFailure();
        out128 = new bytes(128);
        bool ok;
        assembly {
            let fp64Ptr := add(fp64, 0x20)
            let out128Ptr := add(out128, 0x20)
            let success := staticcall(gas(), 0x10, fp64Ptr, 64, out128Ptr, 128)
            ok := success
        }
        if (!ok) revert PrecompileFailure();
    }

    /// @dev Two-term G1 MSM: returns 128-byte point for (s1*P1 + s2*P2).
    ///      Encodes as [P1(128) || s1(32) || P2(128) || s2(32)] and calls 0x0c.
    function _g1Msm2(
        bytes memory P1, uint256 s1,
        bytes memory P2, uint256 s2
    ) private view returns (bytes memory out128) {
        if (P1.length != 128 || P2.length != 128) revert InvalidPointLength();

        bytes memory inBuf = new bytes(160 * 2); // two pairs
        bytes memory s1be = _u256ToBe32(s1);
        bytes memory s2be = _u256ToBe32(s2);

        // Pack input: [P1||s1||P2||s2]
        assembly {
            // copy P1
            calldatacopy(0x00, 0, 0) // no-op; keep stack clean
        }
        _memcpy(inBuf, 0, P1, 0, 128);
        _memcpy(inBuf, 128, s1be, 0, 32);
        _memcpy(inBuf, 160, P2, 0, 128);
        _memcpy(inBuf, 288, s2be, 0, 32);

        out128 = new bytes(128);
        bool ok;
        assembly {
            let inBufPtr := add(inBuf, 0x20)
            let inBufLen := mload(inBuf)
            let out128Ptr := add(out128, 0x20)
            let success := staticcall(gas(), 0x0c, inBufPtr, inBufLen, out128Ptr, 128)
            ok := success
        }
        if (!ok) revert PrecompileFailure();
    }

    /// @dev Convert uint256 to 32-byte big-endian bytes.
    function _u256ToBe32(uint256 x) private pure returns (bytes memory out) {
        out = new bytes(32);
        assembly { mstore(add(out, 0x20), x) }
        // mstore writes as big-endian for bytes? No—mstore stores the word verbatim.
        // We need to big-endian swap because Solidity treats bytes as big-endian when compared lexicographically,
        // but precompile expects big-endian encoding of the integer.
        // However, EVM words are big-endian when interpreted as bytes in memory, so the 32-byte sequence already matches BE.
        // No further action needed.
    }

    /// @dev memcpy helper
    function _memcpy(
        bytes memory dst, uint256 dstOff,
        bytes memory src, uint256 srcOff,
        uint256 len
    ) private pure {
        assembly {
            // Pointers to starts
            let d := add(add(dst, 0x20), dstOff)
            let s := add(add(src, 0x20), srcOff)
            // copy 32-byte chunks
            for { let end := add(s, len) } lt(s, end) { s := add(s, 0x20) d := add(d, 0x20) } {
                mstore(d, mload(s))
            }
        }
    }

    /// @dev Hash to scalar in Z_q: keccak256(bytes) mod q.
    function _hashToScalarQ(bytes memory data) private pure returns (uint256) {
        return uint256(keccak256(data)) % Q;
    }
}
