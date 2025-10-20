// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 16265839170102208399196316547614120792945836912474328428730246041806365223979;
    uint256 constant alphay  = 19662504044778486349215516161500675949246318453493302368595034713904541448011;
    uint256 constant betax1  = 859700406630365071706765246550838170463481585882121016836503957063947416438;
    uint256 constant betax2  = 19273686268261934177468043946695437316913817836894992554174657635455555594370;
    uint256 constant betay1  = 9193053474970642158559250239069057944517537619206860055131756654086577700820;
    uint256 constant betay2  = 3953315183921878814056518918266112228991173372798739950444537493882190590962;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 13272569053550090814601565140522046432181322464939147228101075295544425425867;
    uint256 constant deltax2 = 20874764886403376979034638413919472553367565980396937775839453871366083861387;
    uint256 constant deltay1 = 8415587618752407604718161331088153641514502181078647622910286650653287572549;
    uint256 constant deltay2 = 13991033890362788225094593147413164021242670859114703477654494871873833770367;

    
    uint256 constant IC0x = 12823834652566774580136155899649391949451933267405032820440606844393443003897;
    uint256 constant IC0y = 10069202515745523509308306699793883821424597286822567177079866462832254121644;
    
    uint256 constant IC1x = 1456964741250663674233193680624793214283281019209673651096514906366387185578;
    uint256 constant IC1y = 11723087728843026025919473357235755637582251867597712227874090838870367209744;
    
    uint256 constant IC2x = 19050265901454177560037135036913440294152974128013018020828633296148724701605;
    uint256 constant IC2y = 4119272170975673851641815405853356651065436825610724444581991789086372775202;
    
    uint256 constant IC3x = 16147415298665305204208051668433479403288484172633084417456640712630550876012;
    uint256 constant IC3y = 6645201573542564971416655153340696739135380297608133940070342786062970299577;
    
    uint256 constant IC4x = 7581652834145144750600852676181421335444313430726286817081058906710017032958;
    uint256 constant IC4y = 14880494110303555468466466442875942721231581028874560881581479397520697177574;
    
    uint256 constant IC5x = 10890261070382220191199135429486949898692277207698346200106935794350361969592;
    uint256 constant IC5y = 2219898836544760255604466631834244706653748111732850557814801427959821998253;
    
    uint256 constant IC6x = 4017942506269639465015144795871876477530500236793016500250549824777578193126;
    uint256 constant IC6y = 17044786336447073633747762216321829944281890773355293687340603213067452596729;
    
    uint256 constant IC7x = 511445298162519010207672916143379563344690087366094989728579938752640790126;
    uint256 constant IC7y = 6887497530693010532984744466064932948955143713705228640789988781774277967745;
    
    uint256 constant IC8x = 3243695145849933572743588724631467748454238712553011735613721836074896511566;
    uint256 constant IC8y = 4289722744109675622725803489522844681822064757937758394534512482237771716079;
    
    uint256 constant IC9x = 5078809688140686492352862800262411010609610649960689511396494235166396077479;
    uint256 constant IC9y = 4869588260036368610022831534759987928380840093789194498793842676161357283529;
    
    uint256 constant IC10x = 2038793351480841079644209780692162206710403401428102259787661925575086889227;
    uint256 constant IC10y = 19042054816118763984390238171694918214769916170626265118171176653022869317626;
    
    uint256 constant IC11x = 16940006049270816481677003233846681389137970058342014359590792170934698023947;
    uint256 constant IC11y = 10679999164853289888131119067382715710164838520061650172612932297713959640866;
    
    uint256 constant IC12x = 14620494177670639185848431007662471203204402786673758220264328264803010290590;
    uint256 constant IC12y = 15471534710629157310812283183418056822595840010834933201362613329917102609624;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[12] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
