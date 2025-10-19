import initData from './utils/initData'
const scope = getNameForTag(__dirname, __filename)
const theDebug = require('debug')(scope)
describe(scope, () => {
    let marketId = ''
    before(async () => {
        const rz = await initData()
        marketId = rz.marketId
    });

    step('should make profit distribution successed', async () => {
        const facet = await getFacetWithSignerKey('PredMoonApp', 'AdminFacet', 'adminRoleB')
        const stableCoinAddress = await getContractAddress('USDTMock')
        const feeTokenInfo = await facet.getFeeTokenInfo(stableCoinAddress)
        debugObject(theDebug, { feeTokenInfo })
        const vaultAmount = feeTokenInfo.vaultAmount
        const dateString = getDateString()
        const brokerageAmount = vaultAmount.mul(60).div(100)
        const revenueAmount = vaultAmount.mul(40).div(100)
        const rewardFeeAmount = parseUnits('0', 6)
        const details = [true, brokerageAmount, revenueAmount, revenueAmount * 40 / 100, revenueAmount * 30 / 100, revenueAmount * 20 / 100, revenueAmount * 10 / 100, rewardFeeAmount]
  
        await expect(facet.profitDistribution(dateString, stableCoinAddress, brokerageAmount, revenueAmount, rewardFeeAmount))
            .to.emit(facet, "ProfitDistribution")
            .withArgs(dateString, stableCoinAddress, details);
        
        const feeTokenInfo2 = await facet.getFeeTokenInfo(stableCoinAddress)
        expect(feeTokenInfo2.profitDistributedAmount).to.equal(vaultAmount)
    })
});