import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  convertImageToBitArray,
  decimalToBitArray,
  splitArray,
} from "../../common";
import { Bit } from "../../types";
import {
  CQR_ROW_NUM,
  LONG_INTERVAL,
  SHORT_INTERVAL,
  cQrCellColorList,
  cQrCellColorRange,
} from "../../constants";

import "./style.css";
import FromCQr from "../fromCQr";
import { StartQRData } from "../../types/StartQRData";

const ToCQrPage = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cQrContainerList, setCQrContainerList] = useState<JSX.Element[]>([]);
  const [showingCQrContainerIndex, setShowingCQrContainerIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [binary, setBinary] = useState<Bit[]>([]);
  const [startQRStringData, setStartQRStringData] = useState<string>("");
  const startQRData = new StartQRData();

  const CQR_CELL_STYLE = {
    borderWidth: 2,
    width: 5,
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const convertCQrFromImage = (imageBitArray: Bit[]): JSX.Element[] => {
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

    const ONE_CQR_CODE_NUM = CQR_ROW_NUM ** 2;
    startQRData.metaCellCount = CQR_ROW_NUM;
    return splitArray(cQrCellColorIndexList, ONE_CQR_CODE_NUM).map(
      (oneCQrCellColorIndexList, idx) => {
        const idxCells = splitArray(
          decimalToBitArray(idx, cQrCellColorRange),
          cQrCellColorRange,
          adjustment
        );
        const idxCellColorIndexList = idxCells.map((idxCell) =>
          parseInt(idxCell.join(""), 2)
        );
        const metaRows = splitArray(idxCellColorIndexList, CQR_ROW_NUM, (r) => {
          while (r[r.length - 1].length < CQR_ROW_NUM) {
            r[r.length - 1].unshift(0);
          }
        });
        oneCQrCellColorIndexList.unshift(...metaRows.flat());
        return (
          <div
            className="cqr-container"
            style={{
              padding: `${
                (CQR_CELL_STYLE.borderWidth * 2 + CQR_CELL_STYLE.width) * 2
              }px`,
            }}
          >
            {splitArray(oneCQrCellColorIndexList, CQR_ROW_NUM).map(
              (cQrRowCellColorIndexList) => (
                <div className="cqr-row">
                  {cQrRowCellColorIndexList.map((cellColorIndex) => (
                    <div
                      className="cqr-cell"
                      style={{
                        border: `${CQR_CELL_STYLE.borderWidth}px solid rgb(0, 0, 0)`,
                        width: `${CQR_CELL_STYLE.width}px`,
                        height: `${CQR_CELL_STYLE.width}px`,
                        backgroundColor: cQrCellColorList[cellColorIndex],
                      }}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        );
      }
    );
  };

  const startShowingCQrCode = (cQrCodeNum: number) => {
    console.log("start showing CQR code", cQrCodeNum);

    const cQrHandler = (showIndex: number) => {
      console.log(showIndex);
      setShowingCQrContainerIndex(showIndex);
      timerRef.current = setTimeout(
        () => cQrHandler((showIndex + 1) % (cQrCodeNum + 1) /* +1 for meta */),
        showIndex === 0 ? LONG_INTERVAL : SHORT_INTERVAL
      );
    };
    cQrHandler(0);
  };

  useEffect(() => {
    return () => {
      console.log("stop showing CQR code");
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timerRef]);

  const executeHandler = async () => {
    if (!imageFile) {
      return;
    }
    const binaryArray = await convertImageToBitArray(imageFile);
    const cQrContainerList = convertCQrFromImage(binaryArray);
    startQRData.totalCQRCount = cQrContainerList.length;
    startQRData.cellCountOnOneSide = CQR_ROW_NUM;
    startQRData.totalShowingTime =
      LONG_INTERVAL + SHORT_INTERVAL * cQrContainerList.length;
    startQRData.oneCQRShowingTime = SHORT_INTERVAL;

    setCQrContainerList(cQrContainerList);
    setStartQRStringData(startQRData.toString());
    startShowingCQrCode(cQrContainerList.length);
    setBinary(binaryArray);
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
        <div
          style={{
            padding: "100px",
            margin: "15px",
            backgroundColor: "white",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {startQRStringData !== "" ? (
            showingCQrContainerIndex === 0 ? (
              <QRCodeSVG
                value={startQRStringData}
                size={
                  (CQR_CELL_STYLE.borderWidth * 2 + CQR_CELL_STYLE.width) *
                  (CQR_ROW_NUM + 2 * 2)
                }
              />
            ) : (
              cQrContainerList[showingCQrContainerIndex - 1]
            )
          ) : null}
        </div>
        {/* <div
          style={{
            padding: "15px",
            margin: "15px",
            backgroundColor: "white",
          }}
        >
          {startQRStringData !== "" ? (
            <QRCodeSVG
              value={startQRStringData}
              size={
                (CQR_CELL_STYLE.borderWidth * 2 + CQR_CELL_STYLE.width) *
                (CQR_ROW_NUM + 2 * 2)
              }
            />
          ) : null}
        </div>
        {cQrContainerList.map((cQrContainer) => (
          <div
            style={{
              padding: "15px",
              margin: "15px",
              backgroundColor: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {cQrContainer}
          </div>
        ))} */}
      </div>
      <br />
      <br />
      <FromCQr srcData={binary}></FromCQr>
    </>
  );
};

export default ToCQrPage;
