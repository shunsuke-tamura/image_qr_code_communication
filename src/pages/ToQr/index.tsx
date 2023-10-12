import { useState } from "react";

const ToQrPage = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result?.toString();
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error("Failed to convert image to base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const convertBase64ToQrCode = (base64String: string): Promise<string> => {
    // TODO: Implement QR code generation logic
    console.log(base64String);
    return Promise.resolve("QR code string");
  };

  const [qrCodeString, setQrCodeString] = useState<string | null>(null);

  const handleShowQrCode = async () => {
    if (imageFile) {
      try {
        const base64String = await convertImageToBase64(imageFile);
        const qrCodeString = await convertBase64ToQrCode(base64String);
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
