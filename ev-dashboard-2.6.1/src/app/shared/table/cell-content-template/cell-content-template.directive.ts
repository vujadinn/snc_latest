import { Directive, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { TableColumnDef } from '../../../types/Table';

@Directive()
export abstract class CellContentTemplateDirective implements OnChanges {
  @Input() public row: any;
  @Input() public columnDef!: TableColumnDef;
  @Output() public componentChanged = new EventEmitter<any>();

  // eslint-disable-next-line no-empty, @typescript-eslint/no-empty-function
  public ngOnChanges(changes: SimpleChanges): void {}
}
