import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ZeroAddress } from "ethers";

export default buildModule("ProxyAdmin", (m) => {
  const fxParam = m.getParameter("Fx", ZeroAddress);
  let fxAdmin: any;
  if (fxParam === ZeroAddress) {
    fxAdmin = m.contract("ProxyAdmin", [], { id: "FxProxyAdmin" });
  } else {
    fxAdmin = m.contractAt("ProxyAdmin", fxParam, { id: "FxProxyAdmin" });
  }

  const customParam = m.getParameter("Custom", ZeroAddress);
  let customAdmin: any;
  if (customParam === ZeroAddress) {
    customAdmin = m.contract("ProxyAdmin", [], { id: "CustomProxyAdmin" });
  } else {
    customAdmin = m.contractAt("ProxyAdmin", customParam, { id: "CustomProxyAdmin" });
  }
  return { fx: fxAdmin, custom: customAdmin };
});
