import "./App.css";
import { Routes, Route } from "react-router-dom";
import ToImagePage from "./pages/ToImage";
import ToQrPage from "./pages/ToQr";
import TopPage from "./pages/Top";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/to-qr" element={<ToQrPage />} />
        <Route path="/to-image" element={<ToImagePage />} />
      </Routes>
    </div>
  );
}

export default App;
