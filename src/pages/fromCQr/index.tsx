import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser/esm/readers/BrowserQRCodeReader";
import { IScannerControls } from "@zxing/browser";
import jsQR from "jsqr";
import Webcam from "react-webcam";
import { Bit } from "../../types";
import { StartQRData } from "../../types/StartQRData";
import {
  CQR_ROW_NUM,
  cQrCellColorList,
  cQrCellColorRange,
} from "../../constants";
import {
  bitArrayToUint8Array,
  decimalToBitArray,
  splitArray,
} from "../../common";
import MediaRecorder from "./MediaRecorder";
import { Point } from "jsqr/dist/locator";

type CameraInfo = {
  deviceId: string;
  width: number;
  height: number;
};

type ImageObject = {
  data: ImageData;
  str: string;
};

type QRCodePosition = {
  topLeft: Point;
  width: number;
  height: number;
};

const FromCQrPage = ({ srcData }: { srcData?: Bit[] }) => {
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
  const [selectedCameraInfo, setSelectedCameraInfo] = useState<CameraInfo>({
    deviceId: "",
    width: 0,
    height: 0,
  });
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([]);
  const [capturedImageList, setCapturedImageList] = useState<ImageObject[]>([]);
  const webcamRef = useRef<Webcam>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const recorded = useRef<boolean>(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string>("");
  const codeReaderContlolsRef = useRef<null | IScannerControls>(null);
  const startMetaData = useMemo(() => new StartQRData(), []);

  const getCameraInfo = (camera: InputDeviceInfo): CameraInfo => {
    const capabilities = camera.getCapabilities();
    if (!capabilities.width || !capabilities.height)
      throw new Error("cannot use this camera?");
    const width = capabilities.width.max;
    const height = capabilities.height.max;
    if (!width || !height) throw new Error("cannot use this camera");
    return { deviceId: camera.deviceId, width, height };
  };

  useEffect(() => {
    (async () => {
      try {
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setCameraList(cameras);
        setSelectedCameraInfo(getCameraInfo(cameras[0] as InputDeviceInfo));
        setMediaStream(
          await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: {
                exact: cameras[0].deviceId,
              },
            },
            audio: false,
          })
        );
      } catch (e) {
        console.log(e);
      }
    })();
  }, []);

  const startRecording = async () => {
    if (recorded.current || recording) return;
    console.log("start recording", startMetaData);
    recorded.current = true;
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
    }, startMetaData.totalShowingTime);
  };

  useEffect(() => {
    if (!webcamRef.current) return;

    // reinitialize MediaRecorder
    setMediaStream(null);
    console.log("reinitialize MediaRecorder", selectedCameraInfo);
    setTimeout(async () => {
      const stream = webcamRef.current!.stream;
      if (!stream) return;
      console.log(
        "stream width, height",
        stream.getVideoTracks()[0].getSettings().deviceId,
        stream.getVideoTracks()[0].getSettings().width,
        stream.getVideoTracks()[0].getSettings().height,
        stream.getVideoTracks()[0].getSettings().frameRate
      );
      setMediaStream(stream);
    }, 1000);

    const codeReader = new BrowserQRCodeReader();
    codeReader.decodeFromVideoDevice(
      selectedCameraInfo.deviceId,
      undefined,
      (result, _err, controls) => {
        if (result) {
          if (result.getText() !== "") {
            startMetaData.fromString(result.getText());
            console.log("try to start recording", startMetaData);
            startRecording();
          }
        }
        codeReaderContlolsRef.current = controls;
      }
    );
    return () => {
      if (codeReaderContlolsRef.current) {
        codeReaderContlolsRef.current.stop();
        codeReaderContlolsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCameraInfo]);

  const captureImage = useCallback(async () => {
    try {
      const startTime = performance.now();
      if (!recordedBlobUrl) throw new Error("cannot get recordedBlobUrl");
      // convert blob to base64
      const blob = await (await fetch(recordedBlobUrl)).blob();
      const extension = blob.type.split("/")[1];
      // const base64 = await new Promise<string>((resolve) => {
      //   const reader = new FileReader();
      //   reader.readAsDataURL(blob);
      //   reader.onloadend = () => {
      //     const base64data = reader.result?.toString() ?? "";
      //     resolve(base64data);
      //   };
      //   reader.onerror = (error) => {
      //     console.log("blob load error: ", error);
      //     resolve("");
      //   };
      // });
      // if (base64 === "") throw new Error("cannot convert blob to base64");

      // capture request
      console.log("process-video request");
      const query = {
        interval: startMetaData.oneCQRShowingTime / 2,
        extension: extension,
        duration: startMetaData.totalShowingTime,
      };
      const formData = new FormData();
      const fileObj = new File([blob], "video." + extension);
      formData.append("video", fileObj);

      const searchParam = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        searchParam.append(key, value.toString());
      });
      // const baseUrl = "https://q9b0ps93-8080.asse.devtunnels.ms";
      // const baseUrl = "http://localhost:8080";
      const endPoint = "/api/process-video";
      // const requestUrl = `${baseUrl}${endPoint}?${searchParam.toString()}`;
      const requestUrl = `${endPoint}?${searchParam.toString()}`;
      const res = await fetch(requestUrl, {
        method: "POST",
        body: formData,
      });
      let endTime = performance.now();
      console.log("process-video request", endTime - startTime);
      const json = await res.json();
      endTime = performance.now();
      console.log("process-video res.json", endTime - startTime);
      // console.log("process-video res", json);
      return json.images as string[];
    } catch (e) {
      console.log("captureImage", e);
      return undefined;
    }
  }, [
    recordedBlobUrl,
    startMetaData.oneCQRShowingTime,
    startMetaData.totalShowingTime,
  ]);

  const b64ToBlob = (base64: string) => {
    // console.log("b64ToBlob");
    const bin = atob(base64.replace(/^.*,/, ""));
    const buffer = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      buffer[i] = bin.charCodeAt(i);
    }
    // Blobを作成
    try {
      const blob = new Blob([buffer.buffer], {
        type: "image/png",
      });
      return blob;
    } catch (e) {
      console.log("b64ToBlob", e);
      return undefined;
    }
  };

  const BlobToImageData = (blob: Blob) => {
    // console.log("BlobToImageData");
    const blobUrl = URL.createObjectURL(blob);
    return new Promise<ImageData | undefined>((resolve) => {
      const img = new Image();
      img.src = blobUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx === null) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };
    });
  };

  const detectQRCode = useCallback((image: ImageData) => {
    // console.log("detectQRCode");
    const startTime = performance.now();
    const code = jsQR(image.data, image.width, image.height);
    if (code) {
      return {
        topLeft: code.location.topLeftCorner,
        width: code.location.topRightCorner.x - code.location.topLeftCorner.x,
        height:
          code.location.bottomLeftCorner.y - code.location.topLeftCorner.y,
      };
    }
    const endTime = performance.now();
    console.log("detectQRCode", endTime - startTime);
    return undefined;
  }, []);

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
      let startTime: number = 0;
      let endTime: number = 0;

      startTime = performance.now();
      const gray = new cv.Mat();
      const binary = new cv.Mat();
      const dst = cv.Mat.zeros(srcImage.rows, srcImage.cols, cv.CV_8UC3);
      cv.cvtColor(srcImage, gray, cv.COLOR_RGBA2GRAY, 0);
      // cv.imshow("gray", gray);
      cv.threshold(gray, binary, 10, 200, cv.THRESH_BINARY);
      // cv.imshow("binary", binary);
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
      endTime = performance.now();
      console.log("findContours", endTime - startTime);

      // draw contours
      // const colors = [
      //   new cv.Scalar(255, 0, 0, 255),
      //   new cv.Scalar(255, 255, 255, 255),
      // ];
      let contourIdx = 0;
      const cellDatas: CellData[] = [];
      startTime = performance.now();
      while (hierarchy.intPtr(0, contourIdx)[0] !== -1) {
        // const color = colors[hierarchy.intPtr(0, contourIdx)[3] !== -1 ? 1 : 0];
        // cv.drawContours(
        //   dst,
        //   contours,
        //   contourIdx,
        //   color,
        //   1,
        //   cv.LINE_8,
        //   hierarchy,
        //   100
        // );

        // trim
        const cellRect = cv.boundingRect(contours.get(contourIdx));
        const cellCroped = srcImage.roi(cellRect);

        const colorIdx = calcColorIdxfromCellImage(cellCroped);
        // const croppedCanvas = document.createElement("canvas");
        // cv.imshow(croppedCanvas, cellCroped);
        // const croppedImageStr = croppedCanvas.toDataURL("image/png");
        const croppedImageStr = "";
        cellDatas.push({
          image: croppedImageStr,
          colorIdx,
        });

        contourIdx = hierarchy.intPtr(0, contourIdx)[0];
      }
      endTime = performance.now();
      console.log("calcCell", endTime - startTime);
      // cv.imshow("result", dst);
      dst.delete();
      gray.delete();
      binary.delete();
      contours.delete();
      hierarchy.delete();
      resolve(cellDatas);
    });
  };

  const convertToImage = (decodedCQrDataList: CellData[][]) => {
    const totalCellData = decodedCQrDataList.flat();
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

  const executeHandler = async (srcImageList: ImageObject[]) => {
    const startTime = performance.now();
    setCellImageColorIdxList([]);
    const decodedCQrDataList: CellData[][] = [];
    let src = new cv.Mat();
    for (const srcImage of srcImageList) {
      const p = new Promise<void>((resolve) => {
        const startTime = performance.now();
        const img = new Image();
        // img.src = URL.createObjectURL(srcImage);
        img.src = srcImage.str;
        img.onload = async () => {
          src = cv.imread(img);
          const decodedCQrData = (await cropeCellImage(src)).reverse();
          if (decodedCQrData.length === 0) {
            resolve();
          }
          const cQrPrefix = parseInt(
            decodedCQrData
              .slice(0, CQR_ROW_NUM)
              .map((d) =>
                decimalToBitArray(d.colorIdx, cQrCellColorRange).join("")
              )
              .join(""),
            2
          );
          if (decodedCQrDataList.length < cQrPrefix + 1) {
            decodedCQrDataList.push([]);
          }
          decodedCQrDataList[cQrPrefix] = decodedCQrData.slice(CQR_ROW_NUM);
          const endTime = performance.now();
          console.log("decodeImage", endTime - startTime);
          resolve();
        };
      });
      await p;
    }
    // console.log(decodedCQrDataList.flat().length);
    setCellImageColorIdxList(decodedCQrDataList.flat());
    convertToImage(decodedCQrDataList);
    const endTime = performance.now();
    console.log("total", endTime - startTime);
    src.delete();
  };

  const execProcess = async () => {
    if (!recordedBlobUrl || capturedImageList.length !== 0) return;
    console.log("start capture", startMetaData, recordedBlobUrl);
    const images = await captureImage();
    if (!images) {
      console.log("capture failed");
      return;
    }
    console.log("capture success", images.length);
    const startTime = performance.now();
    const dataList: ImageObject[] = [];
    let qrCodePosition: QRCodePosition | undefined = undefined;
    let lastImageIsQR = false;
    let isCQRPart = false;
    for (const [idx, image] of images.entries()) {
      // console.log("image", idx);
      const blob = b64ToBlob(image);
      if (!blob) throw new Error("cannot convert base64 to blob");
      const imageData = await BlobToImageData(blob);
      if (!imageData) throw new Error("cannot convert blob to imageData");
      try {
        const detected = detectQRCode(imageData);
        console.log("detected", detected !== undefined);
        if (detected) {
          qrCodePosition = detected;
          lastImageIsQR = true;
          console.log("detected", idx);
          if (isCQRPart) break;
          continue;
        }
        if (!qrCodePosition) continue;
        if (lastImageIsQR) {
          isCQRPart = true;
        }
        lastImageIsQR = false;
        // crop image
        // console.log("create canvas");
        const canvas = document.createElement("canvas");
        // console.log("set size");
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        // console.log("get ctx");
        const ctx = canvas.getContext("2d");
        if (ctx === null) continue;
        // console.log("put src");
        ctx.putImageData(imageData, 0, 0);
        // console.log("crop");
        const cropped = ctx.getImageData(
          qrCodePosition.topLeft.x,
          qrCodePosition.topLeft.y,
          qrCodePosition.width,
          qrCodePosition.height
        );
        // console.log("clear");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = cropped.width;
        canvas.height = cropped.height;
        // console.log("put cropped");
        ctx.putImageData(cropped, 0, 0);
        // console.log("push", idx);
        dataList.push({
          data: cropped,
          str: canvas.toDataURL("image/png"),
        });
      } catch (e) {
        console.log(e);
        dataList.push({ data: imageData, str: URL.createObjectURL(blob) });
      }
    }
    console.log("dataList", dataList.length);
    const endTime = performance.now();
    console.log("capture", endTime - startTime);
    executeHandler(dataList);
    setCapturedImageList(dataList);
    // try {
    //   const video = document.createElement("video");
    //   video.src = recordedBlobUrl;
    //   video.currentTime = Number.MAX_SAFE_INTEGER;
    //   video.autoplay = true;
    //   video.muted = true;
    //   video.playsInline = true;
    //   video.onloadeddata = async () => {
    //     const duration = video.duration * 1000;
    //     console.log("duration", duration);
    //     const canvas = document.createElement("canvas");
    //     canvas.width = video.videoWidth;
    //     canvas.height = video.videoHeight;
    //     const ctx = canvas.getContext("2d");
    //     if (ctx === null) return;
    //     let currentTime = 0;
    //     let qrCodePosition: QRCodePosition | undefined = undefined;
    //     for (;;) {
    //       console.log(currentTime);
    //       if (currentTime >= duration) break;
    //       // video to image
    //       currentTime += startMetaData.oneCQRShowingTime / 2;
    //       video.currentTime = currentTime / 1000;
    //       await video.play();
    //       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    //       const image = ctx.getImageData(0, 0, canvas.width, canvas.height);

    //       // detect QR code
    //       const detected = detectQRCode(image);
    //       if (detected) {
    //         qrCodePosition = detected;
    //         continue;
    //       }

    //       if (!qrCodePosition) throw new Error("cannot detect QR code");

    //       // crop image
    //       const cropped = ctx.getImageData(
    //         qrCodePosition.topLeft.x,
    //         qrCodePosition.topLeft.y,
    //         qrCodePosition.width,
    //         qrCodePosition.height
    //       );
    //       ctx.clearRect(0, 0, canvas.width, canvas.height);
    //       ctx.putImageData(cropped, 0, 0);
    //       const croppedStr = canvas.toDataURL("image/png");
    //       capturedImageList.push({ data: cropped, str: croppedStr });
    //     }
    //     console.log(capturedImageList.length);
    //     return video.pause();
    //   };

    //   video.load();
    // } catch (e) {
    //   console.log(e);
    // }
  };

  useEffect(() => {
    if (!recordedBlobUrl) return;
    execProcess();
  }, [recordedBlobUrl]);

  return (
    <div>
      <h1>From CQR Page</h1>
      <Webcam
        audio={false}
        videoConstraints={{
          deviceId: selectedCameraInfo.deviceId,
          width: {
            ideal: selectedCameraInfo.width,
            max: 1920,
          },
          height: {
            ideal: selectedCameraInfo.height,
            max: 1080,
          },
        }}
        ref={webcamRef}
        width={640}
      ></Webcam>
      <br />
      {/* {recordedBlobUrl !== "" && (
        <video src={recordedBlobUrl} autoPlay controls loop />
      )} */}
      <br />
      {mediaStream && (
        <MediaRecorder
          customStream={mediaStream}
          // width={selectedCameraInfo.width}
          // height={selectedCameraInfo.height}
          recording={recording}
          resultSetter={setRecordedBlobUrl}
        />
      )}
      <select
        value={cameraList.findIndex(
          (camera) => camera.deviceId === selectedCameraInfo.deviceId
        )}
        onChange={(e) => {
          setSelectedCameraInfo(
            getCameraInfo(
              cameraList[parseInt(e.target.value)] as InputDeviceInfo
            )
          );
        }}
      >
        {cameraList.map((camera, idx) => (
          <option value={idx} key={camera.deviceId}>
            {camera.label}
          </option>
        ))}
      </select>
      <br />
      {recording ? (
        <button onClick={undefined} className="secondary">
          Stop
        </button>
      ) : (
        <button onClick={undefined} className="primary">
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
        <button className="primary" onClick={undefined}>
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
          {capturedImageList.map((image, idx) => (
            <div style={{ marginTop: "10px" }}>
              <img src={image.str} key={idx} />
            </div>
          ))}
        </div>
      )}

      <h3>converted image</h3>
      {convertedImageStr && <img src={convertedImageStr} />}
    </div>
  );
};

export default FromCQrPage;
