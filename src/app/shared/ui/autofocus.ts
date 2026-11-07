import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

/** Focuses (and selects) an inline editor as soon as it appears, e.g. "click to rename". */
@Directive({ selector: 'input[appAutofocus]' })
export class Autofocus {
  constructor() {
    const input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
    afterNextRender(() => input.select());
  }
}
