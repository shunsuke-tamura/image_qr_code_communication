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
        cv.imshow("input", mat);
        mat.delete();
      };
      img.src = URL.createObjectURL(e.target.files[0]);
    }
  };

  const executeFindContours = () => {
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
    for (let i = 0; i < contours.size(); ++i) {
      // const color = new cv.Scalar(
      //   Math.round(Math.random() * 255),
      //   Math.round(Math.random() * 255),
      //   Math.round(Math.random() * 255)
      // );
      const color = colors[hierarchy.intPtr(0, i)[3] !== -1 ? 1 : 0];
      // if (hierarchy.intPtr(0, i)[3] === -1) {
      //   continue;
      // }
      // console.log(hierarchy.intPtr(0, i)[3]);
      cv.drawContours(dst, contours, i, color, 1, cv.LINE_8, hierarchy, 100);
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
    </div>
  );
};

export default ToImageFromCCCPage;
