import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DialogMode } from 'types/Authorization';

import { AuthorizationService } from '../../../services/authorization.service';
import { CentralServerService } from '../../../services/central-server.service';
import { ComponentService } from '../../../services/component.service';
import { ConfigService } from '../../../services/config.service';
import { DialogService } from '../../../services/dialog.service';
import { MessageService } from '../../../services/message.service';
import { SpinnerService } from '../../../services/spinner.service';
import { GeoMapDialogComponent } from '../../../shared/dialogs/geomap/geomap-dialog.component';
import { SiteAreasDialogComponent } from '../../../shared/dialogs/site-areas/site-areas-dialog.component';
import { Asset, AssetTypes } from '../../../types/Asset';
import { KeyValue, RestResponse } from '../../../types/GlobalType';
import { HTTPError } from '../../../types/HTTPError';
import { SiteArea } from '../../../types/SiteArea';
import { TenantComponents } from '../../../types/Tenant';
import { Constants } from '../../../utils/Constants';
import { ParentErrorStateMatcher } from '../../../utils/ParentStateMatcher';
import { Utils } from '../../../utils/Utils';

@Component({
  selector: 'app-asset',
  templateUrl: 'asset.component.html',
})
export class AssetComponent implements OnInit {
  @Input() public currentAssetID!: string;
  @Input() public dialogMode!: DialogMode;
  @Input() public dialogRef!: MatDialogRef<any>;

  public parentErrorStateMatcher = new ParentErrorStateMatcher();
  public isSmartChargingComponentActive = false;
  public readOnly = true;
  public image: string = Constants.NO_IMAGE;
  public imageHasChanged = false;
  public maxSize: number;
  public selectedSiteArea: SiteArea;
  public assetTypes!: KeyValue[];
  public assetConnections!: KeyValue[];

  public formGroup!: FormGroup;
  public id!: AbstractControl;
  public name!: AbstractControl;
  public siteArea!: AbstractControl;
  public siteAreaID!: AbstractControl;
  public assetType!: AbstractControl;
  public excludeFromSmartCharging!: AbstractControl;
  public variationThresholdPercent!: AbstractControl;
  public fluctuationPercent!: AbstractControl;
  public staticValueWatt!: AbstractControl;
  public coordinates!: FormArray;
  public longitude!: AbstractControl;
  public latitude!: AbstractControl;
  public dynamicAsset!: AbstractControl;
  public usesPushAPI!: AbstractControl;
  public connectionID!: AbstractControl;
  public meterID!: AbstractControl;
  public asset!: Asset;

  public constructor(
    private authorizationService: AuthorizationService,
    private centralServerService: CentralServerService,
    private componentService: ComponentService,
    private messageService: MessageService,
    private spinnerService: SpinnerService,
    private configService: ConfigService,
    private activatedRoute: ActivatedRoute,
    private dialog: MatDialog,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private router: Router
  ) {
    this.maxSize = this.configService.getAsset().maxImageKb;
    // Get asset types
    this.assetTypes = AssetTypes;
    // Get asset connections list
    this.loadAssetConnections();
    this.isSmartChargingComponentActive = this.componentService.isActive(TenantComponents.SMART_CHARGING);
  }

