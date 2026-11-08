import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidStorageKey, type MediaStorage } from "./storage";

/** 개발·시험 전용 저장소. 경로는 서버가 만든 키 형식만 받는다 (경로 탈출 불가). */
export function createLocalStorage(dir: string): MediaStorage & { read(key: string): Promise<Buffer | null> } {
  const root = path.resolve(dir);
  const file = (key: string) => {
    if (!isValidStorageKey(key)) throw new Error("허용되지 않는 저장 경로입니다.");
    return path.join(root, key);
  };
  return {
    kind: "local",
    async put(key, data) {
      const target = file(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data, { flag: "wx" });
      return { url: `/media-dev/${key.replace(/^media\//, "")}` };
    },
    async remove(key) {
      await rm(file(key), { force: true });
    },
    async read(key) {
      try {
        return await readFile(file(key));
      } catch {
        return null;
      }
    },
  };
}
