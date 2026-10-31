import type { StaticImageData } from "next/image";

import airSensors from "./assets/air-sensors.webp";
import bikeMap from "./assets/bike-map.webp";
import solidityBook from "./assets/solidity-book.webp";
import toolLibrary from "./assets/tool-library.webp";
import youthStudio from "./assets/youth-studio.webp";

// Off-chain demo-оформление: контракт V2 не хранит изображений. Ключ — ID кампании
// в контракте из shared/config/web3.ts; при новом deployment таблицу нужно пересобрать.
const demoCovers: Record<string, StaticImageData> = {
  "3": toolLibrary,
  "4": youthStudio,
  "5": bikeMap,
  "6": airSensors,
  "7": solidityBook,
};

export function getDemoCover(id: bigint): StaticImageData | undefined {
  return demoCovers[id.toString()];
}