  public ngOnInit() {
    // Init the form
    this.formGroup = new FormGroup({
      id: new FormControl(''),
      name: new FormControl('',
        Validators.compose([
          Validators.required,
          Validators.maxLength(255),
        ])),
      siteArea: new FormControl('',
        Validators.compose([
          Validators.required,
        ])),
      siteAreaID: new FormControl(''),
      assetType: new FormControl('',
        Validators.compose([
          Validators.required,
        ])
      ),
      excludeFromSmartCharging: new FormControl(false),
      variationThresholdPercent: new FormControl(null,
        Validators.compose([
          Validators.max(100),
          Validators.pattern('^[+]?[0-9]*$'),
        ])),
      fluctuationPercent: new FormControl(null,
        Validators.compose([
          Validators.max(100),
          Validators.pattern('^[+]?[0-9]*$'),
        ])),
      staticValueWatt: new FormControl(null,
        Validators.compose([
          Validators.required,
        ])
      ),
      coordinates: new FormArray([
        new FormControl(null,
          Validators.compose([
            Validators.max(180),
            Validators.min(-180),
            Validators.pattern(Constants.REGEX_VALIDATION_LONGITUDE),
          ])),
        new FormControl(null,
          Validators.compose([
            Validators.max(90),
            Validators.min(-90),
            Validators.pattern(Constants.REGEX_VALIDATION_LATITUDE),
          ])),
      ]),
      connectionID: new FormControl('',
        Validators.compose([
          Validators.required,
        ])),
      dynamicAsset: new FormControl(false),
      usesPushAPI: new FormControl(false),
      meterID: new FormControl('',
        Validators.compose([
          Validators.required,
        ]))
    });
    // Form
    this.id = this.formGroup.controls['id'];
    this.name = this.formGroup.controls['name'];
    this.siteArea = this.formGroup.controls['siteArea'];
    this.siteAreaID = this.formGroup.controls['siteAreaID'];
    this.assetType = this.formGroup.controls['assetType'];
    this.excludeFromSmartCharging = this.formGroup.controls['excludeFromSmartCharging'];
    this.variationThresholdPercent = this.formGroup.controls['variationThresholdPercent'];
    this.fluctuationPercent = this.formGroup.controls['fluctuationPercent'];
    this.staticValueWatt = this.formGroup.controls['staticValueWatt'];
    this.coordinates = this.formGroup.controls['coordinates'] as FormArray;
    this.longitude = this.coordinates.at(0);
    this.latitude = this.coordinates.at(1);
    this.dynamicAsset = this.formGroup.controls['dynamicAsset'];
    this.usesPushAPI = this.formGroup.controls['usesPushAPI'];
    this.connectionID = this.formGroup.controls['connectionID'];
    this.meterID = this.formGroup.controls['meterID'];
    // Disable connection form by default
    this.disableConnectionDetails();
    this.readOnly = (this.dialogMode === DialogMode.VIEW);
    if (this.currentAssetID) {
      this.loadAsset();
    } else if (this.activatedRoute && this.activatedRoute.params) {
      this.activatedRoute.params.subscribe((params: Params) => {
        this.currentAssetID = params['id'];
        this.loadAsset();
      });
    }
    // Handle Dialog mode
    Utils.handleDialogMode(this.dialogMode, this.formGroup);
  }

  public setCurrentAssetId(currentAssetId: string) {
    this.currentAssetID = currentAssetId;
  }

  public refresh() {
    this.loadAsset();
  }

