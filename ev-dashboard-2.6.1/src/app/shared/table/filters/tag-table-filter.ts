import { TagsDialogComponent } from '../../../shared/dialogs/tags/tags-dialog.component';
import { FilterType, TableFilterDef } from '../../../types/Table';
import { TableFilter } from './table-filter';

export class TagTableFilter extends TableFilter {
  public constructor(dependentFilters?: TableFilterDef[]) {
    super();
    // Define filter
    const filterDef: TableFilterDef = {
      id: 'tag',
      httpId: 'VisualTagID',
      type: FilterType.DIALOG_TABLE,
      defaultValue: '',
      label: '',
      name: 'users.tags',
      class: 'col-sm-6 col-lg-3 col-md-2',
      dialogComponent: TagsDialogComponent,
      multiple: true,
      cleared: true,
      dependentFilters,
    };
    // Set
    this.setFilterDef(filterDef);
  }
}
