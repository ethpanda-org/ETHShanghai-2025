import BaseLogo from 'assets/img/ps4s5d6fm99ifsz77h46jzjfeub6fwvvx72e066494-ca7b-4276-8dfe-7a42133585cb.png';
import ArbitrumLogo from "assets/img/arbitrum.png";
import LineaLogo from "assets/img/psg4d5mewztj9ozzzn7rtpfxy7uw1mtf3f83fbb1e-8fbe-4e57-a592-f5a10a1f3854.png";
import ScrollLogo from "assets/img/pso97ueyjtggrumkhjsquwzqatkwrovm1r4507628a-82fc-4ed8-946a-f8df84e17bd7.png";
import PolygonZkEVMLogo from "assets/img/psykqbapek58ne53fg1q76jdra04ceq3ps278a6d5b-a9b4-4de0-9e1a-a6c90b0ab368.png";
import ZkSyncEraLogo from "assets/img/psvz1n028lq79t5r0dd0mj42qr3yzrwye41bff4a25-fb8c-4821-8f55-e120c52e7ede.png";
import OptimismLogo from "assets/img/psg2a8qcotevj9umprg5ml5koj26bkrjke63142aa7-8972-4c95-a237-92ff0d458d8c.png";
import B2NetworkLogo from "assets/img/b2network.png";
import BobLogo from "assets/img/bob.png";
import MerlinLogo from "assets/img/merlin.png";
import BevmLogo from "assets/img/bevm.png";
import BitlayerLogo from "assets/img/bitlayer.png";

// "Base": { chainId: 8453, idCode: 9021, testIdCode: 9521, label: "Base",  logo: BaseLogo},
// "Arbitrum": { chainId: 42161, idCode: 9002, testIdCode: 9022, label: "Arbitrum",  logo: ArbitrumLogo},
// "Linea": { chainId: 59144, idCode: 9023, testIdCode: 9523, label: "Linea",  logo: LineaLogo},
// "Scroll": { chainId: 534352, idCode: 9019, testIdCode: 9519, label: "Scroll",  logo: ScrollLogo},
// "Polygon zkEVM": { chainId: 1101, idCode: 9017, testIdCode: 9517, label: "Polygon zkEVM",  logo: PolygonZkEVMLogo},
// "ZkSync Era": { chainId: 324, idCode: 9014, testIdCode: 9514, label: "ZkSync Era",  logo: ZkSyncEraLogo},
// "Optimism": { chainId: 10, idCode: 9007, testIdCode: 9077, label: "Optimism",  logo: OptimismLogo},
// "Vizing": { chainId: 28518, idCode: 9061, testIdCode: 9561, label: "Vizing",  logo: VizingLogo},

export const chainOptionsTestnet = {
    "BEVM Testnet": { chainId: 11503, idCode: 9555, label: "Bevm Testnet",  logo: BevmLogo, isTestnet: true},
    "Bitlayer Testnet": { chainId: 200810, idCode: 9559, label: "Bitlayer Testnet",  logo: BitlayerLogo, isTestnet: true},
};

export const chainOptions = {
    "B2 Network": { chainId: 223, idCode: 9046, testIdCode: 9546, label: "B2 Network", logo: B2NetworkLogo},
    "Bob": { chainId: 60808, idCode: 9057, testIdCode: 9557, label: "Bob",  logo: BobLogo},
    "Merlin": { chainId: 4200, idCode: 9054, testIdCode: 9554, label: "Merlin",  logo: MerlinLogo},
    "BEVM Mainnet": { chainId: 11501, idCode: 9055, testIdCode: 9555, label: "BEVM",  logo: BevmLogo},
    "Bitlayer": { chainId: 200901, idCode: 9059, testIdCode: 9559, label: "Bitlayer",  logo: BitlayerLogo},
    "Bitlayer Testnet": chainOptionsTestnet['Bitlayer Testnet'],
    "BEVM Testnet": chainOptionsTestnet['BEVM Testnet'],
}

export const idCode2ChainName = {
    9046: 'B2 Network',
    9057: 'Bob',
    9054: 'Merlin',
    9055: 'BEVM Mainnet',
    9059: 'Bitlayer',
    9555: 'BEVM',
    9559: 'Bitlayer',
}

export const obtHost = 'https://testnet-inscr-api.vizing.com';

export const VPBaseURL_Testnet = 'https://testnet-openapi.vizing.com/sdk';
export const VPBaseURL_Mainnet = 'https://openapi.vizing.com/sdk';
export const VPContractAddr_Mainnet = '0x98A78b8E428cb8FBe502747dA0c6D916a0642988';
export const VPContractAddr_Testnet = '0x44530f5c231147b19aa64b17c9ca1b4417cc190d';