import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { DialogParams } from 'types/Authorization';
import { Site } from 'types/Site';

import { Utils } from '../../../../utils/Utils';
import { SiteUsersTableDataSource } from './site-users-table-data-source';

@Component({
  templateUrl: 'site-users-dialog.component.html',
  providers: [SiteUsersTableDataSource],
})

export class SiteUsersDialogComponent {
  public dialogTitle: string;

  public constructor(
    public siteUsersTableDataSource: SiteUsersTableDataSource,
    private dialogRef: MatDialogRef<SiteUsersDialogComponent>,
    private translateService: TranslateService,
    @Inject(MAT_DIALOG_DATA) dialogParams: DialogParams<Site>) {
    if (dialogParams) {
      if (dialogParams.dialogData) {
        this.siteUsersTableDataSource.setSite(dialogParams.dialogData);
        this.dialogTitle = this.translateService.instant('sites.assigned_users_to_site', { siteName: dialogParams.dialogData.name });
      } else {
        this.dialogTitle = this.translateService.instant('sites.users');
      }
      this.siteUsersTableDataSource.setMode(
        Utils.getTableDataSourceModeFromDialogMode(dialogParams.dialogMode));
      this.siteUsersTableDataSource.initDataSource(true);
    }
    Utils.registerCloseKeyEvents(this.dialogRef);
  }
}
