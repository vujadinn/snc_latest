import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { HTTPError } from 'types/HTTPError';

import { AuthorizationService } from '../../../../services/authorization.service';
import { CentralServerService } from '../../../../services/central-server.service';
import { DialogService } from '../../../../services/dialog.service';
import { MessageService } from '../../../../services/message.service';
import { SpinnerService } from '../../../../services/spinner.service';
import { ChargingStationButtonAction, OCPPGeneralResponse } from '../../../../types/ChargingStation';
import { ActionResponse } from '../../../../types/DataResult';
import { ButtonColor, ButtonType, TableActionDef } from '../../../../types/Table';
import { Transaction } from '../../../../types/Transaction';
import { Utils } from '../../../../utils/Utils';
import { TableAction } from '../table-action';

export interface TableChargingStationsStopTransactionActionDef extends TableActionDef {
  action: (transaction: Transaction, authorizationService: AuthorizationService,
    dialogService: DialogService, translateService: TranslateService, messageService: MessageService,
    centralServerService: CentralServerService, spinnerService: SpinnerService, router: Router,
    refresh?: () => Observable<void>) => void;
}

export class TableChargingStationsStopTransactionAction implements TableAction {
  private action: TableChargingStationsStopTransactionActionDef = {
    id: ChargingStationButtonAction.STOP_TRANSACTION,
    type: 'button',
    icon: 'stop',
    color: ButtonColor.WARN,
    name: 'general.stop',
    tooltip: 'general.tooltips.stop',
    action: this.stopTransaction.bind(this),
  };

  public getActionDef(): TableChargingStationsStopTransactionActionDef {
    return this.action;
  }

  private stopTransaction(transaction: Transaction, authorizationService: AuthorizationService,
    dialogService: DialogService, translateService: TranslateService, messageService: MessageService,
    centralServerService: CentralServerService, spinnerService: SpinnerService, router: Router,
    refresh?: () => Observable<void>) {
    // Get the charging station
    centralServerService.getChargingStation(transaction.chargeBoxID).subscribe((chargingStation) => {
      const connector = Utils.getConnectorFromID(chargingStation, transaction.connectorId);
      const isStopAuthorized = authorizationService.canStopTransaction(chargingStation.siteArea, connector.currentTagID);
      if (!isStopAuthorized) {
        dialogService.createAndShowOkDialog(
          translateService.instant('chargers.action_error.transaction_stop_title'),
          translateService.instant('chargers.action_error.transaction_stop_not_authorized'));
        return;
      }
      // Check authorization
      dialogService.createAndShowYesNoDialog(
        translateService.instant('chargers.stop_transaction_title'),
        translateService.instant('chargers.stop_transaction_confirm', { chargeBoxID: chargingStation.id }),
      ).subscribe((response) => {
        if (response === ButtonType.YES) {
          if (!chargingStation.inactive && connector.currentTransactionID === transaction.id) {
            // Remote Stop
            spinnerService.show();
            centralServerService.chargingStationStopTransaction(chargingStation.id, connector.currentTransactionID)
              .subscribe((response2: ActionResponse) => {
                spinnerService.hide();
                if (response2.status === OCPPGeneralResponse.ACCEPTED) {
                  messageService.showSuccessMessage(
                    translateService.instant('chargers.stop_transaction_success', { chargeBoxID: chargingStation.id }));
                  if (refresh) {
                    refresh().subscribe();
                  }
                } else {
                  Utils.handleError(JSON.stringify(response),
                    messageService, translateService.instant('chargers.stop_transaction_error'));
                }
              }, (error) => {
                spinnerService.hide();
                // Check status error code
                switch (error.status) {
                  // Account already active
                  case HTTPError.USER_NO_BADGE_ERROR:
                    messageService.showErrorMessage('chargers.stop_transaction_missing_active_tag', { chargeBoxID: chargingStation.id });
                    break;
                  default:
                    Utils.handleHttpError(error, router, messageService,
                      centralServerService, 'chargers.stop_transaction_error');
                    break;
                }
              });
          } else {
            // Soft Stop
            spinnerService.show();
            centralServerService.softStopTransaction(transaction.id).subscribe((res: ActionResponse) => {
              spinnerService.hide();
              if (res.status === 'Invalid') {
                messageService.showErrorMessage(
                  translateService.instant('transactions.notification.soft_stop.error'));
              } else {
                messageService.showSuccessMessage(
                  translateService.instant('transactions.notification.soft_stop.success',
                    { user: Utils.buildUserFullName(transaction.user) }));
                if (refresh) {
                  refresh().subscribe();
                }
              }
            }, (error) => {
              spinnerService.hide();
              Utils.handleHttpError(error, router, messageService,
                centralServerService, 'transactions.notification.soft_stop.error');
            });
          }
        }
      });
    }, (error) => {
      Utils.handleHttpError(error, router, messageService,
        centralServerService, 'chargers.charger_not_found');
    });
  }
}
