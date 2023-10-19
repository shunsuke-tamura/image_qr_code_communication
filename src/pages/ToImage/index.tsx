import { useCallback, useEffect, useRef, useState } from "react";
import "./style.css";
import Webcam from "react-webcam";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

const ToImagePage = () => {
  const [scan, setScan] = useState(true);
  const [image, setImage] = useState("");
  const [qrCodeDatas, setQrCodeDatas] = useState<string[]>([]);
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoParts, setVideoParts] = useState<string[]>([]);
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
          video.currentTime = currentTime;
          await video.play();
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = canvas.toDataURL("image/png");
          setVideoParts((prev) => [...prev, image]);
          currentTime += interval / 1000;
        }
        return video.pause();
      };

      video.load();
    } catch (e) {
      console.log(e);
    }
  };

  const decodeQrCode = (imageDataUrl: string) => {
    const codeReader = new BrowserQRCodeReader();
    codeReader.decodeFromImageUrl(imageDataUrl).then((result) => {
      if (result) {
        setQrCodeDatas((prev) => [...prev, result.getText()]);
      }
    });
  };

  const combineQrCodeDatas = () => {
    const imageDatas: string[] = [];
    qrCodeDatas.forEach((qrCodeData) => {
      const qrCodeDataSplit = qrCodeData.split(",");
      const index = Number(qrCodeDataSplit[0]);
      const data = qrCodeDataSplit[1];
      imageDatas[index] = data;
      console.log(index);
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

  const handleConvertToImage = () => {
    cutVideo(500);
    console.log(videoParts);

    videoParts.forEach((videoPart) => decodeQrCode(videoPart));
    const binaryString = combineQrCodeDatas();
    const binary = binaryStringToBinary(binaryString);
    const imageDataUrl = convertBinaryToImageDataUrl(binary);
    setImage(imageDataUrl);
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
      {showImages &&
        videoParts.map((videoPart, idx) => (
          <img src={videoPart} alt="video part" key={idx} />
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
