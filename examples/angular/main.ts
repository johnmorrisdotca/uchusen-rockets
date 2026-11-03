import "@angular/compiler";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";
import { RocketViewComponent } from "./rocket-view.component";

void bootstrapApplication(RocketViewComponent, { providers: [provideZonelessChangeDetection()] });
