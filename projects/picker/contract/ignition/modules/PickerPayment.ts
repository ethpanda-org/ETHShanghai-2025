import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PickerPaymentModule", (m) => {
  // 部署PickerPayment合约
  const pickerPayment = m.contract("PickerPayment");

  // 返回部署的合约实例
  return { pickerPayment };
});