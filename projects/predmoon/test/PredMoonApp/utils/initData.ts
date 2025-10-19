import { faucetUsersStableCoin } from './faucetUsersStableCoin.ts'
import { faucetUsersTUIT } from './faucetUsersTUIT.ts'
import { prepareMarket } from './prepareMarket.ts'
import { prepareUserOrder } from './prepareUserOrder.ts'
export default createInitData(async ({ deployments }) => {
    await deployments.fixture(['TuringMarket:99_All'])
    const marketId = randomId()

    await faucetUsersStableCoin(10 ** 5);
    await faucetUsersTUIT(10 ** 3);
    await prepareMarket(marketId);
    await prepareUserOrder(marketId);

    return {
        marketId,
    }
})