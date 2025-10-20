import { Background } from "./components/Background";
import { SwapInterface } from "./components/SwapInterface";
import { TopNav } from "./components/TopNav";

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Background />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopNav />
        <main
          id="swap"
          className="flex flex-1 items-center justify-center px-4 py-12"
        >
          <SwapInterface />
        </main>
      </div>
    </div>
  );
}

export default App;
