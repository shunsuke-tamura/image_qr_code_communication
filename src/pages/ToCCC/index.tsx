import "./style.css";

const ToCCCPage = () => {
  return (
    <div className="bg">
      <h1 className="primary-text">ToCCCPage</h1>
      <div className="ccc-container">
        <div className="row">
          {[...Array(15)].map(() => (
            <div className="code-container">
              <a className="code">A</a>
            </div>
          ))}
        </div>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
        <a className="code">B</a>
      </div>
    </div>
  );
};

export default ToCCCPage;
