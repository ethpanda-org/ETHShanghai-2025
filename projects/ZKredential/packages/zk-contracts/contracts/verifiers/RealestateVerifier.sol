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

contract RealestateVerifier {
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
    uint256 constant deltax1 = 12898290953819511317682803076750233449951851159686024798371513260343791742558;
    uint256 constant deltax2 = 16198295948642283648991298912000109242557732601683251945834577713252483766052;
    uint256 constant deltay1 = 10363833110870924244226571323090666272039165161167516283642089273990259617940;
    uint256 constant deltay2 = 4740025579367065321482598320054083814382262922894545651810309294370769831590;

    
    uint256 constant IC0x = 13619931333855785369230851331845156823038038465973119052010253548948380830625;
    uint256 constant IC0y = 12346357517487256821239255290928185241222458149476844798798959381286210266194;
    
    uint256 constant IC1x = 17800857361675556668220065452805918354152877799782586942318822797697986188028;
    uint256 constant IC1y = 2797346430708210787551241769446679641963362549503106640614696342682175553529;
    
    uint256 constant IC2x = 6986499749452375698315070825355860586690812773223634612887426182835550715387;
    uint256 constant IC2y = 16336396251128270897449893208100720265943797948630443815982020583436673807056;
    
    uint256 constant IC3x = 8415136856170430238966060269707323102997604606113934538053680728967121267925;
    uint256 constant IC3y = 18713236176922218084007357495232339390061570078601299432358570684315476003513;
    
    uint256 constant IC4x = 20570027052969913011478424071439350692362537030522726364558597981238895430034;
    uint256 constant IC4y = 20377058393398082528356061135515184058318202540263307015687515047229553544651;
    
    uint256 constant IC5x = 16843172413839877234011330624088206631975258707451212154996457135789869488162;
    uint256 constant IC5y = 14112430294716738149919693006606649040842122454013963013010625858554051498891;
    
    uint256 constant IC6x = 14937695272402713843015972650427402548669232271843990434994503518880874775429;
    uint256 constant IC6y = 1456294137143151975035462134302790934056663925088749097483527776994256656535;
    
    uint256 constant IC7x = 4177361482359669707548651342246301792837617226544732266480406581413083911271;
    uint256 constant IC7y = 14551708330635191251521647520754650247810576286296142445329849023622580819688;
    
    uint256 constant IC8x = 17045981581441020116969451935624276084645473884538757775262055479885683968645;
    uint256 constant IC8y = 6348642134541915810470675917742453867657852362019655493754154148475675939179;
    
    uint256 constant IC9x = 16024755913026090951219359136165462191739988442427278676451538567267744291464;
    uint256 constant IC9y = 20802567050859860057316119042398137468942655655798498242691068940671612035211;
    
    uint256 constant IC10x = 1219382847240838116162792550101408964818043598567296969535793993052812815067;
    uint256 constant IC10y = 9595916523467922091770110764239931866867861123282364147919654344195956824821;
    
    uint256 constant IC11x = 10133822142798194507345248622856101994868537307121939252389265078702626270832;
    uint256 constant IC11y = 17490934387218412805574507994480105256137513329787770675634120213008993828800;
    
    uint256 constant IC12x = 12423803082555398344191860782911430366562378463217583909223199687901894875310;
    uint256 constant IC12y = 19961779733282343687717081828068130967988260870618109700860481118177984305469;
    
    uint256 constant IC13x = 4253064613541184844804387426462436107955502960360770771370520999340996782136;
    uint256 constant IC13y = 11803275363206247505939856991219749327573206401406244830825630078766960985065;
    
    uint256 constant IC14x = 20991743645575511347020658403162414979855232524485183657249175986815508178615;
    uint256 constant IC14y = 4704258378101109842471247806327544009538092787351135628727565548141123770259;
    
    uint256 constant IC15x = 21257739197313281170626847634070354106781526204288549434301017077100565230167;
    uint256 constant IC15y = 407455615451836953737939388661777242382375336538850679894408484611958885734;
    
    uint256 constant IC16x = 16555422483363096453757737067089174801205738629757435373503402272032530442993;
    uint256 constant IC16y = 17379528867335676427401842582204297472660221132861391048205792402041288221254;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[16] calldata _pubSignals) public view returns (bool) {
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
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                

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
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
