import "./style.css";

import {
  bgColorList,
  colorRange,
  partPropertyList,
  sentenceRange,
} from "../../constants";
import { useState } from "react";
import { convertImageToBitArray, splitArray } from "../../common";
import ToImageFromCCC from "../ToImageFromCCC";
import { Bit } from "../../types";

// 背景色から文字色を決定する関数
// input: ex. "#ffffff"
const getTextColor = (backgroundColor: string) => {
  const rgb = backgroundColor
    .slice(1)
    .match(/.{2}/g)!
    .map((color) => parseInt(color, 16));
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  return brightness > 140 ? "#000000" : "#ffffff";
};

type PartInfo = {
  color: string;
  part: string;
};

const ToCCCPage = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cccContainer, setCccContainer] = useState<JSX.Element | null>(null);
  const [binary, setBinary] = useState<Bit[]>([]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const convertStringToCCC = (imageBitArray: Bit[]) => {
    // 余った部分を0で埋める
    const adjustment = (result: Bit[][]) => {
      while (result[result.length - 1].length < sentenceRange) {
        result[result.length - 1].push(0);
      }
    };
    const sentenceBinaryList = splitArray(
      imageBitArray,
      sentenceRange,
      adjustment
    );
    console.log(imageBitArray);
    console.log(sentenceBinaryList);

    const sentenceList: PartInfo[][] = [];
    for (const sentenceBinary of sentenceBinaryList) {
      const partList: PartInfo[] = [];
      let doneLength = 0;
      for (const partProperty of partPropertyList) {
        const colorIdx = parseInt(
          sentenceBinary.slice(doneLength, doneLength + colorRange).join(""),
          2
        );
        doneLength += colorRange;
        const partIdx = parseInt(
          sentenceBinary
            .slice(doneLength, doneLength + partProperty.range)
            .join(""),
          2
        );
        doneLength += partProperty.range;
        partList.push({
          color: bgColorList[colorIdx],
          part: partProperty.list[partIdx],
        });
      }
      sentenceList.push(partList);
    }
    console.log(sentenceList);

    setCccContainer(
      <div>
        {splitArray(sentenceList, 75).map((sentences75) => (
          <div className="ccc-container" style={{ marginTop: "15px" }}>
            {splitArray(sentences75, 3).map((sentences2) => (
              <div className="row">
                {sentences2.map((sentence) => (
                  <div className="sentence-container row">
                    {sentence.map((part) => (
                      <div
                        className="code-container"
                        style={{ backgroundColor: part.color }}
                      >
                        <a
                          className="code"
                          style={{ color: getTextColor(part.color) }}
                        >
                          {part.part}
                        </a>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const executeHandler = async () => {
    if (!imageFile) {
      return;
    }
    const binaryArray = await convertImageToBitArray(imageFile);
    const cccContainer = convertStringToCCC(binaryArray);
    setBinary(binaryArray);
    return cccContainer;
  };

  return (
    <>
      <div className="bg">
        <h1>ToCCCPage</h1>
        <input type="file" accept="image/*" onChange={handleImageChange} />
        <br />
        <button className="primary" onClick={executeHandler}>
          Try it
        </button>
        {cccContainer}
      </div>
      <br />
      <br />
      <ToImageFromCCC srcData={binary}></ToImageFromCCC>
    </>
  );
};

export default ToCCCPage;
