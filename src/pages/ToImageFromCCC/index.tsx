import { useState } from "react";
import { bgColorList } from "../../constants";

import { createWorker } from "tesseract.js";
import { splitArray } from "../../common";
const tesseractWorker = await createWorker("eng");

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cv: any;
  }
}

const ToImageFromCCCPage = () => {
  const cv = window.cv;

  const [wordImageStrList, setWordImageStrList] = useState<
    { image: string; label: number }[]
  >([]);
  const [sentenceImageStrList, setSentenceImageStrList] = useState<
    { image: string; sentence: string }[]
  >([]);
  const [show, setShow] = useState<boolean>(false);
  const [showS, setShowS] = useState<boolean>(false);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calcColorIdxfromWordImage = (wordImage: any) => {
    // convert to color index
    const whiteLowerColor = [200, 200, 200]; // [r, g, b]
    const whiteUpperColor = [255, 255, 255]; // [r, g, b]
    const borderLowerColor = [80, 200, 80]; // [r, g, b]
    const borderUpperColor = [120, 240, 120]; // [r, g, b]

    const height = wordImage.rows;
    const width = wordImage.cols;
    const rgbSum = [0, 0, 0];
    let varidPixelCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const rgb = wordImage.ucharPtr(y, x);
        if (
          // 白除外(文字色)
          (rgb[0] >= whiteLowerColor[0] &&
            rgb[0] <= whiteUpperColor[0] &&
            rgb[1] >= whiteLowerColor[1] &&
            rgb[1] <= whiteUpperColor[1] &&
            rgb[2] >= whiteLowerColor[2] &&
            rgb[2] <= whiteUpperColor[2]) ||
          // 枠除外
          (rgb[0] >= borderLowerColor[0] &&
            rgb[0] <= borderUpperColor[0] &&
            rgb[1] >= borderLowerColor[1] &&
            rgb[1] <= borderUpperColor[1] &&
            rgb[2] >= borderLowerColor[2] &&
            rgb[2] <= borderUpperColor[2])
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
    return minDiffIndex;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cropeWordImage = (srcImage: any) => {
    const gray = new cv.Mat();
    const binary = new cv.Mat();
    const dst = cv.Mat.zeros(srcImage.rows, srcImage.cols, cv.CV_8UC3);
    cv.cvtColor(srcImage, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.imshow("gray", gray);
    cv.threshold(gray, binary, 140, 200, cv.THRESH_BINARY);
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
    // a.最後[contour] -> b.その親[contour] = codeContainer
    const a = hierarchy.intPtr(0, contours.size() - 1);
    const b = a[3];
    const codeContainerIdx = b;
    for (let i = 0; i < contours.size(); ++i) {
      const color = colors[hierarchy.intPtr(0, i)[3] !== -1 ? 1 : 0];

      // if (hierarchy.intPtr(0, i)[3] === -1) {
      if (hierarchy.intPtr(0, i)[3] !== codeContainerIdx) {
        // if (hierarchy.intPtr(0, i)[3] !== 295) {
        // if (i !== 503) {
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
      const wordRect = cv.boundingRect(contours.get(i));
      const wordCroped = srcImage.roi(wordRect);

      const colorIdx = calcColorIdxfromWordImage(wordCroped);
      const croppedCanvas = document.createElement("canvas");
      cv.imshow(croppedCanvas, wordCroped);
      const croppedBinaryImageStr = croppedCanvas.toDataURL("image/png");
      setWordImageStrList((prev) => [
        ...prev,
        { image: croppedBinaryImageStr, label: colorIdx },
      ]);
    }
    cv.imshow("result", dst);
    dst.delete();
    gray.delete();
    binary.delete();
    contours.delete();
    hierarchy.delete();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cropeSentenceImage = async (srcImage: any) => {
    const gray = new cv.Mat();
    const binary = new cv.Mat();
    const dst = cv.Mat.zeros(srcImage.rows, srcImage.cols, cv.CV_8UC3);
    cv.cvtColor(srcImage, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(gray, binary, 170, 200, cv.THRESH_BINARY);
    cv.imshow("grayS", gray);
    cv.imshow("binaryS", binary);
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
    // a.最後[contour]を親とする = sentenceContainer
    const sentenceContainerIdx = hierarchy.intPtr(0, contours.size() - 1)[3];
    for (let i = 0; i < contours.size(); ++i) {
      // if (hierarchy.intPtr(0, i)[3] === -1) {
      if (hierarchy.intPtr(0, i)[3] !== sentenceContainerIdx) {
        // if (hierarchy.intPtr(0, i)[3] !== 262) {
        // if (i !== 503) {
        continue;
      }
      cv.drawContours(dst, contours, i, new cv.Scalar(255, 255, 255, 255), 1);

      // trim
      const sentenceRect = cv.boundingRect(contours.get(i));
      const sentenceCroped = binary.roi(sentenceRect);

      // OCR
      const croppedCanvas = document.createElement("canvas");
      cv.bitwise_not(sentenceCroped, sentenceCroped);
      cv.imshow(croppedCanvas, sentenceCroped);
      const croppedBinaryImageStr = croppedCanvas.toDataURL("image/png");
      const ocrRes = await tesseractWorker.recognize(croppedBinaryImageStr);
      setSentenceImageStrList((prev) => [
        ...prev,
        { image: croppedBinaryImageStr, sentence: ocrRes.data.text },
      ]);
    }
    cv.imshow("resultS", dst);
    dst.delete();
    gray.delete();
    binary.delete();
    contours.delete();
    hierarchy.delete();
  };

  const executeHandler = async () => {
    setWordImageStrList([]);
    setSentenceImageStrList([]);
    const src = cv.imread("input");
    cropeWordImage(src);
    await cropeSentenceImage(src);
    src.delete();
  };

  return (
    <div>
      <h1>to-image-from-ccc</h1>

      <div>
        <input type="file" onChange={onChangeFile} />
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
          {splitArray(wordImageStrList, 4).map((wordImageStrList, idx1) => (
            <div style={{ display: "flex" }} key={`row${idx1}`}>
              {wordImageStrList.map((wordImageStr, idx2) => (
                <div key={`word${idx1}-${idx2}`}>
                  <a>{wordImageStr.label}</a>
                  <img style={{ margin: "2px" }} src={wordImageStr.image} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <h3>gray scale</h3>
      <canvas id="grayS" />
      <h3>binarization</h3>
      <canvas id="binaryS" />
      <h3>result</h3>
      <canvas id="resultS" />
      <div>
        <button
          className={showS ? "secondary" : "primary"}
          onClick={() => setShowS((prev) => !prev)}
        >
          {showS ? "Hide" : "Show"}
        </button>
      </div>
      {showS && (
        <div>
          <div>sentences</div>
          {sentenceImageStrList.map((sentence, idx) => (
            <div key={`sentence${idx}`}>
              <a>{sentence.sentence}</a>
              <img src={sentence.image} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToImageFromCCCPage;
