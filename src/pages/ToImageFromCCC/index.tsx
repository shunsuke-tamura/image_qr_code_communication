import { useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cv: any;
  }
}

const ToImageFromCCCPage = () => {
  const cv = window.cv;

  const [charImageStrList, setCharImageStrList] = useState<string[]>([]);
  const [show, setShow] = useState<boolean>(false);

  const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const img = new Image();
      img.onload = () => {
        const mat = cv.imread(img);
        cv.imshow("input", mat);
        mat.delete();
      };
      img.src = URL.createObjectURL(e.target.files[0]);
    }
  };

  const cropImage = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    src: any,
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    const dst = src.roi(rect);
    const croppedCanvas = document.createElement("canvas");
    cv.imshow(croppedCanvas, dst);
    const croppedImageStr = croppedCanvas.toDataURL("image/png");
    dst.delete();
    return croppedImageStr;
  };

  const executeFindContours = () => {
    setCharImageStrList([]);
    const src = cv.imread("input");
    const gray = new cv.Mat();
    const binary = new cv.Mat();
    const dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.imshow("gray", gray);
    cv.threshold(gray, binary, 120, 200, cv.THRESH_BINARY);
    cv.imshow("binary", binary);
    // detect rectangles
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(
      binary,
      contours,
      hierarchy,
      cv.RETR_CCOMP, // RETR_EXTERNAL, RETR_LIST, RETR_CCOMP, RETR_TREE,
      cv.CHAIN_APPROX_SIMPLE
    );
    console.log("contours.size(): " + contours.size());
    // draw contours
    const colors = [
      new cv.Scalar(255, 0, 0, 255),
      new cv.Scalar(255, 255, 255, 255),
    ];
    // a.最後[contour] -> b.その親[contour] -> c.prev[int] = codeContainerIdx
    const a = hierarchy.intPtr(0, contours.size() - 1);
    const b = hierarchy.intPtr(0, a[3]);
    const c = b[1];
    const codeContainerIdx = c;
    for (let i = 0; i < contours.size(); ++i) {
      const color = colors[hierarchy.intPtr(0, i)[3] !== -1 ? 1 : 0];

      // if (hierarchy.intPtr(0, i)[3] === -1) {
      if (hierarchy.intPtr(0, i)[3] !== codeContainerIdx) {
        // if (i !== 2008) {
        continue;
      }
      console.log(
        i,
        hierarchy.intPtr(0, i)[0],
        hierarchy.intPtr(0, i)[1],
        hierarchy.intPtr(0, i)[2],
        hierarchy.intPtr(0, i)[3]
      );
      cv.drawContours(dst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);

      // trim
      const rect = cv.boundingRect(contours.get(i));
      const croppedImageStr = cropImage(src, rect);
      setCharImageStrList((prev) => [...prev, croppedImageStr]);
    }
    // show result
    cv.imshow("result", dst);
    src.delete();
    dst.delete();
    gray.delete();
    binary.delete();
    contours.delete();
    hierarchy.delete();
  };

  // 配列をn個ずつに分割する
  const splitArray = <T,>(array: T[], n: number): T[][] => {
    const result = [];
    for (let i = 0; i < array.length; i += n) {
      result.push(array.slice(i, i + n));
    }
    return result;
  };

  return (
    <div>
      <h1>to-image-from-ccc</h1>

      <div>
        <input type="file" onChange={onChangeFile} />
      </div>
      <div>
        <button className="primary" onClick={executeFindContours}>
          Try it
        </button>
      </div>

      <h3>input</h3>
      <canvas id="input" />
      <h3>gray scale</h3>
      <canvas id="gray" />
      <h3>binarization</h3>
      <canvas id="binary" />
      <h3>result</h3>
      <canvas id="result" />

      <div>
        <button
          className={show ? "secondary" : "primary"}
          onClick={() => setShow((prev) => !prev)}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {show && (
        <div>
          {splitArray(charImageStrList, 8).map((charImageStrList) => (
            <div style={{ display: "flex" }}>
              {charImageStrList.map((charImageStr) => (
                <div>
                  <img style={{ margin: "2px" }} src={charImageStr} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToImageFromCCCPage;
