import { ComponentType } from '@angular/cdk/portal';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

import { DialogParams } from '../../../../types/Authorization';
import { ScreenSize } from '../../../../types/GlobalType';
import { PricingButtonAction, PricingDefinitionDialogData } from '../../../../types/Pricing';
import { TableActionDef } from '../../../../types/Table';
import { TableEditAction } from '../table-edit-action';

export interface TableEditPricingDefinitionActionDef extends TableActionDef {
  action: (PricingDefinitionDialogComponent: ComponentType<unknown>, dialog: MatDialog,
    dialogParams: DialogParams<PricingDefinitionDialogData>, refresh?: () => Observable<void>) => void;
}

export class TableEditPricingDefinitionAction extends TableEditAction {
  public getActionDef(): TableEditPricingDefinitionActionDef {
    return {
      ...super.getActionDef(),
      id: PricingButtonAction.EDIT_PRICING_DEFINITION,
      action: this.editPricingDefinition,
    };
  }

  private editPricingDefinition(pricingDefinitionDialogComponent: ComponentType<unknown>, dialog: MatDialog,
    dialogParams: DialogParams<PricingDefinitionDialogData>, refresh?: () => Observable<void>) {
    super.edit(pricingDefinitionDialogComponent, dialog, dialogParams, refresh, {
      minWidth: ScreenSize.XL,
      maxWidth: ScreenSize.XL,
      width: ScreenSize.XL,
      minHeight: ScreenSize.XXXL,
      maxHeight: ScreenSize.XXXXL,
      height: ScreenSize.XXXXL
    });
  }
}
