const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    // Connect to Optimism Sepolia
    const provider = new ethers.providers.JsonRpcProvider('https://sepolia.optimism.io');

    // Your owner wallet with funds to register oracles
    const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY || '0x61dcb63f74339a017d6e4cdca1fcc64461fd13b3aab2c840510b57845375f715';
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);

    console.log('Owner wallet:', ownerWallet.address);

    // Contract details
    const contractAddress = '0x1D323b80710c1d0c833B920CB7Ace09c49e237d7';

    // Use basic ABI to authorize oracles
    const contractABI = [
        {
            "inputs": [{"name": "oracle", "type": "address"}],
            "name": "authorizeOracle",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "", "type": "address"}],
            "name": "authorizedOracles",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, ownerWallet);

    // New oracle addresses to register
    const newOracles = [
        '0x803e34F17d4f8edacECEB19299361A1e96FA97f7', // Node 2 new address
        '0x99f8C4e03181022125CAB1A9929Ab44027AD276a'  // Node 3 new address
    ];

    try {
        // Check contract owner
        const owner = await contract.owner();
        console.log('Contract owner:', owner);

        if (owner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
            console.error('❌ Error: Wallet is not the owner of the contract');
            console.error('   Owner wallet should be:', owner);
            process.exit(1);
        }

        // Register each oracle
        for (const oracleAddress of newOracles) {
            // Check if already registered
            const isRegistered = await contract.authorizedOracles(oracleAddress);

            if (isRegistered) {
                console.log(`✅ Oracle ${oracleAddress} is already registered`);
            } else {
                console.log(`📝 Registering oracle ${oracleAddress}...`);

                const tx = await contract.authorizeOracle(oracleAddress, {
                    gasLimit: 200000
                });

                console.log(`   Transaction sent: ${tx.hash}`);
                await tx.wait();
                console.log(`   ✅ Oracle registered successfully!`);
            }
        }

        console.log('\n✨ All oracles are registered!');

        // Verify all oracles
        console.log('\n📋 Verifying oracle statuses:');
        const allOracles = [
            '0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c', // Node 1 (existing)
            ...newOracles
        ];

        for (const oracle of allOracles) {
            const isAuthorized = await contract.authorizedOracles(oracle);
            console.log(`   ${oracle}: ${isAuthorized ? '✅ Authorized' : '❌ Not authorized'}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.reason) console.error('Reason:', error.reason);
        if (error.data) console.error('Data:', error.data);
    }
}

main().catch(console.error);