import "./App.css";
import { Routes, Route } from "react-router-dom";
import ToImagePage from "./pages/ToImage";
import ToQrPage from "./pages/ToQr";
import TopPage from "./pages/Top";
import ToCCCPage from "./pages/ToCCC";
import ToImageFromCCC from "./pages/ToImageFromCCC";
import ColorListPage from "./pages/ColorList";
import ToCQrPage from "./pages/ToCQr";
import FromCQrPage from "./pages/fromCQr";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/to-qr" element={<ToQrPage />} />
        <Route path="/to-image" element={<ToImagePage />} />
        <Route path="/to-ccc" element={<ToCCCPage />} />
        <Route path="/to-image-from-ccc" element={<ToImageFromCCC />} />
        <Route path="/color-list" element={<ColorListPage />} />
        <Route path="/to-cqr" element={<ToCQrPage />} />
        <Route path="/to-image-from-cqr" element={<FromCQrPage />} />
      </Routes>
    </div>
  );
}

export default App;
