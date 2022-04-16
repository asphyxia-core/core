import * as fs from 'fs';

export class IFS {
  private path: string;
  private stream: fs.ReadStream;

  constructor(path: string) {
    this.path = path;
  }

  public async open() {
    this.stream = fs.createReadStream(this.path);
    return new Promise<void>((resolve, reject) => {
      this.stream.on('open', () => {
        const header = this.stream.read(36);
        resolve();
      });

      this.stream.on('error', err => {
        reject(err);
      });
    });
  }

  public async close() {
    this.stream.close();
    this.stream = null;
  }
}
