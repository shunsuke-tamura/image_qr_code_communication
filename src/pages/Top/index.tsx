import { useNavigate } from "react-router-dom";
import "./style.css";

const TopPage = () => {
  const navigate = useNavigate();
  return (
    <div>
      <h1>TopPage</h1>
      <button className="toQr" onClick={() => navigate("/to-qr")}>
        to-qr
      </button>
      <button className="toImage" onClick={() => navigate("/to-image")}>
        to-image
      </button>
    </div>
  );
};
export default TopPage;
