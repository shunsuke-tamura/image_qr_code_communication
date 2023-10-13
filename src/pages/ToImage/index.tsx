import { useState } from "react";
import { useZxing } from "react-zxing";
import "./style.css";

const ToImagePage = () => {
  const [scan, setScan] = useState(true);
  const [image, setImage] = useState("");
  const [qrCodeDatas, setQrCodeDatas] = useState<string[]>([]);

  const { ref } = useZxing({
    paused: !scan,
    onDecodeResult(result) {
      setScan(false);
      setQrCodeDatas((prev) => [...prev, result.getText()]);
    },
  });

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
      <video ref={ref}></video>
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
