import { useCallback, useEffect, useRef, useState } from "react";
import "./style.css";
import Webcam from "react-webcam";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import jsQR from "jsqr";

type PartData = {
  data: ImageData;
  dataStr: string; // base64
};

const ToImagePage = () => {
  const [scan, setScan] = useState(true);
  const [image, setImage] = useState("");
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoParts, setVideoParts] = useState<PartData[]>([]);
  const controlsRef = useRef<IScannerControls | null>();
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([]);
  const [showImages, setShowImages] = useState<boolean>(false);

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

  useEffect(() => {
    if (webcamRef.current === null) return;
    const codeReader = new BrowserQRCodeReader();
    codeReader.decodeFromVideoDevice(
      undefined,
      webcamRef.current.video as HTMLVideoElement,
      (result, _err, controls) => {
        if (result) {
          if (result.getText() === "start") {
            handleStartCaptureClick();
          }
          if (result.getText() === "stop") {
            handleStopCaptureClick();
          }
        }
        controlsRef.current = controls;
      }
    );
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [handleStartCaptureClick, handleStopCaptureClick]);

  // interval[ms]
  const cutVideo = (interval: number) => {
    try {
      const video = document.createElement("video");
      const superBuffer = new Blob(recordedChunks, {
        type: MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4",
      });
      video.src = URL.createObjectURL(superBuffer);
      video.currentTime = Number.MAX_SAFE_INTEGER;
      video.onloadeddata = async () => {
        const duration = video.duration;
        // video to image
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx === null) return;
        let currentTime = 0;
        for (;;) {
          if (currentTime >= duration) break;
          currentTime += interval / 1000;
          video.currentTime = currentTime;
          await video.play();
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const imageStr = canvas.toDataURL("image/png");
          setVideoParts((prev) => [
            ...prev,
            { data: image, dataStr: imageStr },
          ]);
        }
        return video.pause();
      };

      video.load();
    } catch (e) {
      console.log(e);
    }
  };

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

  const handleConvertToImage = async () => {
    cutVideo(50);
    // delay 2s
    // TODO cutをPromise化してawaitできるようにする
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setVideoParts((prev) => {
      const qrDatas: string[] = [];
      prev.forEach((videoPart, idx) => {
        const data = decodeQrCode(videoPart, idx);
        if (data) {
          qrDatas.push(data);
        }
      });
      const binaryString = combineQrCodeDatas(qrDatas);
      const binary = binaryStringToBinary(binaryString);
      const imageDataUrl = convertBinaryToImageDataUrl(binary);
      setImage(imageDataUrl);
      return prev;
    });
  };

  return (
    <div>
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
        <button className="secondary" onClick={handleConvertToImage}>
          Convert to Image
        </button>
        <br />
        {image !== "" && <img src={image} alt="generated image" />}
      </div>
    </div>
  );
};

export default ToImagePage;
