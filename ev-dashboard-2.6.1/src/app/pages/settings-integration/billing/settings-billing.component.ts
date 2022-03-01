import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ButtonType } from 'types/Table';

import { CentralServerService } from '../../../services/central-server.service';
import { ComponentService } from '../../../services/component.service';
import { DialogService } from '../../../services/dialog.service';
import { MessageService } from '../../../services/message.service';
import { SpinnerService } from '../../../services/spinner.service';
import { RestResponse } from '../../../types/GlobalType';
import { HTTPError } from '../../../types/HTTPError';
import { BillingSetting, BillingSettings, BillingSettingsType, StripeBillingSetting } from '../../../types/Setting';
import { TenantComponents } from '../../../types/Tenant';
import { Utils } from '../../../utils/Utils';

@Component({
  selector: 'app-settings-billing',
  templateUrl: 'settings-billing.component.html',
})
export class SettingsBillingComponent implements OnInit {
  public isActive = false;

  public formGroup!: FormGroup;
  public billingSettings!: BillingSettings;
  public transactionBillingActivated: boolean;
  public isClearTestDataVisible = false;

  public constructor(
    private centralServerService: CentralServerService,
    private componentService: ComponentService,
    private dialogService: DialogService,
    private messageService: MessageService,
    private spinnerService: SpinnerService,
    private translateService: TranslateService,
    private router: Router,
  ) {
    this.isActive = this.componentService.isActive(TenantComponents.BILLING);
  }

  public ngOnInit(): void {
    // Build the form
    this.formGroup = new FormGroup({});
    // Load the conf
    if (this.isActive) {
      this.loadConfiguration();
    }
  }

  public loadConfiguration() {
    this.spinnerService.show();
    this.componentService.getBillingSettings().subscribe((settings) => {
      this.spinnerService.hide();
      // Keep
      this.billingSettings = settings;
      // Enable additional actions based on the account nature
      this.checkConnectionContext(settings);
      // Init form
      this.formGroup.markAsPristine();
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('settings.billing.not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'general.unexpected_error_backend');
      }
    });
  }

  public save(newSettings: any) {
    this.billingSettings.type = BillingSettingsType.STRIPE;
    if (newSettings?.billing?.isTransactionBillingActivated) {
      this.transactionBillingActivated = newSettings.billing.isTransactionBillingActivated;
    } else {
      this.transactionBillingActivated = this.billingSettings.billing.isTransactionBillingActivated;
    }
    this.billingSettings.billing = newSettings.billing as BillingSetting;
    this.billingSettings.billing.isTransactionBillingActivated = this.transactionBillingActivated;
    this.billingSettings.stripe = newSettings.stripe as StripeBillingSetting;
    // Save
    this.spinnerService.show();
    this.componentService.saveBillingSettings(this.billingSettings).subscribe((response) => {
      this.spinnerService.hide();
      if (response.status === RestResponse.SUCCESS) {
        this.messageService.showSuccessMessage(
          (!this.billingSettings.id ? 'settings.billing.create_success' : 'settings.billing.update_success'));
        this.refresh();
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, (!this.billingSettings.id ? 'settings.billing.create_error' : 'settings.billing.update_error'));
      }
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('settings.billing.not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService,
            (!this.billingSettings.id ? 'settings.billing.create_error' : 'settings.billing.update_error'));
      }
    });
  }

  public refresh() {
    this.loadConfiguration();
  }

  public checkConnection(activateTransactionBilling = false) {
    this.spinnerService.show();
    this.centralServerService.checkBillingConnection().subscribe((response) => {
      this.spinnerService.hide();
      if (response.connectionIsValid) {
        this.messageService.showSuccessMessage('settings.billing.connection_success');
        if (activateTransactionBilling) {
          this.activateTransactionBilling();
        }
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, 'settings.billing.connection_error');
      }
    }, (error) => {
      this.spinnerService.hide();
      Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService,
        'settings.billing.connection_error');
    });
  }

  private activateTransactionBilling() {
    this.dialogService.createAndShowYesNoDialog(
      this.translateService.instant('settings.billing.transaction_billing_activation_title'),
      this.translateService.instant('settings.billing.transaction_billing_activation_confirm'),
    ).subscribe((response) => {
      if (response === ButtonType.YES) {
        this.billingSettings.billing.isTransactionBillingActivated = true;
        this.save(this.billingSettings);
      }
    });
  }

  private clearTestData() {
    this.dialogService.createAndShowYesNoDialog(
      this.translateService.instant('settings.billing.billing_clear_test_data_title'),
      this.translateService.instant('settings.billing.billing_clear_test_data_confirm'),
    ).subscribe((response) => {
      if (response === ButtonType.YES) {
        this.triggerTestDataCleanup();
      }
    });
  }

  private triggerTestDataCleanup() {
    // Clear Test Data
    this.spinnerService.show();
    this.centralServerService.clearBillingTestData().subscribe((response) => {
      this.spinnerService.hide();
      if (response.succeeded) {
        this.messageService.showSuccessMessage('settings.billing.billing_clear_test_data_success');
        this.refresh();
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, 'settings.billing.billing_clear_test_data_error');
      }
    }, (error) => {
      this.spinnerService.hide();
      Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService, 'settings.billing.billing_clear_test_data_error');
    });
  }

  private checkConnectionContext(settings: BillingSettings): void {
    let isClearTestDataVisible = false;
    if ( this.billingSettings?.billing?.isTransactionBillingActivated ) {
      // TODO - Get the information via a dedicated endpoint!
      if ( this.billingSettings?.type === 'stripe' && this.billingSettings?.stripe?.publicKey?.startsWith('pk_test_') ) {
        isClearTestDataVisible = true;
      }
    }
    // Show the "Clear Test Data" button
    this.isClearTestDataVisible = isClearTestDataVisible;
  }
}
