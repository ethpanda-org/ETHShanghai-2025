import initData from './utils/initData'
import { generateSelfOrderData } from './utils/generateSelfOrderData'
const scope = getNameForTag(__dirname, __filename)
const theDebug = require('debug')(scope)
describe(scope, () => {
    let marketId = ''
    before(async () => {
        const rz = await initData()
        marketId = rz.marketId
        theDebug(`======>>> matchOrderSelf marketId@${marketId}`)
    });

    step(`mintSelf`, async () => {
        const orderMatcher1Address = await getAccountByKey('orderMatcher1')
        const { address: diamondAddress } = await getApp('PredMoonApp')
        const StableCoinAddress = await getContractAddress('USDTMock')

        const facet = await getFacetWithSignerKey('PredMoonApp', 'MatchOrderSelfFacet', 'orderMatcher1')

        const users = await getUnnamedAccounts();
        const order = await generateSelfOrderData({
            maker: users[0],
            marketId,
            tradeType: 0,
            paymentTokenAmount: '100',
            paymentTokenAddress: StableCoinAddress,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            feeTokenAddress: StableCoinAddress,
            fee1RateBps: 100,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: StableCoinAddress,
        })

        const tx = await facet.matchOrderSelf(order)
        const StableCoinContract = await getContractWithSignerKey('USDTMock', 'deployer')
        // usdc 转给交易所
        await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(order.maker, diamondAddress, order.paymentTokenAmount)
        // 收到 exchangeNftAmount 数量的 order.tokenId 的 NFT（由操作员触发 mint 动作）
        await expect(tx).to.emit(facet, 'TransferSingle').withArgs(orderMatcher1Address, ethers.constants.AddressZero, order.maker, 1n, order.paymentTokenAmount)
        await expect(tx).to.emit(facet, 'TransferSingle').withArgs(orderMatcher1Address, ethers.constants.AddressZero, order.maker, 2n, order.paymentTokenAmount)
    })

    step(`mergeSelf`, async () => {
        const orderMatcher1Address = await getAccountByKey('orderMatcher1')
        const { address: diamondAddress } = await getApp('PredMoonApp')

        const facet = await getFacetWithSignerKey('PredMoonApp', 'MatchOrderSelfFacet', 'orderMatcher1')
        const StableCoinAddress = await getContractAddress('USDTMock')

        const users = await getUnnamedAccounts();
        const order = await generateSelfOrderData({
            maker: users[0],
            marketId,
            tradeType: 1,
            paymentTokenAmount: '100',
            paymentTokenAddress: StableCoinAddress,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            feeTokenAddress: StableCoinAddress,
            fee1RateBps: 100,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: StableCoinAddress,
        })

        const tx = await facet.matchOrderSelf(order)

        const StableCoinContract = await getContractWithSignerKey('USDTMock', 'deployer')
        await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(diamondAddress, order.maker, order.paymentTokenAmount)
        await expect(tx).to.emit(facet, 'TransferSingle').withArgs(orderMatcher1Address, order.maker, ethers.constants.AddressZero, 1n, order.paymentTokenAmount)
        await expect(tx).to.emit(facet, 'TransferSingle').withArgs(orderMatcher1Address, order.maker, ethers.constants.AddressZero, 2n, order.paymentTokenAmount)
    })
});