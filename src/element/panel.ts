// The panel that goes with the viewer for a ship that has one (a variant with an `inspector`): tabs for the specification and the notes, a Labels toggle, and a list of insets that open on a click. It is plain DOM
// and knows nothing of three.js: the viewer is reached only through the hooks it is given. Everything it shows comes from the variant's data.
import type { Inspector, InspectorInset } from "../data/types.ts";
import type { ViewerFocus, ViewerMark } from "./scene.ts";

export interface PanelHooks {
  marks: (marks: ViewerMark[] | null) => void;
  focus: (focus: ViewerFocus | null) => void;
  /** The 3D view is there: labels and insets need it. */
  drawn: () => boolean;
  /** Tells the page the Labels toggle changed. */
  onLabels: (on: boolean) => void;
  /** Saves the full-detail model on screen as a .glb file. */
  download: () => void;
}

const TABS: readonly (readonly [string, string])[] = [
  ["spec", "Specification"],
  ["propulsion", "Propulsion and limits"],
  ["construction", "Construction"],
  ["history", "History"],
  ["equipment", "Equipment"],
  ["insets", "Insets"],
];

export class Panel {
  readonly el: HTMLElement;
  private tab = "spec";
  private labelsOn = false;
  private open: InspectorInset | null = null;
  private body: HTMLElement;
  private bar: HTMLElement;
  private inspector: Inspector;
  private hooks: PanelHooks;

  constructor(inspector: Inspector, hooks: PanelHooks) {
    this.inspector = inspector;
    this.hooks = hooks;
    this.el = document.createElement("section");
    this.el.className = "panel";
    this.el.setAttribute("part", "panel");
    this.bar = document.createElement("div");
    this.bar.className = "bar";
    this.bar.setAttribute("role", "tablist");
    this.body = document.createElement("div");
    this.body.className = "body";
    this.body.setAttribute("role", "tabpanel");
    this.el.append(this.bar, this.body);
    this.render();
  }

  /** The Labels toggle, set from the page (the `labels` attribute) or the button. */
  labels(on: boolean): void {
    this.labelsOn = on;
    this.applyMarks();
    this.render();
  }

  /** The 3D view has come in or changed: send the labels again. */
  refresh(): void {
    this.applyMarks();
  }

  private applyMarks(): void {
    if (this.open) {
      this.hooks.marks(this.open.parts.map((p) => ({ id: `${this.open!.id}-${p.n}`, text: String(p.n), at: [...p.at] as [number, number, number], slot: p.slot, numbered: true })));
      return;
    }
    if (!this.labelsOn) return this.hooks.marks(null);
    this.hooks.marks(
      this.inspector.sections
        .filter((s) => !s.inside)
        .map((s) => ({ id: s.id, text: s.name, at: [...s.at] as [number, number, number], slot: s.slot, rest: [...(this.inspector.places[s.slot] ?? s.at)] as [number, number, number] })),
    );
  }

  private button(text: string, extra: Record<string, string>, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    for (const [k, v] of Object.entries(extra)) b.setAttribute(k, v);
    b.addEventListener("click", onClick);
    return b;
  }

  private render(): void {
    this.bar.replaceChildren();
    for (const [id, name] of TABS) this.bar.append(this.button(name, { role: "tab", "aria-selected": String(this.tab === id), "data-tab": id }, () => {
      this.tab = id;
      this.render();
    }));
    const toggle = this.button("Labels", { "aria-pressed": String(this.labelsOn), "data-labels": "" }, () => {
      this.labelsOn = !this.labelsOn;
      this.hooks.onLabels(this.labelsOn);
      this.applyMarks();
      this.render();
    });
    if (!this.hooks.drawn()) toggle.title = "Labels need the 3D view";
    this.bar.append(toggle);
    const save = this.button("Download 3D model", { "data-download": "", title: "Saves the full-detail model on screen as a .glb file" }, () => this.hooks.download());
    this.bar.append(save);
    this.body.replaceChildren();
    if (this.tab === "spec") this.body.append(this.table(this.inspector.spec.map(([a, b]) => [a, b])));
    else if (this.tab === "insets") this.renderInsets();
    else for (const text of this.inspector.notes[this.tab] ?? []) {
      const p = document.createElement("p");
      p.textContent = text;
      this.body.append(p);
    }
  }

  private table(rows: readonly (readonly [string, string])[]): HTMLTableElement {
    const table = document.createElement("table");
    for (const [a, b] of rows) {
      const tr = table.insertRow();
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = a;
      tr.append(th);
      tr.insertCell().textContent = b;
    }
    return table;
  }

  private renderInsets(): void {
    if (this.open) {
      const inset = this.open;
      const back = this.button("Back to the whole ship", { "data-back": "" }, () => {
        this.open = null;
        this.hooks.focus(null);
        this.applyMarks();
        this.render();
      });
      const h = document.createElement("p");
      h.textContent = inset.name;
      h.style.fontWeight = "600";
      this.body.append(h, this.table(inset.parts.map((p) => [String(p.n), p.name])), back);
      return;
    }
    const note = document.createElement("p");
    note.textContent = this.hooks.drawn() ? "Choose a system to fly to it, with its numbered parts." : "Insets open in the 3D view.";
    this.body.append(note);
    for (const inset of this.inspector.insets) {
      const b = this.button(inset.name, { "data-inset": inset.id }, () => {
        if (!this.hooks.drawn()) return;
        this.open = inset;
        this.hooks.focus({ slots: inset.slots, target: [...inset.target] as [number, number, number], direction: [...inset.direction] as [number, number, number], distance: inset.distance });
        this.applyMarks();
        this.render();
      });
      b.disabled = !this.hooks.drawn();
      this.body.append(b);
    }
  }
}
