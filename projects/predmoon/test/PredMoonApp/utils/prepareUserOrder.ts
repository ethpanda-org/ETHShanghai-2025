import { generateSelfOrderData } from './generateSelfOrderData'

export const prepareUserOrder = async marketId => {
    const StableCoinAddress = await getContractAddress('USDTMock')
    const facet = await getFacetWithSignerKey('PredMoonApp', 'MatchOrderSelfFacet', 'orderMatcher1')
    const users = await getUnnamedAccounts();

    for (let i = 0; i < 7; i++) {
        await permitERC20('USDTMock', users[i], 'PredMoonApp', 'deployer')
        await permitERC20('TuringToken', users[i], 'PredMoonApp', 'deployer')

        const order = await generateSelfOrderData({
            maker: users[i],
            marketId,
            tradeType: 0,
            paymentTokenAmount: _.random(10000, 11000) + '',
            paymentTokenAddress: StableCoinAddress,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            feeTokenAddress: StableCoinAddress,
            fee1RateBps: 100,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: StableCoinAddress,
        })
        const tx = await facet.matchOrderSelf(order)
        await tx.wait()
    }
}