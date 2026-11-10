// The credit in the top corner of the bare page made to sit in an iframe. It has no header or footer of the family's, so the page that is embedded names its sources itself, with a link to every credit, and a reader sees it without opening anything.
// The styles are in demo.css (`.frame-credit`): the page's strict content security policy allows no style but a file of its own.
const NOTICE = "https://github.com/johnmorrisdotca/uchusen-rockets/blob/main/NOTICE.md";

/** Puts the credit in the corner of the page, in English or, when the address says `lang=ja`, in Japanese. */
export function frameCredit(ja: boolean): void {
  const link = document.createElement("a");
  link.className = "frame-credit";
  link.dataset["testid"] = "frame-credit";
  link.href = NOTICE;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = ja ? "モデルの制作者、NASA ほか。クレジット一覧" : "Models by their makers, NASA and others. All credits";
  document.body.append(link);
}
