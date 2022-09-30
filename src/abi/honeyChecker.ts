export const honeyCheckerAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'targetTokenAddress',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'idexRouterAddres',
        type: 'address',
      },
    ],
    name: 'honeyCheck',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'buyResult',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'tokenBalance2',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'sellResult',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'buyCost',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'sellCost',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'expectedAmount',
            type: 'uint256',
          },
        ],
        internalType: 'struct honeyCheckerV5.HoneyResponse',
        name: 'response',
        type: 'tuple',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'router',
    outputs: [
      {
        internalType: 'contract IDEXRouter',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