  public loadAsset() {
    // ID not provided we are in creation mode
    if (!this.currentAssetID) {
      return;
    }
    this.spinnerService.show();
    this.centralServerService.getAsset(this.currentAssetID, false, true).subscribe((asset) => {
      this.spinnerService.hide();
      this.asset = asset;
      if (this.asset.id) {
        this.formGroup.controls.id.setValue(this.asset.id);
      }
      if (this.asset.name) {
        this.formGroup.controls.name.setValue(this.asset.name);
      }
      if (this.asset.siteArea && this.asset.siteArea.name) {
        this.formGroup.controls.siteAreaID.setValue(this.asset.siteArea.id);
        this.formGroup.controls.siteArea.setValue(this.asset.siteArea.name);
        this.selectedSiteArea = this.asset.siteArea;
      }
      if (this.asset.assetType) {
        this.formGroup.controls.assetType.setValue(this.asset.assetType);
      }
      if (this.asset.excludeFromSmartCharging) {
        this.formGroup.controls.excludeFromSmartCharging.setValue(this.asset.excludeFromSmartCharging);
      }
      if (this.asset.variationThresholdPercent) {
        this.formGroup.controls.variationThresholdPercent.setValue(this.asset.variationThresholdPercent);
      }
      if (this.asset.fluctuationPercent) {
        this.formGroup.controls.fluctuationPercent.setValue(this.asset.fluctuationPercent);
      }
      if (!Utils.isUndefined(this.asset.staticValueWatt)) {
        this.formGroup.controls.staticValueWatt.setValue(this.asset.staticValueWatt);
      }
      if (this.asset.coordinates) {
        this.longitude.setValue(this.asset.coordinates[0]);
        this.latitude.setValue(this.asset.coordinates[1]);
      }
      if (this.asset.dynamicAsset) {
        this.formGroup.controls.dynamicAsset.setValue(this.asset.dynamicAsset);
        this.formGroup.controls.usesPushAPI.setValue(this.asset.usesPushAPI);
        this.disableConnectionDetails();
      }
      if (this.asset.connectionID) {
        this.formGroup.controls.connectionID.setValue(this.asset.connectionID);
      }
      if (this.asset.meterID) {
        this.formGroup.controls.meterID.setValue(this.asset.meterID);
      }
      this.formGroup.updateValueAndValidity();
      this.formGroup.markAsPristine();
      this.formGroup.markAllAsTouched();
      // Get Site image
      this.centralServerService.getAssetImage(this.currentAssetID).subscribe((assetImage) => {
        this.image = assetImage ? assetImage : Constants.NO_IMAGE;
      });
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('assets.asset_not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'general.unexpected_error_backend');
      }
    });
  }

  public disableConnectionDetails() {
    if (Utils.convertToBoolean(this.dynamicAsset.value && !Utils.convertToBoolean(this.usesPushAPI.value))) {
      this.connectionID.enable();
      this.meterID.enable();
    } else {
      this.connectionID.disable();
      this.meterID.disable();
      this.connectionID.reset();
      this.meterID.reset();
    }
    if (!Utils.convertToBoolean(this.dynamicAsset.value)) {
      this.usesPushAPI.reset();
      this.usesPushAPI.disable();
    } else {
      this.usesPushAPI.enable();
    }
  }

  public updateAssetImage(asset: Asset) {
    // Check no asset?
    if (!this.image.endsWith(Constants.NO_IMAGE)) {
      // Set new image
      if (this.image !== Constants.NO_IMAGE) {
        asset.image = this.image;
      } else {
        asset.image = null;
      }
    } else {
      // No image
      delete asset.image;
    }
  }

  public updateAssetCoordinates(asset: Asset) {
    if (asset.coordinates && !(asset.coordinates[0] || asset.coordinates[1])) {
      delete asset.coordinates;
    }
  }

  public saveAsset(asset: Asset) {
    if (this.currentAssetID) {
      this.updateAsset(asset);
    } else {
      this.createAsset(asset);
    }
  }

  public onImageChanged(event: any) {
    // load picture
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > (this.maxSize * 1024)) {
        this.messageService.showErrorMessage('assets.logo_size_error', { maxPictureKb: this.maxSize });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          this.image = reader.result as string;
          this.imageHasChanged = true;
          this.formGroup.markAsDirty();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  public clearImage() {
    // Clear
    this.image = Constants.NO_IMAGE;
    this.imageHasChanged = true;
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
      this.translateService, this.saveAsset.bind(this), this.closeDialog.bind(this));
  }

  public assignSiteArea() {
    // Create dialog
    const dialogConfig = new MatDialogConfig();
    dialogConfig.panelClass = 'transparent-dialog-container';
    dialogConfig.data = {
      title: 'chargers.assign_site_area',
      validateButtonTitle: 'general.select',
      sitesAdminOnly: true,
      rowMultipleSelection: false,
      staticFilter: {
        Issuer: true
      },
    };
    this.dialog.open(SiteAreasDialogComponent, dialogConfig)
      .afterClosed().subscribe((result) => {
        if (!Utils.isEmptyArray(result) && result[0].objectRef) {
          const siteArea = ((result[0].objectRef) as SiteArea);
          this.formGroup.markAsDirty();
          this.formGroup.controls.siteArea.setValue(siteArea.name);
          this.formGroup.controls.siteAreaID.setValue(siteArea.id);
          this.selectedSiteArea = siteArea;
        }
      });
  }

