// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract TradeBook {
    // --- EIP-2537 precompile addresses (per spec) ---
    address constant BLS12_G1MSM       = address(0x0c);
    address constant BLS12_MAP_FP_TO_G1= address(0x10);

    // --- BLS12-381 constants (per spec) ---
    // Main subgroup order q
    uint256 constant Q =
        0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001;

    // G1 generator (H1) coordinates from the spec (uncompressed 128 bytes: X(64) || Y(64), both big-endian).
    // See EIP-2537 "Generators: H1" (we use H1 as the canonical G1 generator).
    bytes constant G1_GENERATOR = hex"000000000000000000000000000000000000000000000000000000000000000017f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac58000000000000000000000000000000000000000000000000000000000000000008b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3ed";

    // --- Errors ---
    error PrecompileFailure();   // low-level call to precompile failed (bad encoding/out of subgroup, etc.)
    error InvalidPointLength();  // pk/preout not 128 bytes
    error InvalidScalar();       // c or s1 not in [0, Q) (optional check)

    enum TradeType { BUY, SELL }
    
    struct Trade {
        address trader;
        uint256 price;
        uint256 volume;
        TradeType tradeType;
        uint256 blockNumber;
        uint256 timestamp;
    }
    
    Trade[] public trades;
    
    event TradeSubmitted(
        uint256 indexed tradeId,
        address indexed trader,
        uint256 price,
        uint256 volume,
        TradeType tradeType,
        uint256 blockNumber,
        uint256 timestamp
    );

    // --- Public verifier API (ported) ---
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
        if (c >= Q || s1 >= Q) revert InvalidScalar();

        bytes memory hIn = _mapToG1(_hashToFp(inBlob));

        bytes memory R = _g1Msm2(
            G1_GENERATOR, s1,
            pk, _negateModQ(c)
        );

        bytes memory Rm = _g1Msm2(
            hIn, s1,
            preout, _negateModQ(c)
        );

        uint256 cPrime = _hashToScalarQ(
            abi.encodePacked(inBlob, pk, preout, R, Rm)
        );

        if (cPrime != c) {
            return (false, bytes32(0));
        }

        return (true, keccak256(abi.encodePacked(preout, inBlob)));
    }
    
    function submitTrade(
        uint256 _price,
        uint256 _volume,
        TradeType _tradeType
    ) external {
        // bytes memory dummyPk;
        // bytes memory dummyIn;
        // bytes memory dummyPreout;
        // try this.verify(dummyPk, dummyIn, 0, 0, dummyPreout) returns (bool ok, bytes32 out) {
        //     ok; out;
        // } catch {}
        Trade memory newTrade = Trade({
            trader: msg.sender,
            price: _price,
            volume: _volume,
            tradeType: _tradeType,
            blockNumber: block.number,
            timestamp: block.timestamp
        });
        
        trades.push(newTrade);
        
        emit TradeSubmitted(
            trades.length - 1,
            msg.sender,
            _price,
            _volume,
            _tradeType,
            block.number,
            block.timestamp
        );
    }
    
    function getTrade(uint256 _tradeId) external view returns (Trade memory) {
        require(_tradeId < trades.length, "Trade does not exist");
        return trades[_tradeId];
    }
    
    function getAllTrades() external view returns (Trade[] memory) {
        return trades;
    }
    
    function getTradeCount() external view returns (uint256) {
        return trades.length;
    }
    
    function getTradesByEpoch(uint256 _startBlock, uint256 _endBlock) 
        external 
        view 
        returns (Trade[] memory) 
    {
        uint256 count = 0;
        
        // Count trades in range
        for (uint256 i = 0; i < trades.length; i++) {
            if (trades[i].blockNumber >= _startBlock && trades[i].blockNumber <= _endBlock) {
                count++;
            }
        }
        
        // Create result array
        Trade[] memory result = new Trade[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < trades.length; i++) {
            if (trades[i].blockNumber >= _startBlock && trades[i].blockNumber <= _endBlock) {
                result[index] = trades[i];
                index++;
            }
        }
        
        return result;
    }

    // --- Internals for VRF-style verification (ported) ---
    function _negateModQ(uint256 c) private pure returns (uint256) {
        if (c == 0) return 0;
        unchecked { return Q - (c % Q); }
    }

    function _hashToFp(bytes memory data) private pure returns (bytes memory fp64) {
        bytes32 h = keccak256(data);
        fp64 = new bytes(64);
        assembly {
            mstore(add(fp64, 64), h)
        }
    }

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

    function _g1Msm2(
        bytes memory P1, uint256 s1,
        bytes memory P2, uint256 s2
    ) private view returns (bytes memory out128) {
        if (P1.length != 128 || P2.length != 128) revert InvalidPointLength();

        bytes memory inBuf = new bytes(160 * 2);
        bytes memory s1be = _u256ToBe32(s1);
        bytes memory s2be = _u256ToBe32(s2);

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

    function _u256ToBe32(uint256 x) private pure returns (bytes memory out) {
        out = new bytes(32);
        assembly { mstore(add(out, 0x20), x) }
    }

    function _memcpy(
        bytes memory dst, uint256 dstOff,
        bytes memory src, uint256 srcOff,
        uint256 len
    ) private pure {
        assembly {
            let d := add(add(dst, 0x20), dstOff)
            let s := add(add(src, 0x20), srcOff)
            for { let end := add(s, len) } lt(s, end) { s := add(s, 0x20) d := add(d, 0x20) } {
                mstore(d, mload(s))
            }
        }
    }

    function _hashToScalarQ(bytes memory data) private pure returns (uint256) {
        return uint256(keccak256(data)) % Q;
    }
}
