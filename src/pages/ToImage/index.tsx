import { useCallback, useEffect, useRef, useState } from "react";
import "./style.css";
import Webcam from "react-webcam";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import jsQR from "jsqr";
import MediaRecorder from "../fromCQr/MediaRecorder";

type PartData = {
  data: ImageData;
  dataStr: string; // base64
};

type CameraInfo = {
  deviceId: string;
  width: number;
  height: number;
};

const ToImagePage = () => {
  const [scan, setScan] = useState(true);
  const [image, setImage] = useState("");
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoParts, setVideoParts] = useState<PartData[]>([]);
  const codeReaderContlolsRef = useRef<IScannerControls | null>();
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([]);
  const [showImages, setShowImages] = useState<boolean>(false);
  const [selectedCameraInfo, setSelectedCameraInfo] = useState<CameraInfo>({
    deviceId: "",
    width: 0,
    height: 0,
  });
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const recorded = useRef<boolean>(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string>("");
  const startMetaData = {
    totalShowingTime: 1900,
    interval: 50,
    width: 720,
    height: 1280,
  };

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
    console.log("start recording");
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
            if (result.getText() === "start") {
              console.log("try to start recording", startMetaData);
              startRecording();
            }
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

  const b64ToBlob = (base64: string) => {
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
    console.log("BlobToImageData");
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

  // interval[ms]
  const cutVideo = async (interval: number) => {
    try {
      console.log("cutVideo");
      const blob = await (await fetch(recordedBlobUrl)).blob();
      const extension = blob.type.split("/")[1];
      const dataUrl = URL.createObjectURL(blob);
      console.log("blob", blob.size);
      console.log("dataUrl", dataUrl);
      console.log("process-video request");
      const query = {
        interval: interval,
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
      console.log("res");
      const json = await res.json();
      console.log("process-video res", json);
      const imageObjectList: PartData[] = [];
      for (const imageStr of json.images as string[]) {
        const blob = b64ToBlob(imageStr);
        if (!blob) {
          console.log("blob is undefined");
          continue;
        }
        const imageData = await BlobToImageData(blob);
        if (!imageData) {
          console.log("imageData is undefined");
          continue;
        }
        imageObjectList.push({ data: imageData, dataStr: imageStr });
      }
      setVideoParts(imageObjectList);
    } catch (e) {
      console.log(e);
    }
    // try {
    //   const video = document.createElement("video");
    //   const superBuffer = new Blob(recordedChunks, {
    //     type: MediaRecorder.isTypeSupported("video/webm")
    //       ? "video/webm"
    //       : "video/mp4",
    //   });
    //   video.src = URL.createObjectURL(superBuffer);
    //   video.currentTime = Number.MAX_SAFE_INTEGER;
    //   video.onloadeddata = async () => {
    //     const duration = video.duration;
    //     // video to image
    //     const canvas = document.createElement("canvas");
    //     canvas.width = video.videoWidth;
    //     canvas.height = video.videoHeight;
    //     const ctx = canvas.getContext("2d");
    //     if (ctx === null) return;
    //     let currentTime = 0;
    //     for (;;) {
    //       if (currentTime >= duration) break;
    //       currentTime += interval / 1000;
    //       video.currentTime = currentTime;
    //       await video.play();
    //       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    //       const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    //       const imageStr = canvas.toDataURL("image/png");
    //       setVideoParts((prev) => [
    //         ...prev,
    //         { data: image, dataStr: imageStr },
    //       ]);
    //     }
    //     return video.pause();
    //   };

    //   video.load();
    // } catch (e) {
    //   console.log(e);
    // }
  };

  useEffect(() => {
    if (recordedBlobUrl === "") return;
    cutVideo(startMetaData.interval);
  }, [recordedBlobUrl]);

  const decodeQrCode = (partData: PartData, idx: number) => {
    const code = jsQR(
      partData.data.data,
      partData.data.width,
      partData.data.height
    );
    if (code) {
      return code.data;
    } else {
      console.log(idx, "not found");
    }
  };

  const combineQrCodeDatas = (qrCodeDatas: string[]) => {
    const imageDatas: string[] = [];
    qrCodeDatas.forEach((qrCodeData) => {
      const prefix = Number(qrCodeData.substring(0, 3));
      const data = qrCodeData.substring(4);
      console.log("prefix: ", prefix);
      if (!Number.isNaN(prefix)) {
        if (imageDatas.length <= prefix) {
          imageDatas.push(data);
        } else {
          imageDatas[prefix] = data;
        }
      } else {
        console.log("NaN: ", qrCodeData);
      }
    });
    const binaryString = imageDatas.join("");
    return binaryString;
  };

  const binaryStringToBinary = (binaryString: string) => {
    const binary = [];
    for (let i = 0; i < binaryString.length; i++) {
      binary.push(binaryString.charCodeAt(i));
    }
    return binary;
  };

  const convertBinaryToImageDataUrl = (binary: number[]) => {
    const blob = new Blob([new Uint8Array(binary)], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    return url;
  };

  const handleConvertToImage = async (videoParts: PartData[]) => {
    // await cutVideo(50);
    // delay 2s
    // TODO cutをPromise化してawaitできるようにする
    // await new Promise((resolve) => setTimeout(resolve, 2000));
    // setVideoParts((prev) => {
    //   const qrDatas: string[] = [];
    //   prev.forEach((videoPart, idx) => {
    //     const data = decodeQrCode(videoPart, idx);
    //     if (data) {
    //       qrDatas.push(data);
    //     }
    //   });
    //   const binaryString = combineQrCodeDatas(qrDatas);
    //   const binary = binaryStringToBinary(binaryString);
    //   const imageDataUrl = convertBinaryToImageDataUrl(binary);
    //   setImage(imageDataUrl);
    //   return prev;
    // });
    const qrDatas: string[] = [];
    videoParts.forEach((videoPart, idx) => {
      const data = decodeQrCode(videoPart, idx);
      if (data) {
        qrDatas.push(data);
      }
    });
    const binaryString = combineQrCodeDatas(qrDatas);
    const binary = binaryStringToBinary(binaryString);
    const imageDataUrl = convertBinaryToImageDataUrl(binary);
    setImage(imageDataUrl);
  };

  useEffect(() => {
    if (videoParts.length === 0) return;
    handleConvertToImage(videoParts);
  }, [videoParts]);

  return (
    <div>
      <Webcam
        audio={false}
        ref={webcamRef}
        videoConstraints={{ deviceId: selectedCameraInfo.deviceId }}
      ></Webcam>
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
      {!showImages ? (
        <button onClick={() => setShowImages(true)} className="primary">
          Show
        </button>
      ) : (
        <button onClick={() => setShowImages(false)} className="secondary">
          Hide
        </button>
      )}
      <br />
      {showImages &&
        videoParts.map((videoPart, idx) => (
          <div>
            {idx} <br />
            <img src={videoPart.dataStr} alt="video part" key={idx} />
          </div>
        ))}
      <div>
        <h1>ToImagePage</h1>
        <button className="primary" onClick={() => setScan(true)}>
          Scan
        </button>
        <button className="secondary" onClick={undefined}>
          Convert to Image
        </button>
        <br />
        {image !== "" && <img src={image} alt="generated image" />}
      </div>
    </div>
  );
};

export default ToImagePage;
