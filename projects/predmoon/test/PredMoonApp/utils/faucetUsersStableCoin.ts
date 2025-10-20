const scope = getNameForTag(__dirname, __filename)
const theDebug = require('debug')(scope)
export const faucetUsersStableCoin = async amount => {
    const contract = await getContractWithSignerKey('USDTMock', 'deployer');
    const users = await getUnnamedAccounts();
    const userCount = Math.min(users.length, 100); // Dynamic check of number of users
    theDebug(`Fauceting USDT to ${userCount} users (available: ${users.length})`);
    
    for (let i = 0; i < userCount; i++) {
        const user = users[i];
        const tx = await contract.mint(user, parseUnits(amount + '', 6));
        await tx.wait();
        const balance = await contract.balanceOf(user);
        theDebug(`StableCoinMock users[${i}] ${user} balance`, formatUnits(balance, 6));
    }
}