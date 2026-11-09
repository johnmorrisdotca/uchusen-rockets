// The poster page: the picture, a zoom, and a download of the SVG or a PNG that fits an A2 or A1 sheet at 300 dpi.
import { zoomText } from "@johnmorrisdotca/kazoku-ui/view-controls";
import { WORDS } from "./words.js";
import type { LookName } from "../src/looks.ts";
import { fitSheet, posterSvg, SHEETS, type PosterCopy } from "./poster.ts";

type Chooser = { word(key: string): string | undefined };
const say = (key: string): string => {
  const chooser = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage;
  return chooser?.word(key) ?? WORDS.en[key] ?? key;
};
const byId = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`no #${id}`);
  return node;
};

let picture = posterSvg();

const showZoom = (): void => {
  byId("zoom-readout").textContent = zoomText(Number((byId("zoom") as HTMLInputElement).value) / 100);
};

const asked = (): LookName => (new URLSearchParams(location.search).get("look") === "line" ? "line" : "painted");
const copy = (): PosterCopy => ({ title: say("posterTitle"), same: say("posterMetre"), later: say("posterLater"), fleet: say("posterFleet"), person: say("posterPerson"), scale: "20 m" });

function draw(): void {
  const look = asked();
  byId("look").textContent = say(look === "painted" ? "look_line" : "look_painted");
  picture = posterSvg(copy(), look);
  const parsed = new DOMParser().parseFromString(picture.svg, "image/svg+xml");
  const svg = parsed.documentElement;
  svg.style.width = `${(byId("zoom") as HTMLInputElement).value}%`;
  showZoom();
  byId("poster").replaceChildren(document.importNode(svg, true));
}

function save(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function png(sheet: { long: number; short: number }, name: string): void {
  const size = fitSheet(picture.width, picture.height, sheet);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([picture.svg], { type: "image/svg+xml;charset=utf-8" }));
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext("2d")?.drawImage(img, 0, 0, size.width, size.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (blob) save(name, blob);
    }, "image/png");
  };
  img.src = url;
}

byId("look").addEventListener("click", () => {
  const next = new URL(location.href);
  if (asked() === "painted") next.searchParams.set("look", "line");
  else next.searchParams.delete("look");
  history.replaceState(null, "", next);
  draw();
});
byId("zoom").addEventListener("input", () => {
  const svg = byId("poster").querySelector("svg");
  if (svg) svg.style.width = `${(byId("zoom") as HTMLInputElement).value}%`;
  showZoom();
});
byId("save-svg").addEventListener("click", () => save("rockets-of-the-world.svg", new Blob([picture.svg], { type: "image/svg+xml;charset=utf-8" })));
byId("save-a2").addEventListener("click", () => png(SHEETS.a2, "rockets-of-the-world-a2.png"));
byId("save-a1").addEventListener("click", () => png(SHEETS.a1, "rockets-of-the-world-a1.png"));
document.addEventListener("kazoku-languagechange", () => queueMicrotask(draw));
draw();
