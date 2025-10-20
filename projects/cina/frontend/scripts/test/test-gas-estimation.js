// Simple test script to verify gas estimation
const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');

async function testGasEstimation() {
    const client = createPublicClient({
        chain: sepolia,
        transport: http('https://sepolia.infura.io/v3/726930ebd0e248ff94a8da1ce85ee33a')
    });

    try {
        // Test basic gas estimation
        const blockNumber = await client.getBlockNumber();
        console.log('Connected to Sepolia, latest block:', blockNumber.toString());

        // Test gas estimation for a simple transfer
        const gasEstimate = await client.estimateGas({
            account: '0x5c0fB5a2d503E9EEAb8942A679fb148875e4698A',
            to: '0x5c0fB5a2d503E9EEAb8942A679fb148875e4698A',
            value: 0n,
            data: '0x'
        });

        console.log('Simple transfer gas estimate:', gasEstimate.toString());

        // Check if it's within network limits
        const networkLimit = 16777216n;
        console.log('Network gas limit:', networkLimit.toString());
        console.log('Estimate within limit:', gasEstimate < networkLimit);

    } catch (error) {
        console.error('Gas estimation test failed:', error);
    }
}

testGasEstimation();