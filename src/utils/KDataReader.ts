import { isNil } from 'lodash';
import {
  getAttr,
  getBigInt,
  getBigInts,
  getBool,
  getBuffer,
  getContent,
  getElement,
  getElements,
  getNumber,
  getNumbers,
  getStr,
} from './KBinJSON';

export class KDataReader {
  public obj: any = null;
  constructor(obj: any) {
    this.obj = obj;
  }

  attr(path?: string) {
    return getAttr(this.obj, path);
  }

  bigint(path: string, def?: bigint): bigint {
    return getBigInt(this.obj, path, def);
  }

  bigints(path: string, def?: bigint[]): bigint[] {
    return getBigInts(this.obj, path, def);
  }

  bool(path: string): boolean {
    return getBool(this.obj, path);
  }

  buffer(path: string, def?: Buffer): Buffer {
    return getBuffer(this.obj, path, def);
  }

  content(path: string, def?: any): any {
    return getContent(this.obj, path, def);
  }

  element(path: string): KDataReader {
    const ele = getElement(this.obj, path);
    if (isNil(ele)) return null;
    return new KDataReader(ele);
  }

  elements(path: string): KDataReader[] {
    const ele = getElements(this.obj, path);
    if (isNil(ele)) return [];
    return ele.map(e => new KDataReader(e));
  }

  number(path: string, def?: number): number {
    return getNumber(this.obj, path, def);
  }

  numbers(path: string, def?: number[]): number[] {
    return getNumbers(this.obj, path, def);
  }

  str(path: string, def?: string): string {
    return getStr(this.obj, path, def);
  }
}
