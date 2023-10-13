import { useRef, useState } from "react";
import QRcode from "qrcode";

const ToQrPage = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const convertImageToString = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsBinaryString(file);
      reader.onload = () => {
        const imageString = reader.result?.toString();
        if (imageString) {
          resolve(imageString);
        } else {
          reject(new Error("Failed to convert image to base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const convertStringToQrCode = (imageString: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      QRcode.toDataURL(
        imageString,
        { errorCorrectionLevel: "L", version: 30, mode: "byte" },
        (err: Error | null, url?: string) => {
          if (err) {
            reject(err);
          } else if (url) {
            resolve(url);
          }
        }
      );
    });
  };

  // const qrCodes: string[] = [];
  // const [qrCodeIdx, setQrCodeIdx] = useState<number>(0);
  const [qrCodes, setQrCodes] = useState<string[]>([]);

  const handleShowQrCode = async () => {
    const splitString = (str: string, chunkSize: number) => {
      const chunks = [];
      for (let i = 0; i < str.length; i += chunkSize) {
        chunks.push(str.slice(i, i + chunkSize));
      }
      return chunks;
    };

    if (imageFile) {
      try {
        const imageString = await convertImageToString(imageFile);
        // const qrCodeStringChunks = splitString(imageString, 1987); // 2953 is the max size of a QR code
        const qrCodeStringChunks = splitString(imageString, 1100); // 2953 is the max size of a QR code
        for (let i = 0; i < qrCodeStringChunks.length; i++) {
          const qrCodeString = await convertStringToQrCode(
            qrCodeStringChunks[i]
          );
          // qrCodes.push(qrCodeString);
          setQrCodes((prevQrCodes) => [...prevQrCodes, qrCodeString]);
        }
        console.log(qrCodes);
        // const handleQrCode = async () => {
        //   // delay to 500ms to prevent the browser from crashing
        //   await new Promise((resolve) => setTimeout(resolve, 1000));
        //   const ctx = canvasRef.current?.getContext("2d");
        //   if (!ctx) return;
        //   ctx.clearRect(0, 0, 500, 500);
        //   const qrCode = new Image();
        //   qrCode.src = qrCodes[qrCodeIdx];
        //   qrCode.onload = () => {
        //     ctx.drawImage(qrCode, 0, 0, 500, 500);
        //   };
        //   setQrCodeIdx((prevQrCodeIdx) => {
        //     console.log((prevQrCodeIdx + 1) % qrCodes.length);
        //     return (prevQrCodeIdx + 1) % qrCodes.length;
        //   });
        //   window.requestAnimationFrame(handleQrCode);
        // };
        // window.requestAnimationFrame(handleQrCode);
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <br />
      <button className="primary" onClick={handleShowQrCode}>
        Show QR Code
      </button>
      <br />
      {/* <canvas width={500} height={500} ref={canvasRef}></canvas> */}
      {qrCodes.map((qrCode, idx) => (
        <div
          key={idx}
          style={{
            padding: "80px",
            backgroundColor: "white",
            margin: "20px 0",
          }}
        >
          <img src={qrCode} alt="qr code" />
        </div>
      ))}
    </div>
  );
};

export default ToQrPage;