  public assignGeoMap() {
    // Create the dialog
    const dialogConfig = new MatDialogConfig();
    dialogConfig.minWidth = '70vw';
    dialogConfig.disableClose = false;
    dialogConfig.panelClass = 'transparent-dialog-container';
    // Get latitude/longitude from form
    let latitude = this.latitude.value;
    let longitude = this.longitude.value;
    // If one is not available try to get from SiteArea and then from Site
    if (!latitude || !longitude) {
      if (this.selectedSiteArea && this.selectedSiteArea.address) {
        if (this.selectedSiteArea.address.coordinates && this.selectedSiteArea.address.coordinates.length === 2) {
          latitude = this.selectedSiteArea.address.coordinates[1];
          longitude = this.selectedSiteArea.address.coordinates[0];
        } else {
          const site = this.selectedSiteArea.site;
          if (site && site.address && site.address.coordinates && site.address.coordinates.length === 2) {
            latitude = site.address.coordinates[1];
            longitude = site.address.coordinates[0];
          }
        }
      }
    }
    // Set data
    dialogConfig.data = {
      dialogTitle: this.translateService.instant('geomap.dialog_geolocation_title',
        { componentName: 'Asset', itemComponentName: this.name.value ? this.name.value : 'Asset' }),
      latitude,
      longitude,
      label: this.name.value ? this.name.value : 'Asset',
    };
    // Disable outside click close
    dialogConfig.disableClose = true;
    // Open
    this.dialog.open(GeoMapDialogComponent, dialogConfig)
      .afterClosed().subscribe((result) => {
        if (result) {
          if (result.latitude) {
            this.latitude.setValue(result.latitude);
            this.formGroup.markAsDirty();
          }
          if (result.longitude) {
            this.longitude.setValue(result.longitude);
            this.formGroup.markAsDirty();
          }
        }
      });
  }

  public loadAssetConnections() {
    this.spinnerService.show();
    this.componentService.getAssetSettings().subscribe((assetSettings) => {
      this.spinnerService.hide();
      if (assetSettings) {
        const connections = [] as KeyValue[];
        for (const connection of assetSettings.asset.connections) {
          connections.push({ key: connection.id, value: connection.name });
        }
        this.assetConnections = connections;
      }
    }, (error) => {
      this.spinnerService.hide();
      Utils.handleHttpError(error, this.router, this.messageService,
        this.centralServerService, 'assets.asset_settings_error');
    });
  }

  private createAsset(asset: Asset) {
    this.spinnerService.show();
    // Set coordinates
    this.updateAssetCoordinates(asset);
    // Set the image
    this.updateAssetImage(asset);
    // Create
    this.centralServerService.createAsset(asset).subscribe((response) => {
      this.spinnerService.hide();
      if (response.status === RestResponse.SUCCESS) {
        this.messageService.showSuccessMessage('assets.create_success',
          { assetName: asset.name });
        this.currentAssetID = asset.id;
        this.closeDialog(true);
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, 'assets.create_error');
      }
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('assets.asset_not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'assets.create_error');
      }
    });
  }

  private updateAsset(asset: Asset) {
    this.spinnerService.show();
    // Set coordinates
    this.updateAssetCoordinates(asset);
    // Set the image
    this.updateAssetImage(asset);
    // Update
    this.centralServerService.updateAsset(asset).subscribe((response) => {
      this.spinnerService.hide();
      if (response.status === RestResponse.SUCCESS) {
        this.messageService.showSuccessMessage('assets.update_success', { assetName: asset.name });
        this.closeDialog(true);
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, 'assets.update_error');
      }
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('assets.asset_not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'assets.update_error');
      }
    });
  }
}
