export class StartQRData {
  constructor() {
    this.totalCQRCount = 0;
    this.cellCountOnOneSide = 0;
    this.metaCellCount = 0;
    this.totalShowingTime = 0; // in ms
    this.OneCQRShowingTime = 0; // in ms
  }

  totalCQRCount: number;
  cellCountOnOneSide: number;
  metaCellCount: number;
  totalShowingTime: number; // in ms
  OneCQRShowingTime: number; // in ms

  // Returns a string with each value in order, delimited by ","
  toString() {
    return [
      this.totalCQRCount,
      this.cellCountOnOneSide,
      this.metaCellCount,
      this.totalShowingTime,
      this.OneCQRShowingTime,
    ].join(",");
  }

  fromString(str: string) {
    const values = str.split(",");
    this.totalCQRCount = parseInt(values[0]);
    this.cellCountOnOneSide = parseInt(values[1]);
    this.metaCellCount = parseInt(values[2]);
    this.totalShowingTime = parseInt(values[3]);
    this.OneCQRShowingTime = parseInt(values[4]);
  }
}
