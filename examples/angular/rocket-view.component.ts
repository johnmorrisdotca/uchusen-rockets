import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnInit } from "@angular/core";

@Component({
  selector: "app-rocket-view",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<uchusen-rocket [attr.rocket]="rocket" [attr.look]="look"></uchusen-rocket>`,
})
export class RocketViewComponent implements OnInit {
  @Input() rocket = "dragon";
  @Input() look: "line" | "thick" | "painted" = "thick";

  ngOnInit(): void {
    // The element needs a browser: ngOnInit also runs when a server renders, so the import waits for one.
    if (typeof window !== "undefined") void import("@johnmorrisdotca/uchusen-rockets/element");
  }
}
