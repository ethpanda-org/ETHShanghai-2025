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
    uint256 constant alphax  = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay  = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1  = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2  = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1  = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2  = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant deltax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant deltay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant deltay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;

    
    uint256 constant IC0x = 2137108280814312240659228164113173205201137139230743587832146722637962616033;
    uint256 constant IC0y = 13928992264094148256757393040654826230199033336866572839829537814137119296172;
    
    uint256 constant IC1x = 7955145743786024429008440066026009058759503580800392638409537709033248659457;
    uint256 constant IC1y = 20986435330262204292284296110582280296403062091528411205263239908875407494810;
    
    uint256 constant IC2x = 16861755615981399688511400202003525184493979410228548167568603807656761844611;
    uint256 constant IC2y = 21354622761070408301410140348935838302993845614705793674151348759495547508078;
    
    uint256 constant IC3x = 6565300803428387594250052036968469302938791340986449164848338966973789816126;
    uint256 constant IC3y = 3823079131814583393750211635392346305396116561447460592218660099899598218982;
    
    uint256 constant IC4x = 10081755001447939662995396465889121436790659756183257465180201281682740594411;
    uint256 constant IC4y = 7309221741201935560626077854723489634002053638423693291361377741004555739062;
    
    uint256 constant IC5x = 13409026065024708256392698319453890551107462922016565271448549796865715373899;
    uint256 constant IC5y = 14555987313117978195267721867776354944540977340627428802883803388273903355267;
    
    uint256 constant IC6x = 13992189637573079831516121952621572507108993631109500627279903019067239800108;
    uint256 constant IC6y = 114185741416016148645108868147689672486969550858836727117448247653341514655;
    
    uint256 constant IC7x = 2028562691098536958395168398680035624010992987023969398259722021027593686580;
    uint256 constant IC7y = 19195828869715729934494885178528078608540677996785198843240564942449768524019;
    
    uint256 constant IC8x = 9924930654186121682277607607759943414159219397532766164525999079713010271781;
    uint256 constant IC8y = 16289299114236917685557709121635792605496967771932857025410856784445132245683;
    
    uint256 constant IC9x = 10210746382092654740713259163943534090774398787393483201406170846929582307533;
    uint256 constant IC9y = 13457114226429768947690892708426088853381088757905985218491378173194835076715;
    
    uint256 constant IC10x = 11374256071373321922182755466604892604409912390151631764802500774804413746033;
    uint256 constant IC10y = 19490803530830036836516201969208995158632691371757356852516632512945240440653;
    
    uint256 constant IC11x = 6923642782111509967447683821406737271181579235494144863507491761781666669055;
    uint256 constant IC11y = 1441952022944581157096564191164535054583530450361195586106959622655877656896;
    
    uint256 constant IC12x = 20216894533210723196161112498932794370041635403292711671520246498458532213825;
    uint256 constant IC12y = 5510902032990788449294877159130690228109312614907247378544040526981548646464;
    
    uint256 constant IC13x = 17518119138775952195306027729934526812798729259345117431828619188031285305910;
    uint256 constant IC13y = 5881961016764867040617651715112543874061193638679598902901389802763379688293;
    
    uint256 constant IC14x = 10241596721199659813937398819594729262532814136101553059691929385785625490108;
    uint256 constant IC14y = 16315519974990106724413214440876518092167254445184032926452383979204839411949;
    
    uint256 constant IC15x = 3429801207634836751125915287752590567322367417461769095472244119333069927738;
    uint256 constant IC15y = 1854894535414967680289783647139831358682812431821630603339472474638757547311;
    
    uint256 constant IC16x = 16602092512942866978822616003712859224676151235476197136725821048503962743392;
    uint256 constant IC16y = 17176049169354554890978665427587742341864852246094992310642371068177108172713;
    
    uint256 constant IC17x = 7275511723142094182339828541456737912561461499703863197175597589119245957346;
    uint256 constant IC17y = 12138837036016588044969029704518288660711318671806180719013601825861675101280;
    
    uint256 constant IC18x = 17045720990024971380354224397037786094881882277715879069332145496470191262762;
    uint256 constant IC18y = 18720753590909212904560921734627287808625169356926181697459167068643709166724;
    
    uint256 constant IC19x = 6649295841874508209882069733397059523845055454582336089638328925181335501786;
    uint256 constant IC19y = 8059372741502417055444857699781302072427526041954739810169680814458290616519;
    
    uint256 constant IC20x = 5340767704327487062714784473258488793792988861321847737233215801483549438661;
    uint256 constant IC20y = 6470975242995797289025784141857074591447738963774742547102567974847359422328;
    
    uint256 constant IC21x = 3195364539660848508077499049904391341327937451840510438281076019588848351575;
    uint256 constant IC21y = 17557120003779697418965169059292721142788230406906766767195816040003449129336;
    
    uint256 constant IC22x = 4792620856892518661619745222473921718205081050899179521281278387429476870093;
    uint256 constant IC22y = 3256340414465107794167367068957080065600726774343622911874540933287467797525;
    
    uint256 constant IC23x = 21873454555453158971337760256478540295717341032713551640266327335765148582879;
    uint256 constant IC23y = 11413073064302554278341215312851365526424395762272828727709011555620930262753;
    
    uint256 constant IC24x = 2835690273196231621748321219499465966066779806897938639427432272187811497976;
    uint256 constant IC24y = 16596002342633830600006185259921036895790556030940477610786355677126794813211;
    
    uint256 constant IC25x = 7438135689530528576186788163378113758149041430715844270551671976382219871812;
    uint256 constant IC25y = 2855027146899734467336307182521327044073664329515754594768347544140654908579;
    
    uint256 constant IC26x = 14011811868982268856415257636112120535977180931533617041341216212998532191814;
    uint256 constant IC26y = 6648461641033635645793531369897751768540596230865290349694936248451947052646;
    
    uint256 constant IC27x = 12333816601097327540276757777520811186773415970111233594821305286115079639663;
    uint256 constant IC27y = 14988383953891767738733634013988166282497127664189143601431799737048320712904;
    
    uint256 constant IC28x = 20160423366951799188454258075923332771408049720757333294225221588938874932573;
    uint256 constant IC28y = 19272446577030636721088747530817732634573903853468678122829768247144869224254;
    
    uint256 constant IC29x = 20268115340843071945637041085428493849856179511722013662240975771923411462139;
    uint256 constant IC29y = 15389959410484773826823207204055365785165332325977474200491672565430501618576;
    
    uint256 constant IC30x = 8307743515417540038435269032444214783350913328723860795350725779296594323629;
    uint256 constant IC30y = 11748044307159733382084954649985504284454884557411510978876232466567828438795;
    
    uint256 constant IC31x = 2536128780549197544739360040843063099092099153287047552680479081153635522243;
    uint256 constant IC31y = 3302122725015950068440392630266233674219503434917580546027789920266552135992;
    
    uint256 constant IC32x = 10591515782794229393905522139744620305643135153770274405630011022923568225051;
    uint256 constant IC32y = 5913237467357809722907710875888628270342217527722221713550343301432782026497;
    
    uint256 constant IC33x = 11830854790765613923149565885492500257896308975386104957139062948984975535917;
    uint256 constant IC33y = 17485929381769491565190062550818942302451655048229383846610456860770902990442;
    
    uint256 constant IC34x = 6674603446495187590701629235469495478208789332210759869124470561935176984836;
    uint256 constant IC34y = 9120739545820935494493786815919752131052379670774578334746379011475929219758;
    
    uint256 constant IC35x = 7962643463833937914189675308498353073508401230447111159070855158505109611833;
    uint256 constant IC35y = 21672562778758705769860214600369805848196455045546152356388301756309088564421;
    
    uint256 constant IC36x = 3574519409203218740749310538649673536713464688566592445027814626601779402523;
    uint256 constant IC36y = 16739615259114308360067034201586750885087838808787287479339290816132412906403;
    
    uint256 constant IC37x = 20182687102137839433438783646302897314640925820553224390023090793380832869298;
    uint256 constant IC37y = 17223051133930186672986075960746823551306670667394406693920984004780217728271;
    
    uint256 constant IC38x = 20595987364208306726250830898987453809562891536194303265150684813564084153014;
    uint256 constant IC38y = 21372932133370731998579935694336910425394038810940009171693062949328301352031;
    
    uint256 constant IC39x = 11832636791336369627686439448723766938951501881951337068877505130168401030382;
    uint256 constant IC39y = 18566103203478188513172158783590535986931682855878458781977242601009253108918;
    
    uint256 constant IC40x = 2846279026571468691388850903123672205920275125583815060599931218159727242245;
    uint256 constant IC40y = 13048997143822168493556707748071033605589874743596401102515908498837776882417;
    
    uint256 constant IC41x = 20698964771989532764640634567297173933505705046743634172130781739940691311880;
    uint256 constant IC41y = 6196343075135525447453518240595452929928159816104213685526903036846683900280;
    
    uint256 constant IC42x = 15103238396662731042383858943168254949768121211148849972330677950725289902039;
    uint256 constant IC42y = 13844502820725561156051996407346770173130451024434856271459102923868437937819;
    
    uint256 constant IC43x = 13550150907253413803952245885246452891601624638798022872359198799653502906695;
    uint256 constant IC43y = 12102398920448957429627352376620976969581066779132532033194023848810653413697;
    
    uint256 constant IC44x = 12559841338847038667368253974399023295087857627551071435435256081865538718805;
    uint256 constant IC44y = 5966182147602496906469197604095226794025798488140814643427920827853532049891;
    
    uint256 constant IC45x = 9328357314230738882613324942057159757754603220687029200623582530296207645881;
    uint256 constant IC45y = 956959427542229919961952128839365880785086559149378313632336020517066473990;
    
    uint256 constant IC46x = 19762273940530880303988429700901939136272733668097488876321721231333892806626;
    uint256 constant IC46y = 17550493192216508046766208227636353013098300059576685382356344349024785242494;
    
    uint256 constant IC47x = 6308633518989106560163201964858313734666171802425595046746258724553167596742;
    uint256 constant IC47y = 17744778722868312821495585543275424477716633792193424857823900511639887081554;
    
    uint256 constant IC48x = 6065492799373533774762309956664972709490544682849955779483252988036707201213;
    uint256 constant IC48y = 1326704278053342475096886644336172910747727479404404102846846707262636360462;
    
    uint256 constant IC49x = 6811134476227998403275959001884492440393999105525070048461077101604584792893;
    uint256 constant IC49y = 18121064802100060415626250073036691574065194279349040466589894268733706407232;
    
    uint256 constant IC50x = 8522386618790004172884815462675875127690574977340222079657400939163240496627;
    uint256 constant IC50y = 16802788211588310086297204875926309658338117191962726314453740479572918502108;
    
    uint256 constant IC51x = 4792165514554789648771629224074281846201545059880554143677245641998105327979;
    uint256 constant IC51y = 13932308567670500762968764017329293164131499851540338447545217189230801231169;
    
    uint256 constant IC52x = 21808543157732325795998765283511003654207668561045445497790958925437809181550;
    uint256 constant IC52y = 8512549786398554970087404297952413397807723947355788879756112426199510049546;
    
    uint256 constant IC53x = 8898779778444935066469930334316448273505173762497394570326823863604209581580;
    uint256 constant IC53y = 15388398681036716003371636096575299707867870599238946877994683131442659032235;
    
    uint256 constant IC54x = 13834379116966992112748278007938757891700889431835797436228580540146764632371;
    uint256 constant IC54y = 2615686988527601454933960105657071009528561156549591738983035489718123140184;
    
    uint256 constant IC55x = 3671788971930699941588761866384052158423480072981744764199976864914601851710;
    uint256 constant IC55y = 1725420048212272401127426389400414854253809054269876955575352190808940056109;
    
    uint256 constant IC56x = 233068896420770916600431153710107477781366021782960071201687963170655276887;
    uint256 constant IC56y = 18348450836017864191497687842667898529998162563472615971850626046704237970404;
    
    uint256 constant IC57x = 51904320382653731529129446631126999077751100638933817476280399430291289395;
    uint256 constant IC57y = 13699935528321465936486119075314065291867995530350442564349216835401855602750;
    
    uint256 constant IC58x = 18890823141901769047124897043705677873225015537993590179229928849441982997006;
    uint256 constant IC58y = 15207301845792704669230397557135216174606209876377938072070870648518917828928;
    
    uint256 constant IC59x = 15048675721486316010489882386663286403761821303410039221308821741693827984882;
    uint256 constant IC59y = 10986784930670995176801927764946376778537615410831789831969678297915139812785;
    
    uint256 constant IC60x = 7700679383079230955337303379194128444163417566733537832174891411858409656303;
    uint256 constant IC60y = 14952954142445839928172501456123403471157444103409339753635992709611861125770;
    
    uint256 constant IC61x = 5359902135818126371773624947164138394227864264686351594908227363907038164949;
    uint256 constant IC61y = 2217097249609211186853637510137818773371910249752586705319292485610868810091;
    
    uint256 constant IC62x = 14404890893516481750474141271239344350309838381223202003405987822376762202468;
    uint256 constant IC62y = 16399030943804032303124653764648644190806482268654541035919882533382816044875;
    
    uint256 constant IC63x = 6804972236664927005309641877527313997126475792732190506281007587097180408740;
    uint256 constant IC63y = 18057625331785178885595889799267832074700190454603155284097150613364918141839;
    
    uint256 constant IC64x = 13903758788027880545858629785551326879000542431357047097078572212888562228848;
    uint256 constant IC64y = 17178852648840523127475693829565383273659584188071241574222743251389512913188;
    
    uint256 constant IC65x = 11102407123668854749594906684075356911716211519376109504270915585256524919395;
    uint256 constant IC65y = 17696493812995772383323128254692066091541253921433571763456750960035467645976;
    
    uint256 constant IC66x = 8983837718042522260297648301648066577948445087482124630008866950022036694230;
    uint256 constant IC66y = 18231908786559944403521806910730807398844460320520173277920506252277426873269;
    
    uint256 constant IC67x = 15106740664721816513401316708256654335199302670967187564299673289119545378038;
    uint256 constant IC67y = 1877316433401879208701459433662450356572759303685403777551175575587880098022;
    
    uint256 constant IC68x = 4673084682080896982022651732987177974250147855695966073116310377746146920891;
    uint256 constant IC68y = 7236340535072254584998988598590039172296129902287622273723863074679046946359;
    
    uint256 constant IC69x = 11337187260178143581060588597575601059129984014670573143819360849962745897773;
    uint256 constant IC69y = 1655381005723211652060366692762750752443782880689519333978930878221111627556;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[69] calldata _pubSignals) public view returns (bool) {
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
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                
                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))
                
                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))
                
                g1_mulAccC(_pVk, IC24x, IC24y, calldataload(add(pubSignals, 736)))
                
                g1_mulAccC(_pVk, IC25x, IC25y, calldataload(add(pubSignals, 768)))
                
                g1_mulAccC(_pVk, IC26x, IC26y, calldataload(add(pubSignals, 800)))
                
                g1_mulAccC(_pVk, IC27x, IC27y, calldataload(add(pubSignals, 832)))
                
                g1_mulAccC(_pVk, IC28x, IC28y, calldataload(add(pubSignals, 864)))
                
                g1_mulAccC(_pVk, IC29x, IC29y, calldataload(add(pubSignals, 896)))
                
                g1_mulAccC(_pVk, IC30x, IC30y, calldataload(add(pubSignals, 928)))
                
                g1_mulAccC(_pVk, IC31x, IC31y, calldataload(add(pubSignals, 960)))
                
                g1_mulAccC(_pVk, IC32x, IC32y, calldataload(add(pubSignals, 992)))
                
                g1_mulAccC(_pVk, IC33x, IC33y, calldataload(add(pubSignals, 1024)))
                
                g1_mulAccC(_pVk, IC34x, IC34y, calldataload(add(pubSignals, 1056)))
                
                g1_mulAccC(_pVk, IC35x, IC35y, calldataload(add(pubSignals, 1088)))
                
                g1_mulAccC(_pVk, IC36x, IC36y, calldataload(add(pubSignals, 1120)))
                
                g1_mulAccC(_pVk, IC37x, IC37y, calldataload(add(pubSignals, 1152)))
                
                g1_mulAccC(_pVk, IC38x, IC38y, calldataload(add(pubSignals, 1184)))
                
                g1_mulAccC(_pVk, IC39x, IC39y, calldataload(add(pubSignals, 1216)))
                
                g1_mulAccC(_pVk, IC40x, IC40y, calldataload(add(pubSignals, 1248)))
                
                g1_mulAccC(_pVk, IC41x, IC41y, calldataload(add(pubSignals, 1280)))
                
                g1_mulAccC(_pVk, IC42x, IC42y, calldataload(add(pubSignals, 1312)))
                
                g1_mulAccC(_pVk, IC43x, IC43y, calldataload(add(pubSignals, 1344)))
                
                g1_mulAccC(_pVk, IC44x, IC44y, calldataload(add(pubSignals, 1376)))
                
                g1_mulAccC(_pVk, IC45x, IC45y, calldataload(add(pubSignals, 1408)))
                
                g1_mulAccC(_pVk, IC46x, IC46y, calldataload(add(pubSignals, 1440)))
                
                g1_mulAccC(_pVk, IC47x, IC47y, calldataload(add(pubSignals, 1472)))
                
                g1_mulAccC(_pVk, IC48x, IC48y, calldataload(add(pubSignals, 1504)))
                
                g1_mulAccC(_pVk, IC49x, IC49y, calldataload(add(pubSignals, 1536)))
                
                g1_mulAccC(_pVk, IC50x, IC50y, calldataload(add(pubSignals, 1568)))
                
                g1_mulAccC(_pVk, IC51x, IC51y, calldataload(add(pubSignals, 1600)))
                
                g1_mulAccC(_pVk, IC52x, IC52y, calldataload(add(pubSignals, 1632)))
                
                g1_mulAccC(_pVk, IC53x, IC53y, calldataload(add(pubSignals, 1664)))
                
                g1_mulAccC(_pVk, IC54x, IC54y, calldataload(add(pubSignals, 1696)))
                
                g1_mulAccC(_pVk, IC55x, IC55y, calldataload(add(pubSignals, 1728)))
                
                g1_mulAccC(_pVk, IC56x, IC56y, calldataload(add(pubSignals, 1760)))
                
                g1_mulAccC(_pVk, IC57x, IC57y, calldataload(add(pubSignals, 1792)))
                
                g1_mulAccC(_pVk, IC58x, IC58y, calldataload(add(pubSignals, 1824)))
                
                g1_mulAccC(_pVk, IC59x, IC59y, calldataload(add(pubSignals, 1856)))
                
                g1_mulAccC(_pVk, IC60x, IC60y, calldataload(add(pubSignals, 1888)))
                
                g1_mulAccC(_pVk, IC61x, IC61y, calldataload(add(pubSignals, 1920)))
                
                g1_mulAccC(_pVk, IC62x, IC62y, calldataload(add(pubSignals, 1952)))
                
                g1_mulAccC(_pVk, IC63x, IC63y, calldataload(add(pubSignals, 1984)))
                
                g1_mulAccC(_pVk, IC64x, IC64y, calldataload(add(pubSignals, 2016)))
                
                g1_mulAccC(_pVk, IC65x, IC65y, calldataload(add(pubSignals, 2048)))
                
                g1_mulAccC(_pVk, IC66x, IC66y, calldataload(add(pubSignals, 2080)))
                
                g1_mulAccC(_pVk, IC67x, IC67y, calldataload(add(pubSignals, 2112)))
                
                g1_mulAccC(_pVk, IC68x, IC68y, calldataload(add(pubSignals, 2144)))
                
                g1_mulAccC(_pVk, IC69x, IC69y, calldataload(add(pubSignals, 2176)))
                

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
            
            checkField(calldataload(add(_pubSignals, 512)))
            
            checkField(calldataload(add(_pubSignals, 544)))
            
            checkField(calldataload(add(_pubSignals, 576)))
            
            checkField(calldataload(add(_pubSignals, 608)))
            
            checkField(calldataload(add(_pubSignals, 640)))
            
            checkField(calldataload(add(_pubSignals, 672)))
            
            checkField(calldataload(add(_pubSignals, 704)))
            
            checkField(calldataload(add(_pubSignals, 736)))
            
            checkField(calldataload(add(_pubSignals, 768)))
            
            checkField(calldataload(add(_pubSignals, 800)))
            
            checkField(calldataload(add(_pubSignals, 832)))
            
            checkField(calldataload(add(_pubSignals, 864)))
            
            checkField(calldataload(add(_pubSignals, 896)))
            
            checkField(calldataload(add(_pubSignals, 928)))
            
            checkField(calldataload(add(_pubSignals, 960)))
            
            checkField(calldataload(add(_pubSignals, 992)))
            
            checkField(calldataload(add(_pubSignals, 1024)))
            
            checkField(calldataload(add(_pubSignals, 1056)))
            
            checkField(calldataload(add(_pubSignals, 1088)))
            
            checkField(calldataload(add(_pubSignals, 1120)))
            
            checkField(calldataload(add(_pubSignals, 1152)))
            
            checkField(calldataload(add(_pubSignals, 1184)))
            
            checkField(calldataload(add(_pubSignals, 1216)))
            
            checkField(calldataload(add(_pubSignals, 1248)))
            
            checkField(calldataload(add(_pubSignals, 1280)))
            
            checkField(calldataload(add(_pubSignals, 1312)))
            
            checkField(calldataload(add(_pubSignals, 1344)))
            
            checkField(calldataload(add(_pubSignals, 1376)))
            
            checkField(calldataload(add(_pubSignals, 1408)))
            
            checkField(calldataload(add(_pubSignals, 1440)))
            
            checkField(calldataload(add(_pubSignals, 1472)))
            
            checkField(calldataload(add(_pubSignals, 1504)))
            
            checkField(calldataload(add(_pubSignals, 1536)))
            
            checkField(calldataload(add(_pubSignals, 1568)))
            
            checkField(calldataload(add(_pubSignals, 1600)))
            
            checkField(calldataload(add(_pubSignals, 1632)))
            
            checkField(calldataload(add(_pubSignals, 1664)))
            
            checkField(calldataload(add(_pubSignals, 1696)))
            
            checkField(calldataload(add(_pubSignals, 1728)))
            
            checkField(calldataload(add(_pubSignals, 1760)))
            
            checkField(calldataload(add(_pubSignals, 1792)))
            
            checkField(calldataload(add(_pubSignals, 1824)))
            
            checkField(calldataload(add(_pubSignals, 1856)))
            
            checkField(calldataload(add(_pubSignals, 1888)))
            
            checkField(calldataload(add(_pubSignals, 1920)))
            
            checkField(calldataload(add(_pubSignals, 1952)))
            
            checkField(calldataload(add(_pubSignals, 1984)))
            
            checkField(calldataload(add(_pubSignals, 2016)))
            
            checkField(calldataload(add(_pubSignals, 2048)))
            
            checkField(calldataload(add(_pubSignals, 2080)))
            
            checkField(calldataload(add(_pubSignals, 2112)))
            
            checkField(calldataload(add(_pubSignals, 2144)))
            
            checkField(calldataload(add(_pubSignals, 2176)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
