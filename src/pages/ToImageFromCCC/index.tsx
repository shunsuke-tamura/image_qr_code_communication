declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cv: any;
  }
}

const ToImageFromCCCPage = () => {
  const cv = window.cv;

  const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const img = new Image();
      img.onload = () => {
        const mat = cv.imread(img);
        cv.imshow("output", mat);
        mat.delete();
      };
      img.src = URL.createObjectURL(e.target.files[0]);
    }
  };

  return (
    <div>
      <h1>to-image-from-ccc</h1>

      <div>
        <input type="file" onChange={onChangeFile} />
      </div>
      <canvas id="output" />
    </div>
  );
};

export default ToImageFromCCCPage;
