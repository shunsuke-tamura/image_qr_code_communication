import "./style.css";

import {
  bgColorList,
  colorRange,
  partPropertyList,
  sentenceRange,
} from "../../constants";
import { useState } from "react";
import { splitArray } from "../../common";

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

export type Bit = 0 | 1;

const ToCCCPage = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cccContainer, setCccContainer] = useState<JSX.Element | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const uint8ArrayToBitArray = (uint8Array: Uint8Array) => {
    const bitArray: Bit[] = [];

    uint8Array.forEach((byte) => {
      for (let i = 7; i >= 0; i--) {
        bitArray.push(byte & (1 << i) ? 1 : 0);
      }
    });

    return bitArray;
  };

  const convertImageToBitArray = (file: File): Promise<Bit[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        console.log(e.target?.result);

        const imageBinaryArray = reader.result as ArrayBuffer;
        if (imageBinaryArray.byteLength > 0) {
          resolve(uint8ArrayToBitArray(new Uint8Array(imageBinaryArray)));
        } else {
          reject(new Error("Failed to convert image to base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
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
        {splitArray(sentenceList, 78).map((sentences78) => (
          <div className="ccc-container" style={{ marginTop: "15px" }}>
            {splitArray(sentences78, 3).map((sentences2) => (
              <div className="sentence-container row">
                {sentences2.map((sentence) =>
                  sentence.map((part) => (
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
                  ))
                )}
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
    return cccContainer;
  };

  return (
    <div className="bg">
      <h1>ToCCCPage</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <br />
      <button className="primary" onClick={executeHandler}>
        Try it
      </button>
      {cccContainer}
    </div>
  );
};

export default ToCCCPage;
