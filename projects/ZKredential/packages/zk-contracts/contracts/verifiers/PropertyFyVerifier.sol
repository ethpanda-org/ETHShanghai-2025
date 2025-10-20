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

contract PropertyFyVerifier {
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
    uint256 constant deltax1 = 8092276095210225542704667730723026271451001427957369968503738408000592209980;
    uint256 constant deltax2 = 9487399295521338771016189888942050534526600680207227515667711963418316047756;
    uint256 constant deltay1 = 14815082202124801935816490477121932939920468743440168883616952929443234846803;
    uint256 constant deltay2 = 12185256578834019516304186161452858131823263433550101190601137106934994899031;

    
    uint256 constant IC0x = 1610590511111258377921164048419935164596801327123440223802923224181903280830;
    uint256 constant IC0y = 21249604937158997853575164630486849188755319298396400554899445447498939272089;
    
    uint256 constant IC1x = 19586267318928288251082595996166601337050230324912955232702528432479485518831;
    uint256 constant IC1y = 19970962648838753262384556912183861565480076462599146736800366037557599959459;
    
    uint256 constant IC2x = 12756797997115465774664863179592612214578684758794299990487199353250060677569;
    uint256 constant IC2y = 12833838630219215316137560379699668102022491189214446682753612642457139987100;
    
    uint256 constant IC3x = 1659782164893839878270617786797631615360486769777804856924046458476352060786;
    uint256 constant IC3y = 3090644262707422521920461333730608567355353461190698127524081741055026070418;
    
    uint256 constant IC4x = 17492627407356995170703505636511567112896719060431353621110255297252665361203;
    uint256 constant IC4y = 14443608948519902894000044325293575823296643449524224769635370784364607158369;
    
    uint256 constant IC5x = 8914741488503960870927245751577101302539795114620660763079122264737702463394;
    uint256 constant IC5y = 7995392348326484486437744320245383449389819128571039348814794169340479847804;
    
    uint256 constant IC6x = 17651861193853631641807212576169316234688397217037508899352961093800075628559;
    uint256 constant IC6y = 4816008487539820129638736050309160981551477909165617688080991050677984650528;
    
    uint256 constant IC7x = 21275029917520408452460923984704526129712769523371368622664955798181439472074;
    uint256 constant IC7y = 12664381844159241772842398817003925446760839539505001549741152695031051647936;
    
    uint256 constant IC8x = 8595069554142419275430815678428246764128130937287060911802129800258461538404;
    uint256 constant IC8y = 21093747000547889853802746360596581045520617537926579113058157189237814516234;
    
    uint256 constant IC9x = 19866239529260461624792973691565099678930892176175344355408427832239949927622;
    uint256 constant IC9y = 9488638093275862734518289423671061232129533159414260219177208151474245584394;
    
    uint256 constant IC10x = 15430690041726662135689741758912091604764460912934633155091078329344112709815;
    uint256 constant IC10y = 4404039254764805519124979678803391587582824093240503013500827945959152643075;
    
    uint256 constant IC11x = 13716362857318197715661025213678536260102335562657257492582161498626623489515;
    uint256 constant IC11y = 14641640380017034494056828066231686843774661422904486219147724070345281579491;
    
    uint256 constant IC12x = 20298187658772829749175292616758825005314597922329591328224403528260819743954;
    uint256 constant IC12y = 7605996179111824844613056435313847899692157863794115659840507394442821429651;
    
 
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
