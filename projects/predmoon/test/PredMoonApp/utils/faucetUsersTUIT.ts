import { getVaultByKey } from '../../TokenUnlocker/utils/getVaultByKey'

const scope = getNameForTag(__dirname, __filename)
const theDebug = require('debug')(scope)
export const faucetUsersTUIT = async amount => {
    const tuit = await getContractWithSignerKey('TuringToken', 'nobody')
    const facet = await getFacetWithSignerKey('TokenUnlockerApp', 'VaultFacet', 'vaultRoleB')
    const users = await getUnnamedAccounts();
    const userCount = Math.min(users.length, 100); // Dynamic check of number of users
    theDebug(`Fauceting TUIT to ${userCount} users (available: ${users.length})`);
    
    let nonce = 0
    amount = parseEther(amount.toString())

    for (let i = 0; i < userCount; i++) {
        const user = users[i];
        
        const payoutkey = 'ecosystemDevelopment'
        const operator = await getSignerByKey(payoutkey)
        const { vaultId } = getVaultByKey(payoutkey)

        const vaultInfo = await facet.getVault(vaultId)
        theDebug(`vaultId: ${vaultId}, vaultInfo: ${vaultInfo}, balance: ${formatEther(vaultInfo.balance)}, payout amount: ${amount}`)
        
        const reason = `payout to ${user} with ${amount}`
        nonce += 1
        const typeData = getConfig('TYPEHASH_PAYOUT')

        const data = {
            vaultId,
            to: user,
            amount,
            reason,
            nonce
        }
        const opSig = await signEIP712Data('TokenUnlockerApp', typeData, data, operator)
        const tx = await facet.payoutToken(vaultId, user, amount, reason, nonce, opSig)
        await tx.wait()

        const balance = await tuit.balanceOf(user);
        theDebug(`TuringToken users[${i}] ${user} balance`, balance.toString());
    }
}