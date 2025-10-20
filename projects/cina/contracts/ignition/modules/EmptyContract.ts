import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import { ZeroAddress } from "ethers";

export default buildModule("EmptyContract", (m) => {
  const deployed = m.getParameter("deployed", ZeroAddress);
  if (deployed === ZeroAddress) {
    const EmptyContract = m.contract("EmptyContract", []);
    return { EmptyContract };
  } else {
    const EmptyContract = m.contractAt("EmptyContract", deployed);
    return { EmptyContract };
  }
});
