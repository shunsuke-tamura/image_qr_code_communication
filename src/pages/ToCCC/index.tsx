import "./style.css";

import {
  bgColorList,
  charList,
  subjectList,
  verbList,
  objectList,
} from "../../constants";

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

const randomBgColor = () => {
  return bgColorList[Math.floor(Math.random() * bgColorList.length)];
};

const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min) + min);
};

const makeSentence = () => {
  const subject = subjectList[Math.floor(Math.random() * subjectList.length)];
  const verb = verbList[Math.floor(Math.random() * verbList.length)];
  const object = objectList[Math.floor(Math.random() * objectList.length)];
  return `${subject} ${verb} ${randomInt(1, 128)} ${object}.`;
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
      <br />
      <div className="ccc-container">
        {[...Array(10)].map(() => {
          const bgColor = randomBgColor();
          return (
            <div className="row">
              {/* {makeSentence()
              .split(" ")
              .map((word) => {
                const bgColor = randomBgColor();
                return (
                  <div
                    className="code-container"
                    style={{ backgroundColor: bgColor }}
                  >
                    <a
                      className="code"
                      style={{ color: getTextColor(bgColor) }}
                    >
                      {word}
                    </a>
                  </div>
                );
              })} */}
              <div
                className="code-container"
                style={{ backgroundColor: bgColor }}
              >
                <a className="code" style={{ color: getTextColor(bgColor) }}>
                  {makeSentence()}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ToCCCPage;
