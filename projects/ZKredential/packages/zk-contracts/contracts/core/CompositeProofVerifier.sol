// SPDX-License-Identifier: GPL-3.0


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
    uint256 constant deltax1 = 4383642855619419422672270344320021281353294428639831285509671745110649028392;
    uint256 constant deltax2 = 8731029102373964328323596962606149353039319889675514165234731859344978418246;
    uint256 constant deltay1 = 6013373971175090656713775784365665199421647517822122705919262975460998679564;
    uint256 constant deltay2 = 8779645049121406432826319812154564365877543670778659698378505645075602965801;

    
    uint256 constant IC0x = 5954843317866088221944890348943983258206439553920195399428333959897250967727;
    uint256 constant IC0y = 14605424621284905349576953171503104513528948224563736890002012861049442551146;
    
    uint256 constant IC1x = 17226015542480370794742561762700513700712531606908966116666602972982281597791;
    uint256 constant IC1y = 8537802632916721253218296893872219775988207207582544711475415325752855183912;
    
    uint256 constant IC2x = 5797521710490212695293102097267780284062648896588799689860216503750939007134;
    uint256 constant IC2y = 80445898469705744029198085019994483710569455437543937085941626893567024765;
    
    uint256 constant IC3x = 16051471368400030368851590092769923773478768230932679027237200598440466151551;
    uint256 constant IC3y = 12273486796124723641947176392725876545646680859247550828799358164787716342622;
    
    uint256 constant IC4x = 15228183995233756813750701928853973189817655442238652885799273783182933127469;
    uint256 constant IC4y = 2272641452118276243560676113222601984335123332478121072488205117538229861039;
    
    uint256 constant IC5x = 5204687344959142051860785587864683491367871479987167400516536499330401869922;
    uint256 constant IC5y = 21272829825834723388807185137960427225609173155862543769392237784861552250149;
    
    uint256 constant IC6x = 3205084084339946885523170802903089942268102227063051418413605951455710314837;
    uint256 constant IC6y = 18959811540733209975142270859014998798173473313475280492990367382960448726469;
    
    uint256 constant IC7x = 21008175308912179826004361642863296402337781051950933646952462787415098830083;
    uint256 constant IC7y = 13127391096898185224052073879028097431992953749895046415609053984726562586240;
    
    uint256 constant IC8x = 14195402014233821347448500624101759718712073912188474916386369902619362774205;
    uint256 constant IC8y = 15995738246223144063305520268182476396078212997891140930758475095360917860715;
    
    uint256 constant IC9x = 15109146338387251487567832539978225110295456046367840817815542502884956076828;
    uint256 constant IC9y = 4517711744228458515601678735442280288295266218577045004359181622375479595660;
    
    uint256 constant IC10x = 4643265066750689623473209415958697118677867162731827863916558205495962639766;
    uint256 constant IC10y = 4768114610251183233689448956114682334703847657681926175303012534399232572767;
    
    uint256 constant IC11x = 16796642179488005942660866266034082432731774213245291459420166709701708263205;
    uint256 constant IC11y = 5369148457825207345357941850160496218609197811249090552401922603017056668445;
    
    uint256 constant IC12x = 12963850883427219452616170370468106182732215694743079983355029239354181151030;
    uint256 constant IC12y = 7720792998870957968695828572142817685659170579402756216003973151304180568510;
    
 
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
