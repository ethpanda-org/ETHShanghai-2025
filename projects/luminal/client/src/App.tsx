import { Background } from "./components/Background";
import { SwapInterface } from "./components/SwapInterface";
import { TopNav } from "./components/TopNav";
import { WithdrawInterface } from "./components/WithdrawInterface";

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Background />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopNav />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="flex w-full max-w-5xl flex-col items-center gap-10">
            <SwapInterface />
            <WithdrawInterface />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
