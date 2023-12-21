import { useCallback, useEffect, useRef, useState } from "react";
import { bgColorList, colorRange, partPropertyList } from "../../constants";

import Webcam from "react-webcam";

import { createWorker } from "tesseract.js";
import {
  bitArrayToUint8Array,
  decimalToBitArray,
  splitArray,
} from "../../common";
import { Bit, PartCategory } from "../../types";
const tesseractWorker = await createWorker("eng");

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cv: any;
  }
}

type WordData = {
  image: string;
  label: number;
  word: string | undefined;
  category: PartCategory | undefined;
};

const ToImageFromCCCPage = ({ srcData }: { srcData?: Bit[] }) => {
  const cv = window.cv;

  let totalWordData: WordData[] = [];
  const [wordImageStrList, setWordImageStrList] = useState<WordData[]>([]);
  const [sentenceImageStrList, setSentenceImageStrList] = useState<
    { image: string; sentence: string }[]
  >([]);
  const [srcImageList, setSrcImageList] = useState<File[]>([]);
  const imageBinaryArray: Bit[] = [];
  const [convertedImageStr, setConvertedImageStr] = useState<
    string | undefined
  >(undefined);
  const [show, setShow] = useState<boolean>(false);
  const [showS, setShowS] = useState<boolean>(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([]);
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const cameras = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setCameraList(cameras);
        setSelectedCameraId(cameras[0].deviceId);
      })
      .catch((err) => console.log(err.name + ": " + err.message));
  }, []);

  const handleDataAvailable = useCallback(
    ({ data }: BlobEvent) => {
      if (data.size > 0) {
        setRecordedChunks((prev) => [...prev, data]);
      }
    },
    [setRecordedChunks]
  );

  const handleStartCaptureClick = useCallback(() => {
    if (webcamRef.current === null || webcamRef.current.stream === null) return;
    try {
      mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4",
      });
      mediaRecorderRef.current.addEventListener(
        "dataavailable",
        handleDataAvailable
      );
      mediaRecorderRef.current.start();
      setCapturing(true);
    } catch (e) {
      console.log(e);
    }
  }, [webcamRef, setCapturing, mediaRecorderRef, handleDataAvailable]);

  const handleStopCaptureClick = useCallback(() => {
    if (mediaRecorderRef.current === null) return;
    mediaRecorderRef.current.stop();
    setCapturing(false);
  }, [mediaRecorderRef]);

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

  const convertWordToIdx = (word: string, category: PartCategory): number => {
    // 改行を削除
    word = word.replace(/\r?\n/g, "");
    word = word.replace("§", "6");
    word = word.replace("%", "9");
    const wordIdx = partPropertyList[category].list.findIndex(
      (part) => part.toLowerCase() === word.toLowerCase()
    );
    if (wordIdx !== -1) {
      return wordIdx;
    }

    console.log(word, category, wordIdx);
    const diffList = partPropertyList[category].list.map((part) => {
      const longWord =
        part.length > word.length ? part.split("") : word.split("");
      const shortWord =
        part.length > word.length ? word.split("") : part.split("");
      if (longWord.length - shortWord.length > 1) {
        return 100;
      }
      const temp = [];
      for (let i = 0; i <= longWord.length - shortWord.length; i++) {
        let diffCount = longWord.length - shortWord.length;
        for (let j = 0; j < shortWord.length; j++) {
          if (shortWord[j].toLowerCase() !== longWord[j + i].toLowerCase()) {
            diffCount++;
          }
        }
        temp.push(diffCount);
      }
      return Math.min(...temp);
    });
    console.log(
      word,
      diffList,
      partPropertyList[category].list[diffList.indexOf(Math.min(...diffList))]
    );
    return diffList.indexOf(Math.min(...diffList));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cropeWordImage = (srcImage: any): Promise<WordData[]> => {
    return new Promise((resolve) => {
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
      const temp: WordData[] = [];
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
        temp.push({
          image: croppedBinaryImageStr,
          label: colorIdx,
          word: undefined,
          category: undefined,
        });
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

  const cropeSentenceImage = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    srcImage: any,
    wordDataList: WordData[]
  ) => {
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
    let sentenceCount = 0;
    const temp: { image: string; sentence: string }[] = [];
    for (let i = 0; i < contours.size(); ++i) {
      // if (hierarchy.intPtr(0, i)[3] === -1) {
      if (hierarchy.intPtr(0, i)[3] !== sentenceContainerIdx) {
        // if (hierarchy.intPtr(0, i)[3] !== 262) {
        // if (i !== 503) {
        continue;
      }
      cv.drawContours(dst, contours, i, new cv.Scalar(255, 255, 255, 255), 1);

      sentenceCount++;
      // trim
      const sentenceRect = cv.boundingRect(contours.get(i));
      const sentenceCroped = binary.roi(sentenceRect);

      // OCR
      const croppedCanvas = document.createElement("canvas");
      cv.bitwise_not(sentenceCroped, sentenceCroped);
      cv.imshow(croppedCanvas, sentenceCroped);
      const croppedBinaryImageStr = croppedCanvas.toDataURL("image/png");
      const ocrRes = await tesseractWorker.recognize(croppedBinaryImageStr);
      if (ocrRes.data.text === "") {
        console.log(croppedBinaryImageStr, ocrRes.data.text);
      }
      temp.push({
        image: croppedBinaryImageStr,
        sentence: ocrRes.data.text,
      });

      // set word
      if (wordDataList.length < 1) {
        continue;
      }
      const wordList = ocrRes.data.text.split(" ").reverse();
      for (let j = 0; j < wordList.length; j++) {
        wordDataList[(sentenceCount - 1) * wordList.length + j].word =
          wordList[j];
        wordDataList[(sentenceCount - 1) * wordList.length + j].category =
          (wordList.length - 1 - j) as PartCategory;
      }
    }
    cv.imshow("resultS", dst);
    dst.delete();
    gray.delete();
    binary.delete();
    contours.delete();
    hierarchy.delete();

    temp.reverse();
    setSentenceImageStrList((prev) => [...prev, ...temp]);
    return wordDataList;
  };

  const convertToImage = () => {
    totalWordData.map((data) => {
      imageBinaryArray.push(...decimalToBitArray(data.label, colorRange));
      const wordIdx = convertWordToIdx(data.word!, data.category!);
      imageBinaryArray.push(
        ...decimalToBitArray(wordIdx, partPropertyList[data.category!].range)
      );
      imageBinaryArray.push();
    });
    console.log(imageBinaryArray);
    srcData!.map((bit, idx) => {
      if (bit !== imageBinaryArray[idx]) {
        console.log(idx, bit, imageBinaryArray[idx]);
      }
    });
    const uint8Array = bitArrayToUint8Array(imageBinaryArray);
    const blob = new Blob([uint8Array], { type: "image/png" });
    const convertedImageStr = URL.createObjectURL(blob);
    setConvertedImageStr(convertedImageStr);
  };

  const executeHandler = async () => {
    setWordImageStrList([]);
    setSentenceImageStrList([]);
    totalWordData = [];
    // images: HTMLImageElement[] = [];
    let src = new cv.Mat();
    for (const srcImage of srcImageList) {
      // const src = cv.imread("input");
      const p = new Promise<void>((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(srcImage);
        img.onload = async () => {
          src = cv.imread(img);
          let temp = await cropeWordImage(src);
          temp = await cropeSentenceImage(src, temp);
          totalWordData.push(...temp.reverse());
          resolve();
        };
      });
      await p;
    }
    console.log(totalWordData.length);
    setWordImageStrList(totalWordData);
    convertToImage();
    src.delete();
  };

  return (
    <div>
      <h1>to-image-from-ccc</h1>

      <Webcam
        audio={false}
        ref={webcamRef}
        videoConstraints={{ deviceId: selectedCameraId }}
      ></Webcam>
      <br />
      <select
        value={selectedCameraId}
        onChange={(e) => setSelectedCameraId(e.target.value)}
      >
        {cameraList.map((camera) => (
          <option value={camera.deviceId} key={camera.deviceId}>
            {camera.label}
          </option>
        ))}
      </select>
      <br />
      {capturing ? (
        <button onClick={handleStopCaptureClick} className="secondary">
          Stop
        </button>
      ) : (
        <button onClick={handleStartCaptureClick} className="primary">
          Start
        </button>
      )}

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
          {splitArray(wordImageStrList, 4).map((wordImageStrList, idx1) => (
            <div style={{ display: "flex" }} key={`row${idx1}`}>
              <a>{idx1}</a>
              {wordImageStrList.map((wordImageStr, idx2) => (
                <div key={`word${idx1}-${idx2}`}>
                  <a>
                    {idx1 * 4 + idx2}, {wordImageStr.label}, {wordImageStr.word}
                  </a>
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
              <a>
                {idx}, {sentence.sentence}
              </a>
              <img src={sentence.image} />
            </div>
          ))}
        </div>
      )}
      <h3>converted image</h3>
      {convertedImageStr && <img src={convertedImageStr} />}
    </div>
  );
};

export default ToImageFromCCCPage;
