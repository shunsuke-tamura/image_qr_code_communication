import "./style.css";

import { charList } from "../../constants";

const colorBlack = "#000000";

const ToCCCPage = () => {
  return (
    <div className="bg">
      <h1 className="primary-text">ToCCCPage</h1>
      <div className="ccc-container">
        {charList.map((char) => (
          <div className="row">
            {[...Array(25)].map(() => (
              <div className="code-container">
                <a className="code" style={{ color: colorBlack }}>
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
