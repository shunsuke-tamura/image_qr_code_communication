import { useState } from "react";
import { bgColorList } from "../../constants";

import { createWorker } from "tesseract.js";
const tesseractWorker = await createWorker("eng");

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cv: any;
  }
}

const ToImageFromCCCPage = () => {
  const cv = window.cv;

  const [charImageStrList, setCharImageStrList] = useState<
    { image: string; label: number; char: string }[]
  >([]);
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
    }
  };

  const executeFindContours = async () => {
    setCharImageStrList([]);
    const src = cv.imread("input");
    const gray = new cv.Mat();
    const binary = new cv.Mat();
    const dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.imshow("gray", gray);
    cv.threshold(gray, binary, 120, 200, cv.THRESH_BINARY);
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
    console.log("contours.size(): " + contours.size());

    // draw contours
    const colors = [
      new cv.Scalar(255, 0, 0, 255),
      new cv.Scalar(255, 255, 255, 255),
    ];
    // a.最後[contour] -> b.その親[contour] -> c.prev[int] = codeContainerIdx
    const a = hierarchy.intPtr(0, contours.size() - 1);
    const b = hierarchy.intPtr(0, a[3]);
    const c = b[1];
    const codeContainerIdx = c;
    for (let i = 0; i < contours.size(); ++i) {
      const color = colors[hierarchy.intPtr(0, i)[3] !== -1 ? 1 : 0];

      // if (hierarchy.intPtr(0, i)[3] === -1) {
      if (hierarchy.intPtr(0, i)[3] !== codeContainerIdx) {
        // if (i !== 2008) {
        continue;
      }
      // console.log(
      //   i,
      //   hierarchy.intPtr(0, i)[0],
      //   hierarchy.intPtr(0, i)[1],
      //   hierarchy.intPtr(0, i)[2],
      //   hierarchy.intPtr(0, i)[3]
      // );
      cv.drawContours(dst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);

      // trim
      const rect = cv.boundingRect(contours.get(i));
      const croped = src.roi(rect);

      // convert to color index
      const lowerColor = [200, 200, 200]; // [r, g, b]
      const upperColor = [255, 255, 255]; // [r, g, b]

      const height = croped.rows;
      const width = croped.cols;
      const rgbSum = [0, 0, 0];
      let varidPixelCount = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const rgb = croped.ucharPtr(y, x);
          if (
            rgb[0] >= lowerColor[0] &&
            rgb[0] <= upperColor[0] &&
            rgb[1] >= lowerColor[1] &&
            rgb[1] <= upperColor[1] &&
            rgb[2] >= lowerColor[2] &&
            rgb[2] <= upperColor[2]
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
      const rgbList = bgColorList.map((bgColor) => {
        return bgColor
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

      // OCR
      const croppedCanvas = document.createElement("canvas");
      // cv.imshow(croppedCanvas, croped);
      // const croppedImageStr = croppedCanvas.toDataURL("image/png");
      cv.cvtColor(croped, gray, cv.COLOR_RGBA2GRAY, 0);
      cv.threshold(gray, binary, 120, 200, cv.THRESH_BINARY);
      cv.bitwise_not(binary, binary);
      cv.imshow(croppedCanvas, binary);
      const croppedBinaryImageStr = croppedCanvas.toDataURL("image/png");
      const ocrRes = await tesseractWorker.recognize(croppedBinaryImageStr);
      setCharImageStrList((prev) => [
        ...prev,
        {
          image: croppedBinaryImageStr,
          label: minDiffIndex,
          char: ocrRes.data.text,
        },
      ]);
    }
    // show result
    cv.imshow("result", dst);
    src.delete();
    dst.delete();
    gray.delete();
    binary.delete();
    contours.delete();
    hierarchy.delete();
  };

  // 配列をn個ずつに分割する
  const splitArray = <T,>(array: T[], n: number): T[][] => {
    const result = [];
    for (let i = 0; i < array.length; i += n) {
      result.push(array.slice(i, i + n));
    }
    return result;
  };

  return (
    <div>
      <h1>to-image-from-ccc</h1>

      <div>
        <input type="file" onChange={onChangeFile} />
      </div>
      <div>
        <button className="primary" onClick={executeFindContours}>
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
          {splitArray(charImageStrList, 8).map((charImageStrList) => (
            <div style={{ display: "flex" }}>
              {charImageStrList.map((charImageStr) => (
                <div>
                  <a>
                    {charImageStr.label}, {charImageStr.char}
                  </a>
                  <img style={{ margin: "2px" }} src={charImageStr.image} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToImageFromCCCPage;
