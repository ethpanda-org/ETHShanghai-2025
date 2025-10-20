export const prepareMarket = async marketId => {
    const facet = await getFacetWithSignerKey('PredMoonApp', 'MarketManagerFacet', 'marketManagerRoleB')
    await facet.createMarket(marketId)
}