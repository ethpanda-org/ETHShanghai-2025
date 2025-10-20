export const buildCircuitInput = (computation) => ({
    commitmentOld: computation.commitmentOld.toString(),
    reserveOld0: computation.stateOld.reserve0.toString(),
    reserveOld1: computation.stateOld.reserve1.toString(),
    nonceOld: computation.stateOld.nonce.toString(),
    feeOld: computation.stateOld.feeBps.toString(),
    feeNew: computation.stateNew.feeBps.toString(),
    amountIn: computation.amountIn.toString(),
    amountOut: computation.amountOut.toString()
});
