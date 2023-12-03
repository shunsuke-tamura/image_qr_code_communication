import { useNavigate } from "react-router-dom";
import "./style.css";

const TopPage = () => {
  const navigate = useNavigate();
  return (
    <div>
      <h1>TopPage</h1>
      <button className="primary" onClick={() => navigate("/to-qr")}>
        to-qr
      </button>
      <button className="secondary" onClick={() => navigate("/to-image")}>
        to-image
      </button>
      <br />
      <button className="primary" onClick={() => navigate("/to-ccc")}>
        to-ccc
      </button>
      <button
        className="secondary"
        onClick={() => navigate("/to-image-from-ccc")}
      >
        to-image-from-ccc
      </button>
    </div>
  );
};
export default TopPage;
