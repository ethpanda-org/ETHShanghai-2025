import { Outlet } from "react-router-dom";
import { Navbar } from "./components/navbar";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/15 via-background to-background">
      <Navbar />
      <div className="pb-16">
        <Outlet />
      </div>
    </div>
  );
}

export default App;
