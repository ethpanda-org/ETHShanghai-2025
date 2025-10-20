// 10: [
//   {
//     chainId: "10",
//     name: "Optimism",
//     contracts: {
//       // Hint: config here.
//       OnChainBook: {
//         address: "0x505d9Ae884AC1A7f243152A24E0A1Cbd1d04Cc6C",
const contracts = {
  10: [
    {
      chainId: "10",
      name: "Neo",
      contracts: {
        // Hint: config here.
        OnChainBook: {
          address: "0xc6C800250dc333B07fB4054f8575D8795756F697",

          abi: [
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  internalType: "string",
                  name: "name",
                  type: "string",
                },
                {
                  indexed: false,
                  internalType: "address",
                  name: "author",
                  type: "address",
                },
                {
                  indexed: false,
                  internalType: "string",
                  name: "description",
                  type: "string",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "bodhiId",
                  type: "uint256",
                },
                {
                  indexed: false,
                  internalType: "string[]",
                  name: "fullContentArweaveIds",
                  type: "string[]",
                },
              ],
              name: "BookCreated",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  internalType: "string",
                  name: "description",
                  type: "string",
                },
                {
                  indexed: false,
                  internalType: "string[]",
                  name: "fullContentArweaveIds",
                  type: "string[]",
                },
              ],
              name: "BookUpdated",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  internalType: "address",
                  name: "author",
                  type: "address",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "lineNum",
                  type: "uint256",
                },
                {
                  indexed: false,
                  internalType: "string",
                  name: "referWord",
                  type: "string",
                },
                {
                  indexed: false,
                  internalType: "string",
                  name: "content",
                  type: "string",
                },
                {
                  indexed: false,
                  internalType: "string",
                  name: "timestamp",
                  type: "string",
                },
              ],
              name: "CommentAdded",
              type: "event",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "lineNum",
                  type: "uint256",
                },
                {
                  internalType: "string",
                  name: "referWord",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "content",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "timestamp",
                  type: "string",
                },
              ],
              name: "addComment",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [],
              name: "book",
              outputs: [
                {
                  internalType: "string",
                  name: "name",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "description",
                  type: "string",
                },
                {
                  internalType: "uint256",
                  name: "bodhiId",
                  type: "uint256",
                },
                {
                  internalType: "address",
                  name: "author",
                  type: "address",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "commentCount",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              name: "comments",
              outputs: [
                {
                  internalType: "address",
                  name: "author",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "lineNum",
                  type: "uint256",
                },
                {
                  internalType: "string",
                  name: "referWord",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "content",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "timestamp",
                  type: "string",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "_bodhiId",
                  type: "uint256",
                },
                {
                  internalType: "string",
                  name: "_name",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "_description",
                  type: "string",
                },
                {
                  internalType: "string[]",
                  name: "_fullContentArweaveIds",
                  type: "string[]",
                },
              ],
              name: "createBook",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "string",
                  name: "_description",
                  type: "string",
                },
                {
                  internalType: "string[]",
                  name: "_fullContentArweaveIds",
                  type: "string[]",
                },
              ],
              name: "updateBook",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
        },
      },
    },
  ],
} as const;

export default contracts;
