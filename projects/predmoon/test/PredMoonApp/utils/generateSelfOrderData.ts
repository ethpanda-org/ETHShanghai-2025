export const generateSelfOrderData = async (data: any) => {
    const paymentTokenDecimals = 6;
    const deadline = await ethers.provider.getBlock('latest').then(block => block.timestamp + data.deadlineDelta);
    delete data.deadlineDelta; // remove deadlineDelta from data object, not used in order struct type

    const { maker, marketId, tradeType, paymentTokenAddress, feeTokenAddress, fee1TokenAddress, fee1RateBps, fee2TokenAddress, fee2RateBps } = data;
    const feeFacet = await getFacetWithSignerKey('PredMoonApp', 'AdminFacet', 'nobody')

    const paymentTokenAmount = parseUnits(data.paymentTokenAmount, paymentTokenDecimals)
    let fee1Amount = 0;
    if (fee1TokenAddress !== ethers.constants.AddressZero) {
        const rz = await feeFacet.getFeeTokenInfo(fee1TokenAddress);
        const { priceStableCoin, decimals } = rz;
        // console.log('paymentTokenAmount', paymentTokenAmount);
        // console.log('fee1RateBps', fee1RateBps);
        // console.log('decimals', decimals);
        // fee1Amount = (paymentTokenAmount * fee1RateBps / 10000) * (10 ** decimals) / priceStableCoin;
        fee1Amount = paymentTokenAmount.mul(fee1RateBps).mul((10 ** decimals).toString()).div('10000').div(priceStableCoin);
    }

    let fee2Amount = 0;
    if (fee2TokenAddress !== ethers.constants.AddressZero) {
        const { priceStableCoin, decimals } = await feeFacet.getFeeTokenInfo(fee2TokenAddress);
        fee2Amount = paymentTokenAmount.mul(fee2RateBps).mul((10 ** decimals).toString()).div('10000').div(priceStableCoin);
    }

    let order = {
        salt: randomId(),
        maker,
        marketId,
        tradeType: tradeType as number, // 显式转换为数字
        paymentTokenAmount,
        paymentTokenAddress,
        deadline,
        feeTokenAddress,
    };

    const signer = await ethers.getSigner(data.maker);
    order.sig = await signEIP712Data('PredMoonApp', getConfig('TYPEHASH_ORDER_SELF'), order, signer);

    return {
        ...order,
        fee1Amount,
        fee1TokenAddress,
        fee2Amount,
        fee2TokenAddress,
    }
}