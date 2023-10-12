import { useState } from "react";

const ToQrPage = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);

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
    // TODO: Implement QR code generation logic
    console.log(imageString);
    return Promise.resolve("QR code string");
  };

  const [qrCodeString, setQrCodeString] = useState<string | null>(null);

  const handleShowQrCode = async () => {
    if (imageFile) {
      try {
        const imageString = await convertImageToString(imageFile);
        const qrCodeString = await convertStringToQrCode(imageString);
        setQrCodeString(qrCodeString);
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
      {qrCodeString && <img src={qrCodeString} alt="QR Code" />}
    </div>
  );
};

export default ToQrPage;
