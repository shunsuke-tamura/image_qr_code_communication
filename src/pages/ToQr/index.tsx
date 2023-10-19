import { useEffect, useRef, useState } from "react";
import QRcode from "qrcode";

const ToQrPage = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [qrCodes, setQrCodes] = useState<string[]>([]);
  const [showingQrCodeIndex, setShowingQrCodeIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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
        { errorCorrectionLevel: "L", version: 13, mode: "byte" },
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

  const startShowingQrCode = (qrCodeNum: number) => {
    console.log("start showing qr code");

    const longInterval = 1000;
    const shortInterval = 100;
    const qrHandler = (showIndex: number) => {
      console.log(showIndex);
      setShowingQrCodeIndex(showIndex);
      timerRef.current = setTimeout(
        () => qrHandler((showIndex + 1) % qrCodeNum),
        showIndex === 0 || showIndex === qrCodeNum - 1
          ? longInterval
          : shortInterval
      );
    };
    qrHandler(0);
  };

  useEffect(() => {
    return () => {
      console.log("stop showing qr code");
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timerRef]);

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
        // const qrCodeStringChunks = splitString(imageString, 1100); // 2953 is the max size of a QR code
        const qrCodeStringChunks = splitString(imageString, 271); // 2953 is the max size of a QR code
        const temp: string[] = [await convertStringToQrCode("start")];
        for (let i = 0; i < qrCodeStringChunks.length; i++) {
          const qrCodeString = await convertStringToQrCode(
            `${("000" + i).slice(-3)},${qrCodeStringChunks[i]}`
          );
          temp.push(qrCodeString);
        }
        temp.push(await convertStringToQrCode("stop"));
        console.log(temp.length, qrCodeStringChunks.length);
        setQrCodes(temp);
        startShowingQrCode(temp.length);
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
      {qrCodes.length !== 0 ? (
        <div style={{ backgroundColor: "white", padding: "70px" }}>
          <img src={qrCodes[showingQrCodeIndex]} alt="qr code" />
        </div>
      ) : null}
    </div>
  );
};

export default ToQrPage;
