import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import SecurityScans from "./pages/SecurityScans";
import Vulnerabilities from "./pages/Vulnerabilities";
import Deployments from "./pages/Deployments";
import Pipelines from "./pages/Pipelines";

function App() {
  return (
    <BrowserRouter>
      <div className="flex bg-slate-950 min-h-screen">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <Navbar />

          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/security-scans" element={<SecurityScans />} />
              <Route path="/vulnerabilities" element={<Vulnerabilities />} />
              <Route path="/deployments" element={<Deployments />} />
              <Route path="/pipelines" element={<Pipelines />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;