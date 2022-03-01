import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DialogMode } from 'types/Authorization';

import { CentralServerService } from '../../../../services/central-server.service';
import { ConfigService } from '../../../../services/config.service';
import { DialogService } from '../../../../services/dialog.service';
import { MessageService } from '../../../../services/message.service';
import { SpinnerService } from '../../../../services/spinner.service';
import { Address } from '../../../../types/Address';
import { Company } from '../../../../types/Company';
import { RestResponse } from '../../../../types/GlobalType';
import { HTTPError } from '../../../../types/HTTPError';
import { Constants } from '../../../../utils/Constants';
import { ParentErrorStateMatcher } from '../../../../utils/ParentStateMatcher';
import { Utils } from '../../../../utils/Utils';

@Component({
  selector: 'app-company',
  templateUrl: 'company.component.html',
})
export class CompanyComponent implements OnInit {
  @Input() public currentCompanyID!: string;
  @Input() public dialogMode!: DialogMode;
  @Input() public dialogRef!: MatDialogRef<any>;

  public parentErrorStateMatcher = new ParentErrorStateMatcher();

  public logo = Constants.NO_IMAGE;
  public logoHasChanged = false;
  public maxSize: number;
  public readOnly = true;

  public formGroup!: FormGroup;
  public issuer!: AbstractControl;
  public id!: AbstractControl;
  public name!: AbstractControl;
  public address!: Address;

  public constructor(
    private centralServerService: CentralServerService,
    private messageService: MessageService,
    private spinnerService: SpinnerService,
    private configService: ConfigService,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private router: Router) {
    this.maxSize = this.configService.getCompany().maxLogoKb;
  }

  public ngOnInit() {
    // Init the form
    this.formGroup = new FormGroup({
      issuer: new FormControl(true),
      id: new FormControl(''),
      name: new FormControl('',
        Validators.compose([
          Validators.required,
        ])),
    });
    // Form
    this.issuer = this.formGroup.controls['issuer'];
    this.id = this.formGroup.controls['id'];
    this.name = this.formGroup.controls['name'];
    // Set
    this.readOnly = (this.dialogMode === DialogMode.VIEW);
    // Load Site
    this.loadCompany();
    // Handle Dialog mode
    Utils.handleDialogMode(this.dialogMode, this.formGroup);
  }

  public loadCompany() {
    if (this.currentCompanyID) {
      this.spinnerService.show();
      this.centralServerService.getCompany(this.currentCompanyID).subscribe((company: Company) => {
        this.spinnerService.hide();
        if (Utils.objectHasProperty(company, 'issuer')) {
          this.formGroup.controls.issuer.setValue(company.issuer);
        }
        if (company.id) {
          this.formGroup.controls.id.setValue(company.id);
        }
        if (company.name) {
          this.formGroup.controls.name.setValue(company.name);
        }
        if (company.address) {
          this.address = company.address;
        }
        // Update form group
        this.formGroup.updateValueAndValidity();
        this.formGroup.markAsPristine();
        this.formGroup.markAllAsTouched();
        // Get Company logo
        this.centralServerService.getCompanyLogo(this.currentCompanyID).subscribe((companyLogo) => {
          this.logo = companyLogo ? companyLogo : Constants.NO_IMAGE;
        });
      }, (error) => {
        this.spinnerService.hide();
        switch (error.status) {
          case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
            this.messageService.showErrorMessage('companies.company_not_found');
            break;
          default:
            Utils.handleHttpError(error, this.router, this.messageService,
              this.centralServerService, 'general.unexpected_error_backend');
        }
      });
    }
  }

  public refresh() {
    this.loadCompany();
  }

  public updateCompanyLogo(company: Company) {
    if (this.logoHasChanged) {
      // Set new logo
      if (this.logo !== Constants.NO_IMAGE) {
        company.logo = this.logo;
      } else {
        company.logo = null;
      }
    } else {
      // No changes
      delete company.logo;
    }
  }

  public updateCompanyCoordinates(company: Company) {
    if (company.address && company.address.coordinates &&
      !(company.address.coordinates[0] || company.address.coordinates[1])) {
      delete company.address.coordinates;
    }
  }

  public saveCompany(company: Company) {
    if (this.currentCompanyID) {
      this.updateCompany(company);
    } else {
      this.createCompany(company);
    }
  }

  public onLogoChanged(event: any) {
    // load picture
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > (this.maxSize * 1024)) {
        this.messageService.showErrorMessage('companies.logo_size_error', { maxPictureKb: this.maxSize });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          this.logo = reader.result as string;
          this.logoHasChanged = true;
          this.formGroup.markAsDirty();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  public clearLogo() {
    // Clear
    this.logo = Constants.NO_IMAGE;
    this.logoHasChanged = true;
    // Set form dirty
    this.formGroup.markAsDirty();
  }

  public closeDialog(saved: boolean = false) {
    if (this.dialogRef) {
      this.dialogRef.close(saved);
    }
  }

  public close() {
    Utils.checkAndSaveAndCloseDialog(this.formGroup, this.dialogService,
      this.translateService, this.saveCompany.bind(this), this.closeDialog.bind(this));
  }

  private createCompany(company: Company) {
    this.spinnerService.show();
    // Set the logo
    this.updateCompanyLogo(company);
    // Set coordinates
    this.updateCompanyCoordinates(company);
    // Create
    this.centralServerService.createCompany(company).subscribe((response) => {
      this.spinnerService.hide();
      if (response.status === RestResponse.SUCCESS) {
        this.messageService.showSuccessMessage('companies.create_success',
          { companyName: company.name });
        this.currentCompanyID = company.id;
        this.closeDialog(true);
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, 'companies.create_error');
      }
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('companies.company_not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'companies.create_error');
      }
    });
  }

  private updateCompany(company: Company) {
    this.spinnerService.show();
    // Set the logo
    this.updateCompanyLogo(company);
    // Set coordinates
    this.updateCompanyCoordinates(company);
    // Update
    this.centralServerService.updateCompany(company).subscribe((response) => {
      this.spinnerService.hide();
      if (response.status === RestResponse.SUCCESS) {
        this.messageService.showSuccessMessage('companies.update_success', { companyName: company.name });
        this.closeDialog(true);
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, 'companies.update_error');
      }
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('companies.company_not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'companies.update_error');
      }
    });
  }
}
