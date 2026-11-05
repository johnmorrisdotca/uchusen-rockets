// The poster page: the picture, a zoom, and a download of the SVG or a PNG that fits an A2 or A1 sheet at 300 dpi.
import { WORDS } from "./words.js";
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

const copy = (): PosterCopy => ({ title: say("posterTitle"), later: say("posterLater"), scale: "50 m", metre: say("posterMetre") });

function draw(): void {
  picture = posterSvg(copy());
  const parsed = new DOMParser().parseFromString(picture.svg, "image/svg+xml");
  const svg = parsed.documentElement;
  svg.style.width = `${(byId("zoom") as HTMLInputElement).value}%`;
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

byId("zoom").addEventListener("input", () => {
  const svg = byId("poster").querySelector("svg");
  if (svg) svg.style.width = `${(byId("zoom") as HTMLInputElement).value}%`;
});
byId("save-svg").addEventListener("click", () => save("rockets-of-the-world.svg", new Blob([picture.svg], { type: "image/svg+xml;charset=utf-8" })));
byId("save-a2").addEventListener("click", () => png(SHEETS.a2, "rockets-of-the-world-a2.png"));
byId("save-a1").addEventListener("click", () => png(SHEETS.a1, "rockets-of-the-world-a1.png"));
document.addEventListener("kazoku-languagechange", () => queueMicrotask(draw));
draw();
