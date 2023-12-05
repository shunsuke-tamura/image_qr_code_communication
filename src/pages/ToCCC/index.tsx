import "./style.css";

import { bgColorList, charList } from "../../constants";

// 背景色から文字色を決定する関数
// input: ex. "#ffffff"
const getTextColor = (backgroundColor: string) => {
  const rgb = backgroundColor
    .slice(1)
    .match(/.{2}/g)!
    .map((color) => parseInt(color, 16));
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  return brightness > 125 ? "#000000" : "#ffffff";
};

const ToCCCPage = () => {
  return (
    <div className="bg">
      <h1>ToCCCPage</h1>
      <div className="ccc-container">
        {charList.map((char) => (
          <div className="row">
            {bgColorList.map((bgColor) => (
              <div
                className="code-container"
                style={{ backgroundColor: bgColor }}
              >
                <a className="code" style={{ color: getTextColor(bgColor) }}>
                  {char}
                </a>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToCCCPage;
