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
    setCapturing(true);
    mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
      mimeType: "video/webm",
    });
    mediaRecorderRef.current.addEventListener(
      "dataavailable",
      handleDataAvailable
    );
    mediaRecorderRef.current.start();
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
          console.log(result);
          // controls.stop();
          if (result.getText() === "start") {
            setCapturing(true);
          }
          if (result.getText() === "stop") {
            setCapturing(false);
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
  }, [handleStopCaptureClick]);

  // interval[ms]
  const cutVideo = (interval: number) => {
    const video = document.createElement("video");
    const superBuffer = new Blob(recordedChunks, { type: "video/webm" });
    video.src = URL.createObjectURL(superBuffer);
    video.currentTime = Number.MAX_SAFE_INTEGER;

    video.onloadeddata = async () => {
      const duration = video.duration;
      console.log(duration);

      // video to image
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;
      let currentTime = 0;
      for (let i = 0; i < 3; i < i++) {
        if (currentTime >= duration) break;
        video.currentTime = currentTime;
        await video.play();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL("image/png");
        console.log(currentTime);

        setVideoParts((prev) => [...prev, image]);
        currentTime += interval / 1000;
      }
      return video.pause();
    };

    video.load();
  };

  const combineQrCodeDatas = () => {
    const binaryString = qrCodeDatas.join("");
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
    const binaryString = combineQrCodeDatas();
    const binary = binaryStringToBinary(binaryString);
    const imageDataUrl = convertBinaryToImageDataUrl(binary);
    setImage(imageDataUrl);
  };

  return (
    <div>
      {/* <div className="modal-container"> */}
      {/* <video ref={ref}></video> */}
      <Webcam audio={false} ref={webcamRef}></Webcam>
      {capturing ? (
        <button onClick={handleStopCaptureClick} className="primary">
          Stop
        </button>
      ) : (
        <button onClick={handleStartCaptureClick} className="secondary">
          Start
        </button>
      )}
      <button onClick={() => cutVideo(500)} className="secondary">
        Cut
      </button>
      {videoParts.map((videoPart, idx) => (
        <img src={videoPart} alt="video part" key={idx} />
      ))}
      {/* </div> */}
      {/* <div style={{ zIndex: 1 }}> */}
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
