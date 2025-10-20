
import Web3ModalProvider from "./context";
import ConnectButton from "./ConnectButton";

function Wallet() {
  return (
    <Web3ModalProvider>
      <div className="app">
        <div className="absolute top-4 right-10 p-4">
          <ConnectButton />
        </div>
      </div>
    </Web3ModalProvider>
  );
}

export default Wallet;