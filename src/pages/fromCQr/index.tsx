import { useState } from "react";
import { Bit } from "../../types";
import { cQrCellColorList, cQrCellColorRange } from "../../constants";
import {
  bitArrayToUint8Array,
  decimalToBitArray,
  splitArray,
} from "../../common";

const FromCQrPage = ({ srcData }: { srcData: Bit[] }) => {
  const cv = window.cv;

  type CellData = {
    image: string;
    colorIdx: number;
  };
  const [cellImageColorIdxList, setCellImageColorIdxList] = useState<
    CellData[]
  >([]);
  const [srcImageList, setSrcImageList] = useState<File[]>([]);
  const convertedImageBinary: Bit[] = [];
  const [convertedImageStr, setConvertedImageStr] = useState<
    string | undefined
  >(undefined);
  const [show, setShow] = useState<boolean>(false);

  const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const img = new Image();
      img.onload = () => {
        const mat = cv.imread(img);
        cv.imshow("input", mat);
        mat.delete();
      };
      img.src = URL.createObjectURL(e.target.files[0]);
      setSrcImageList((prev) => [...prev, ...e.target.files!]);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calcColorIdxfromCellImage = (cellImage: any) => {
    const borderLowerColor = [0, 0, 0]; // [r, g, b]
    const borderUpperColor = [51, 51, 51]; // [r, g, b]

    const height = cellImage.rows;
    const width = cellImage.cols;
    const rgbSum = [0, 0, 0];
    let varidPixelCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const rgb = cellImage.ucharPtr(y, x);
        if (
          rgb[0] >= borderLowerColor[0] &&
          rgb[0] <= borderUpperColor[0] &&
          rgb[1] >= borderLowerColor[1] &&
          rgb[1] <= borderUpperColor[1] &&
          rgb[2] >= borderLowerColor[2] &&
          rgb[2] <= borderUpperColor[2]
        ) {
          continue;
        }
        rgbSum[0] += rgb[0];
        rgbSum[1] += rgb[1];
        rgbSum[2] += rgb[2];
        varidPixelCount++;
      }
    }
    const rgbAverage = [
      rgbSum[0] / varidPixelCount,
      rgbSum[1] / varidPixelCount,
      rgbSum[2] / varidPixelCount,
    ];
    const rgbList = cQrCellColorList.map((cQrColor) => {
      return cQrColor
        .slice(1)
        .match(/.{2}/g)!
        .map((color) => parseInt(color, 16));
    });
    const diffList = rgbList.map((rgb) => {
      return (
        Math.abs(rgbAverage[0] - rgb[0]) +
        Math.abs(rgbAverage[1] - rgb[1]) +
        Math.abs(rgbAverage[2] - rgb[2])
      );
    });
    const minDiffIndex = diffList.indexOf(Math.min(...diffList));
    return minDiffIndex;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cropeCellImage = (srcImage: any): Promise<CellData[]> => {
    return new Promise((resolve) => {
      const gray = new cv.Mat();
      const binary = new cv.Mat();
      const dst = cv.Mat.zeros(srcImage.rows, srcImage.cols, cv.CV_8UC3);
      cv.cvtColor(srcImage, gray, cv.COLOR_RGBA2GRAY, 0);
      cv.imshow("gray", gray);
      cv.threshold(gray, binary, 10, 200, cv.THRESH_BINARY);
      cv.imshow("binary", binary);
      // detect rectangles
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        binary,
        contours,
        hierarchy,
        cv.RETR_CCOMP, // RETR_EXTERNAL, RETR_LIST, RETR_CCOMP, RETR_TREE,
        cv.CHAIN_APPROX_SIMPLE
      );

      // draw contours
      const colors = [
        new cv.Scalar(255, 0, 0, 255),
        new cv.Scalar(255, 255, 255, 255),
      ];
      let contourIdx = 0;
      const temp: CellData[] = [];
      while (hierarchy.intPtr(0, contourIdx)[0] !== -1) {
        const color = colors[hierarchy.intPtr(0, contourIdx)[3] !== -1 ? 1 : 0];
        cv.drawContours(
          dst,
          contours,
          contourIdx,
          color,
          1,
          cv.LINE_8,
          hierarchy,
          100
        );

        // trim
        const cellRect = cv.boundingRect(contours.get(contourIdx));
        const cellCroped = srcImage.roi(cellRect);

        const colorIdx = calcColorIdxfromCellImage(cellCroped);
        const croppedCanvas = document.createElement("canvas");
        cv.imshow(croppedCanvas, cellCroped);
        const croppedImageStr = croppedCanvas.toDataURL("image/png");
        temp.push({
          image: croppedImageStr,
          colorIdx,
        });

        contourIdx = hierarchy.intPtr(0, contourIdx)[0];
      }
      cv.imshow("result", dst);
      dst.delete();
      gray.delete();
      binary.delete();
      contours.delete();
      hierarchy.delete();
      resolve(temp);
    });
  };

  const convertToImage = (totalCellData: CellData[]) => {
    totalCellData.forEach((data) => {
      convertedImageBinary.push(
        ...decimalToBitArray(data.colorIdx, cQrCellColorRange)
      );
    });
    console.log(convertedImageBinary);
    srcData!.map((bit, idx) => {
      if (bit !== convertedImageBinary[idx]) {
        console.log(idx, bit, convertedImageBinary[idx]);
      }
    });
    const uint8Array = bitArrayToUint8Array(convertedImageBinary);
    const blob = new Blob([uint8Array], { type: "image/png" });
    const convertedImageStr = URL.createObjectURL(blob);
    setConvertedImageStr(convertedImageStr);
  };

  const executeHandler = async () => {
    setCellImageColorIdxList([]);
    const totalCellData: CellData[] = [];
    let src = new cv.Mat();
    for (const srcImage of srcImageList) {
      const p = new Promise<void>((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(srcImage);
        img.onload = async () => {
          src = cv.imread(img);
          totalCellData.push(...(await cropeCellImage(src)).reverse());
          resolve();
        };
      });
      await p;
    }
    console.log(totalCellData.length);
    setCellImageColorIdxList(totalCellData);
    convertToImage(totalCellData);
    src.delete();
  };

  return (
    <div>
      <h1>From CQR Page</h1>

      <div>
        <input type="file" onChange={onChangeFile} multiple />
        {srcImageList.map((srcImage) => (
          <div>{srcImage.name}</div>
        ))}
      </div>
      <div>
        <button className="primary" onClick={executeHandler}>
          Try it
        </button>
      </div>

      <h3>input</h3>
      <canvas id="input" />
      <h3>gray scale</h3>
      <canvas id="gray" />
      <h3>binarization</h3>
      <canvas id="binary" />
      <h3>result</h3>
      <canvas id="result" />

      <div>
        <button
          className={show ? "secondary" : "primary"}
          onClick={() => setShow((prev) => !prev)}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {show && (
        <div>
          {splitArray(cellImageColorIdxList, 80).map(
            (cellImageColorIdxListRow, idx1) => (
              <div style={{ display: "flex" }} key={`row${idx1}`}>
                <a>{idx1}</a>
                {cellImageColorIdxListRow.map((cellImageColorIdx, idx2) => (
                  <div key={`cell${idx1}-${idx2}`}>
                    <a>
                      {idx1 * 80 + idx2}, {cellImageColorIdx.colorIdx}
                    </a>
                    <img
                      style={{ margin: "2px" }}
                      src={cellImageColorIdx.image}
                    />
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      <h3>converted image</h3>
      {convertedImageStr && <img src={convertedImageStr} />}
    </div>
  );
};

export default FromCQrPage;
