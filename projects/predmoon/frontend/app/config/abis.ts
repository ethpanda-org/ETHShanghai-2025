export const abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'supply', type: 'uint256' }],
  },
]

export const erc20Abi = [
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
]

export const usdtAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint32",
        "name": "destinationDomain",
        "type": "uint32"
      },
      {
        "internalType": "bytes32",
        "name": "mintRecipient",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "burnToken",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "destinationCaller",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "maxFee",
        "type": "uint256"
      },
      {
        "internalType": "uint32",
        "name": "minFinalityThreshold",
        "type": "uint32"
      }
    ],
    "name": "depositForBurn",
    "outputs": [
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "type": "function",
    "name": "receiveMessage",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "internalType": "bytes",
        "name": "message",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "attestation",
        "type": "bytes"
      },
    ],
    "outputs": [],
  },
]

export const market =
  [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "nonces",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "target",
          "type": "address"
        }
      ],
      "name": "AddressEmptyCode",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "CallerIsNotAuthorized",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "CallerIsNotOwner",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "DelegateNotAllowed",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "facet",
          "type": "address"
        },
        {
          "internalType": "bytes4",
          "name": "selector",
          "type": "bytes4"
        }
      ],
      "name": "DiamondCut_CannotRemoveFromOtherFacet",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "facet",
          "type": "address"
        }
      ],
      "name": "DiamondCut_FacetIsNotContract",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "DiamondCut_FacetIsZeroAddress",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "selector",
          "type": "bytes4"
        }
      ],
      "name": "DiamondCut_FunctionAlreadyExists",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "selector",
          "type": "bytes4"
        }
      ],
      "name": "DiamondCut_FunctionFromSameFacet",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "DiamondCut_ImmutableFacet",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "DiamondCut_IncorrectFacetCutAction",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "init",
          "type": "address"
        }
      ],
      "name": "DiamondCut_InitIsNotContract",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "selector",
          "type": "bytes4"
        }
      ],
      "name": "DiamondCut_NonExistingFunction",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "facet",
          "type": "address"
        }
      ],
      "name": "DiamondCut_SelectorArrayEmpty",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "DiamondCut_SelectorIsZero",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "EnforcedPause",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ExpectedPause",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "FailedCall",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidInitialization",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotInitializing",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "OnlyDelegate",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "facet",
              "type": "address"
            },
            {
              "internalType": "enum IDiamond.FacetCutAction",
              "name": "action",
              "type": "uint8"
            },
            {
              "internalType": "bytes4[]",
              "name": "selectors",
              "type": "bytes4[]"
            }
          ],
          "indexed": false,
          "internalType": "struct IDiamond.FacetCut[]",
          "name": "facetCuts",
          "type": "tuple[]"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "init",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes",
          "name": "initData",
          "type": "bytes"
        }
      ],
      "name": "DiamondCut",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "version",
          "type": "uint64"
        }
      ],
      "name": "Initialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "DiamondCut_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "facet",
              "type": "address"
            },
            {
              "internalType": "enum IDiamond.FacetCutAction",
              "name": "action",
              "type": "uint8"
            },
            {
              "internalType": "bytes4[]",
              "name": "selectors",
              "type": "bytes4[]"
            }
          ],
          "internalType": "struct IDiamond.FacetCut[]",
          "name": "facetCuts",
          "type": "tuple[]"
        },
        {
          "internalType": "address",
          "name": "init",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "initData",
          "type": "bytes"
        }
      ],
      "name": "diamondCut",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DiamondLoupeFacet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "selector",
          "type": "bytes4"
        }
      ],
      "name": "facetAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "facetAddresses",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "facet",
          "type": "address"
        }
      ],
      "name": "facetFunctionSelectors",
      "outputs": [
        {
          "internalType": "bytes4[]",
          "name": "",
          "type": "bytes4[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "facets",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "facet",
              "type": "address"
            },
            {
              "internalType": "bytes4[]",
              "name": "selectors",
              "type": "bytes4[]"
            }
          ],
          "internalType": "struct IDiamondLoupeBase.Facet[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "AccessControl_CallerIsNotAuthorized",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "AccessControl_CannotRemoveAdmin",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes4",
          "name": "functionSig",
          "type": "bytes4"
        },
        {
          "indexed": true,
          "internalType": "uint8",
          "name": "role",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "enabled",
          "type": "bool"
        }
      ],
      "name": "FunctionAccessChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint8",
          "name": "role",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "enabled",
          "type": "bool"
        }
      ],
      "name": "UserRoleUpdated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "superAdminAddress",
          "type": "address"
        }
      ],
      "name": "AccessControlFacet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "bytes4",
          "name": "functionSig",
          "type": "bytes4"
        }
      ],
      "name": "canCall",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "functionSig",
          "type": "bytes4"
        }
      ],
      "name": "functionRoles",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "uint8",
          "name": "role",
          "type": "uint8"
        }
      ],
      "name": "hasRole",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "role",
          "type": "uint8"
        },
        {
          "internalType": "bytes4",
          "name": "functionSig",
          "type": "bytes4"
        }
      ],
      "name": "roleHasAccess",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "functionSig",
          "type": "bytes4"
        },
        {
          "internalType": "uint8",
          "name": "role",
          "type": "uint8"
        },
        {
          "internalType": "bool",
          "name": "enabled",
          "type": "bool"
        }
      ],
      "name": "setFunctionAccess",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "uint8",
          "name": "role",
          "type": "uint8"
        },
        {
          "internalType": "bool",
          "name": "enabled",
          "type": "bool"
        }
      ],
      "name": "setUserRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address[]",
          "name": "users",
          "type": "address[]"
        },
        {
          "internalType": "uint8[]",
          "name": "roles",
          "type": "uint8[]"
        },
        {
          "internalType": "bool[]",
          "name": "enabledArr",
          "type": "bool[]"
        }
      ],
      "name": "setUserRoleBulk",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "userRoles",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address[]",
          "name": "users",
          "type": "address[]"
        }
      ],
      "name": "userRolesBulk",
      "outputs": [
        {
          "internalType": "bytes32[]",
          "name": "",
          "type": "bytes32[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "Ownable_CallerIsNotOwner",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "Ownable_ZeroAddress",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner_",
          "type": "address"
        }
      ],
      "name": "OwnableFacet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "userAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "signer",
          "type": "address"
        }
      ],
      "name": "VerifySignatureFailed",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "string",
          "name": "eip712Name",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "eip712Version",
          "type": "string"
        }
      ],
      "name": "EIP712ConfigChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "EIP712DomainChanged",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "version",
          "type": "string"
        }
      ],
      "name": "EIP712Facet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "eip712Domain",
      "outputs": [
        {
          "internalType": "bytes1",
          "name": "fields",
          "type": "bytes1"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "version",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "chainId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "verifyingContract",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "salt",
          "type": "bytes32"
        },
        {
          "internalType": "uint256[]",
          "name": "extensions",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "version",
          "type": "string"
        }
      ],
      "name": "setEIP712Config",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "roleA",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "roleC",
          "type": "uint8"
        }
      ],
      "name": "PausableFacet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "context",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "newQuote",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "maxQuote",
          "type": "uint256"
        }
      ],
      "name": "ExceedsMaxTokenTransferOutQuote",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "PayoutTemporarilyDisabled",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newMaxTTOQ",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "MaxTTOQUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "context",
          "type": "string"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newTTOQ",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "TTOQUpdated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "roleA",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "roleC",
          "type": "uint8"
        }
      ],
      "name": "TTOQManagerFacet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "newMaxTTOQ",
          "type": "uint256"
        }
      ],
      "name": "adminSetMaxTTOQ",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "disablePayout",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        }
      ],
      "name": "getMaxTTOQ",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "maxTokenTransferOutQuote",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getPayoutStatus",
      "outputs": [
        {
          "internalType": "bool",
          "name": "isPayoutDisabled",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        }
      ],
      "name": "getUsedTTOQ",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "usedTokenTransferOutQuote",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "superAdminEnablePayout",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "userAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        }
      ],
      "name": "NonceHasBeenUsed",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "userAddress",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        }
      ],
      "name": "NonceUsed",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "userAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        }
      ],
      "name": "isNonceUsed",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "ApprovalForAll",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256[]",
          "name": "ids",
          "type": "uint256[]"
        },
        {
          "indexed": false,
          "internalType": "uint256[]",
          "name": "values",
          "type": "uint256[]"
        }
      ],
      "name": "TransferBatch",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "TransferSingle",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "string",
          "name": "value",
          "type": "string"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "URI",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "baseURI_",
          "type": "string"
        }
      ],
      "name": "ERC1155Facet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account_",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "id_",
          "type": "uint256"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address[]",
          "name": "accounts_",
          "type": "address[]"
        },
        {
          "internalType": "uint256[]",
          "name": "ids_",
          "type": "uint256[]"
        }
      ],
      "name": "balanceOfBatch",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "idx",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account_",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "operator_",
          "type": "address"
        }
      ],
      "name": "isApprovedForAll",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from_",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to_",
          "type": "address"
        },
        {
          "internalType": "uint256[]",
          "name": "ids_",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "amounts_",
          "type": "uint256[]"
        },
        {
          "internalType": "bytes",
          "name": "data_",
          "type": "bytes"
        }
      ],
      "name": "safeBatchTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from_",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to_",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "id_",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amount_",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "data_",
          "type": "bytes"
        }
      ],
      "name": "safeTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator_",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "approved_",
          "type": "bool"
        }
      ],
      "name": "setApprovalForAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id_",
          "type": "uint256"
        }
      ],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenID_",
          "type": "uint256"
        }
      ],
      "name": "uri",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "enum IAppStorage.PayoutType",
          "name": "payoutType",
          "type": "uint8"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "feeTokenAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "FeeTokenPayout",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "feeTokenAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "feeTokenPriceStableCoin",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isEnabled",
          "type": "bool"
        }
      ],
      "name": "FeeTokenUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "dateString",
          "type": "string"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "profitTokenAddress",
          "type": "address"
        },
        {
          "components": [
            {
              "internalType": "bool",
              "name": "isDistributed",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "brokerageAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "revenueAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "liquidity",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "buyBackBurn",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "stakingDividends",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "riskReserve",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "operatingCosts",
              "type": "uint256"
            }
          ],
          "indexed": false,
          "internalType": "struct IAppStorage.ProfitDistributedDetail",
          "name": "detail",
          "type": "tuple"
        }
      ],
      "name": "ProfitDistribution",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "roleA",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "roleB",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "roleC",
          "type": "uint8"
        }
      ],
      "name": "AdminFacet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum IAppStorage.PayoutType",
          "name": "payoutType",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "feeTokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "doPayoutVault",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "val",
          "type": "address"
        }
      ],
      "name": "getFeeTokenInfo",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bool",
              "name": "isEnabled",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "priceStableCoin",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "shouldBurn",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "decimals",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "vaultAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "profitDistributedAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "brokerageVault",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "liquidityFundVault",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "buyBackBurnFundVault",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "stakingDividendsFundVault",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "riskReserveFundVault",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "operatingCostsFundVault",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "totalPayout",
              "type": "uint256"
            }
          ],
          "internalType": "struct IAppStorage.FeeTokenInfo",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "val",
          "type": "address"
        }
      ],
      "name": "getFeeTokenPrice",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "priceStableCoin",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMaxFeeRateBps",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "maxFeeRateBps",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMaxSlippageBps",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "dateString",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "profitTokenAddress",
          "type": "address"
        }
      ],
      "name": "getProfitDistributedDetail",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bool",
              "name": "isDistributed",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "brokerageAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "revenueAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "liquidity",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "buyBackBurn",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "stakingDividends",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "riskReserve",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "operatingCosts",
              "type": "uint256"
            }
          ],
          "internalType": "struct IAppStorage.ProfitDistributedDetail",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "salt",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "maker",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "tokenAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "tokenPriceInPaymentToken",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "paymentTokenAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "slippageBps",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            },
            {
              "internalType": "enum IAppStorage.OrderSide",
              "name": "side",
              "type": "uint8"
            },
            {
              "internalType": "address",
              "name": "feeTokenAddress",
              "type": "address"
            },
            {
              "internalType": "bytes",
              "name": "sig",
              "type": "bytes"
            },
            {
              "internalType": "uint256",
              "name": "exchangeNftAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "paymentTokenAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "fee1Amount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "fee1TokenAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "fee2Amount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "fee2TokenAddress",
              "type": "address"
            }
          ],
          "internalType": "struct IAppStorage.Order",
          "name": "order",
          "type": "tuple"
        }
      ],
      "name": "getRemainingAmount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "val",
          "type": "address"
        }
      ],
      "name": "isValidatePayment",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "dateString",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "profitTokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "brokerageAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "revenueAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "rewardFeeAmount",
          "type": "uint256"
        }
      ],
      "name": "profitDistribution",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "val",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "feeTokenPriceStableCoin",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isEnabled",
          "type": "bool"
        }
      ],
      "name": "setFeeToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "val",
          "type": "uint256"
        }
      ],
      "name": "setMaxFeeRateBps",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "maxSlippageBps",
          "type": "uint256"
        }
      ],
      "name": "setMaxSlippageBps",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "minimumOrderSalt_",
          "type": "uint256"
        }
      ],
      "name": "setMinimumOrderSalt",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "val",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "isEnabled",
          "type": "bool"
        }
      ],
      "name": "setPayment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "val",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "isEnabled",
          "type": "bool"
        }
      ],
      "name": "setShouldBurnFeeToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "feeTokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "feeAmount",
          "type": "uint256"
        }
      ],
      "name": "ChargeFeeFailed",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "enum IAppStorage.OrderSide",
          "name": "side",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "buyerPrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "sellerPrice",
          "type": "uint256"
        }
      ],
      "name": "InvalidBuyerPrice",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "feeTokenAddress",
          "type": "address"
        }
      ],
      "name": "InvalidFeeToken",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "marketIdMaker",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        }
      ],
      "name": "InvalidMarketIdForMaker",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "targetNftId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "orderNftId",
          "type": "uint256"
        }
      ],
      "name": "InvalidNftId",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "minimumOrderSalt",
          "type": "uint256"
        }
      ],
      "name": "InvalidOrderSalt",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "enum IAppStorage.OrderSide",
          "name": "expectSide",
          "type": "uint8"
        },
        {
          "internalType": "enum IAppStorage.OrderSide",
          "name": "orderSide",
          "type": "uint8"
        }
      ],
      "name": "InvalidOrderSide",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "paymentTokenAddress",
          "type": "address"
        }
      ],
      "name": "InvalidPaymentToken",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "orderPrice",
          "type": "uint256"
        }
      ],
      "name": "InvalidPrice",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "sig",
          "type": "bytes"
        },
        {
          "internalType": "address",
          "name": "orderMaker",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "signer",
          "type": "address"
        }
      ],
      "name": "InvalidSignature",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "orderSlippage",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "maxSlippage",
          "type": "uint256"
        }
      ],
      "name": "InvalidSlippage",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "components": [
            {
              "internalType": "address",
              "name": "taker",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "marketId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "takerNftId",
              "type": "uint256"
            },
            {
              "internalType": "enum IOrderMatcherBase.TradeType",
              "name": "tradeType",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "takerNftIdPair",
              "type": "uint256"
            }
          ],
          "internalType": "struct IOrderMatcherBase.OrderMeta",
          "name": "orderMeta",
          "type": "tuple"
        }
      ],
      "name": "InvalidTradeType",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "inputNonce",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        }
      ],
      "name": "InvalidUserWalletWithdrawNonce",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "signer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "fee",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "sig",
          "type": "bytes"
        }
      ],
      "name": "InvalidWithdrawSignature",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "MarketAlreadyExists",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        }
      ],
      "name": "MarketAlreadyFinallized",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        }
      ],
      "name": "MarketIdNotExist",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        }
      ],
      "name": "MarketIsEndedOrBlocked",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        }
      ],
      "name": "MarketNotFinallized",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "available",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "required",
          "type": "uint256"
        }
      ],
      "name": "MarketVaultBalanceInsufficient",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "marketVaultAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "marketWinnerAlreadyPayAmount",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "paymentTokenAddress",
          "type": "address"
        }
      ],
      "name": "MarketVaultNotEnoughForPayReward",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "paymentAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalFee",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "maxFeeRate",
          "type": "uint256"
        }
      ],
      "name": "MaxFeeExceeded",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "MaxMarketReached",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nftAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nftPairAmount",
          "type": "uint256"
        }
      ],
      "name": "MintNFTAmountNotEqual",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "NoNftOwned",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        }
      ],
      "name": "NonceAlreadyUsed",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        }
      ],
      "name": "NotWinningNft",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "orderDeadline",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "currentTimestamp",
          "type": "uint256"
        }
      ],
      "name": "OrderExpired",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "salt",
          "type": "uint256"
        }
      ],
      "name": "OrderFilledOrCancelled",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nftAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "orderRemaining",
          "type": "uint256"
        }
      ],
      "name": "OrderRemainingNotEnough",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "flag",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "enum IAppStorage.OrderSide",
          "name": "orderSide",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "paymentTokenAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalNeedPay",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "slippageBps",
          "type": "uint256"
        }
      ],
      "name": "PaymentTokenAmountOverflow",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "paymentTokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "paymentAmount",
          "type": "uint256"
        }
      ],
      "name": "PaymentTransferFailed",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "RewardAlreadyClaimed",
      "type": "error"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "marketId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nftId",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "user",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "paymentTokenAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "nonce",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "sig",
              "type": "bytes"
            },
            {
              "internalType": "uint256",
              "name": "feeAmount",
              "type": "uint256"
            }
          ],
          "internalType": "struct IOrderMatcherBase.Reward",
          "name": "reward",
          "type": "tuple"
        },
        {
          "internalType": "address",
          "name": "paymentTokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "paymentTokenFeeAmount",
          "type": "uint256"
        }
      ],
      "name": "RewardTransferFailed",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "takerShouldMint",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "takerMint",
          "type": "uint256"
        }
      ],
      "name": "TakerNFTReceivedNotValidate",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "takerShouldSend",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "takerSend",
          "type": "uint256"
        }
      ],
      "name": "TakerNFTSendOutNotValidate",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderSalt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "takerShouldPayOrReceived",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "orderPaymentTokenAmount",
          "type": "uint256"
        }
      ],
      "name": "TakerPaymentNotValidate",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "TransferFailed",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isBlocked",
          "type": "bool"
        }
      ],
      "name": "MarketBlocked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "nftId1",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "nftId2",
          "type": "uint256"
        }
      ],
      "name": "MarketCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "winNftId",
          "type": "uint256"
        }
      ],
      "name": "MarketEnded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "winNftId",
          "type": "uint256"
        }
      ],
      "name": "MarketFinalized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "nftId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "paymentTokenAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "paymentTokenFeeAmount",
          "type": "uint256"
        }
      ],
      "name": "RewardClaimed",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "roleA",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "roleB",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "roleC",
          "type": "uint8"
        }
      ],
      "name": "MarketManagerFacet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        }
      ],
      "name": "blockMarket",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "marketId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nftId",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "user",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "paymentTokenAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "nonce",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "sig",
              "type": "bytes"
            },
            {
              "internalType": "uint256",
              "name": "feeAmount",
              "type": "uint256"
            }
          ],
          "internalType": "struct IOrderMatcherBase.Reward",
          "name": "reward",
          "type": "tuple"
        }
      ],
      "name": "claimReward",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        }
      ],
      "name": "createMarket",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "nftId1",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nftId2",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "winNftId",
          "type": "uint256"
        }
      ],
      "name": "endMarket",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "winNftId",
          "type": "uint256"
        }
      ],
      "name": "finalizeMarket",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "paymentTokenAddress",
          "type": "address"
        }
      ],
      "name": "getMarketInfo",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "marketId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nftId1",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nftId2",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "vaultAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "marketWinnerPayAmount",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "isEnded",
              "type": "bool"
            },
            {
              "internalType": "bool",
              "name": "isBlocked",
              "type": "bool"
            },
            {
              "internalType": "bool",
              "name": "isFinallized",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "winNftId",
              "type": "uint256"
            }
          ],
          "internalType": "struct IOrderMatcherBase.MarketInfo",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        }
      ],
      "name": "unBlockMarket",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "ECDSAInvalidSignature",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "length",
          "type": "uint256"
        }
      ],
      "name": "ECDSAInvalidSignatureLength",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "s",
          "type": "bytes32"
        }
      ],
      "name": "ECDSAInvalidSignatureS",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "roleB",
          "type": "uint8"
        }
      ],
      "name": "MatchOrderSelfFacet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "salt",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "maker",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "marketId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "tradeType",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "paymentTokenAmount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "paymentTokenAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "feeTokenAddress",
              "type": "address"
            },
            {
              "internalType": "bytes",
              "name": "sig",
              "type": "bytes"
            },
            {
              "internalType": "uint256",
              "name": "fee1Amount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "fee1TokenAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "fee2Amount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "fee2TokenAddress",
              "type": "address"
            }
          ],
          "internalType": "struct IMatchOrderSelfBase.OrderSelf",
          "name": "order",
          "type": "tuple"
        }
      ],
      "name": "matchOrderSelf",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "roleB",
          "type": "uint8"
        }
      ],
      "name": "OrderMatcherFacet_init",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "salt",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "maker",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "tokenAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "tokenPriceInPaymentToken",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "paymentTokenAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "slippageBps",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            },
            {
              "internalType": "enum IAppStorage.OrderSide",
              "name": "side",
              "type": "uint8"
            },
            {
              "internalType": "address",
              "name": "feeTokenAddress",
              "type": "address"
            },
            {
              "internalType": "bytes",
              "name": "sig",
              "type": "bytes"
            },
            {
              "internalType": "uint256",
              "name": "exchangeNftAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "paymentTokenAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "fee1Amount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "fee1TokenAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "fee2Amount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "fee2TokenAddress",
              "type": "address"
            }
          ],
          "internalType": "struct IAppStorage.Order",
          "name": "takerOrder",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "salt",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "maker",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "tokenAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "tokenPriceInPaymentToken",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "paymentTokenAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "slippageBps",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            },
            {
              "internalType": "enum IAppStorage.OrderSide",
              "name": "side",
              "type": "uint8"
            },
            {
              "internalType": "address",
              "name": "feeTokenAddress",
              "type": "address"
            },
            {
              "internalType": "bytes",
              "name": "sig",
              "type": "bytes"
            },
            {
              "internalType": "uint256",
              "name": "exchangeNftAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "paymentTokenAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "fee1Amount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "fee1TokenAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "fee2Amount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "fee2TokenAddress",
              "type": "address"
            }
          ],
          "internalType": "struct IAppStorage.Order[]",
          "name": "makerOrders",
          "type": "tuple[]"
        },
        {
          "internalType": "enum IOrderMatcherBase.TradeType",
          "name": "tradeType",
          "type": "uint8"
        }
      ],
      "name": "matchOrder",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]


