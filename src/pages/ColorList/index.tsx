import { bgColorList } from "../../constants";

const ColorListPage = () => {
  return (
    <div>
      <h1>ColorListPage</h1>
      {bgColorList.map((color) => (
        <div style={{ backgroundColor: color, height: "50px" }}></div>
      ))}
    </div>
  );
};

export default ColorListPage;
