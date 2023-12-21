import { useState } from "react";
import { convertImageToBitArray, splitArray } from "../../common";
import { Bit } from "../../types";
import { cQrCellColorList, cQrCellColorRange } from "../../constants";

import "./style.css";
import FromCQr from "../fromCQr";

const ToCQrPage = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cQrContainer, setcQrContainer] = useState<JSX.Element | null>(null);
  const [binary, setBinary] = useState<Bit[]>([]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const convertCQrFromImage = (imageBitArray: Bit[]) => {
    // 余った部分を0で埋める
    const adjustment = (result: Bit[][]) => {
      while (result[result.length - 1].length < cQrCellColorRange) {
        result[result.length - 1].push(0);
      }
    };
    const cQrCellBinaryList = splitArray(
      imageBitArray,
      cQrCellColorRange,
      adjustment
    );
    const cQrCellColorIndexList = cQrCellBinaryList.map((cQrCellBinary) =>
      parseInt(cQrCellBinary.join(""), 2)
    );
    setcQrContainer(
      <div>
        {splitArray(cQrCellColorIndexList, 6400).map(
          (oneCQrCellColorIndexList) => (
            <div className="cqr-container" style={{ marginTop: "15px" }}>
              {splitArray(oneCQrCellColorIndexList, 80).map(
                (cQrRowCellColorIndexList) => (
                  <div className="cqr-row">
                    {cQrRowCellColorIndexList.map((cellColorIndex) => (
                      <div
                        className="cqr-cell"
                        style={{
                          backgroundColor: cQrCellColorList[cellColorIndex],
                        }}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          )
        )}
      </div>
    );
  };

  const executeHandler = async () => {
    if (!imageFile) {
      return;
    }
    const binaryArray = await convertImageToBitArray(imageFile);
    const cccContainer = convertCQrFromImage(binaryArray);
    setBinary(binaryArray);
    return cccContainer;
  };

  return (
    <>
      <div className="cqr-page-bg">
        <h1>ToCQrPage</h1>
        <input type="file" accept="image/*" onChange={handleImageChange} />
        <br />
        <button className="primary" onClick={executeHandler}>
          Try it
        </button>
        {cQrContainer}
      </div>
      <br />
      <br />
      <FromCQr srcData={binary}></FromCQr>
    </>
  );
};

export default ToCQrPage;
