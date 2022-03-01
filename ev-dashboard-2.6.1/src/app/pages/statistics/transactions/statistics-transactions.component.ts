import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ChartData } from 'chart.js';
import { ChartTypeValues } from 'types/Chart';

import { CentralServerService } from '../../../services/central-server.service';
import { LocaleService } from '../../../services/locale.service';
import { SpinnerService } from '../../../services/spinner.service';
import { FilterParams } from '../../../types/GlobalType';
import { TableFilterDef } from '../../../types/Table';
import { SimpleChart } from '../shared/chart-utilities';
import { StatisticsBuildService } from '../shared/statistics-build.service';
import { StatisticsExportService } from '../shared/statistics-export.service';

@Component({
  selector: 'app-statistics-transactions',
  templateUrl: './statistics-transactions.component.html',
})

export class StatisticsTransactionsComponent implements OnInit {
  @ViewChild('transactionsBarChart', { static: true }) public ctxBarChart!: ElementRef;
  @ViewChild('transactionsPieChart', { static: true }) public ctxPieChart!: ElementRef;

  public totalTransactions = 0;
  public selectedChart!: string;
  public selectedCategory!: string;
  public selectedDateRange!: any;
  public selectedYear!: number;
  public allYears = true;
  public chartsInitialized = false;

  private filterParams!: FilterParams;
  private barChart!: SimpleChart;
  private pieChart!: SimpleChart;
  private barChartData!: ChartData;
  private pieChartData!: ChartData;
  private language!: string;

  public constructor(
    private centralServerService: CentralServerService,
    private translateService: TranslateService,
    private localeService: LocaleService,
    private spinnerService: SpinnerService,
    private statisticsBuildService: StatisticsBuildService,
    private statisticsExportService: StatisticsExportService) {
    this.localeService.getCurrentLocaleSubject().subscribe((locale) => {
      this.language = locale.language;
    });
  }

  public ngOnInit(): void {
    this.initCharts();
  }

  public scopeChanged(chartName: string): void {
    this.selectedChart = chartName;
  }

  public categoryChanged(category: string): void {
    this.selectedCategory = category;
  }

  public yearChanged(year: number): void {
    this.selectedYear = year;
  }

  public dateRangeChange(date: any) {
    this.selectedDateRange = date;
  }

  public filtersChanged(filterParams: FilterParams): void {
    this.filterParams = filterParams;
  }

  public exportData(): void {
    const enhancedFilterParams = this.statisticsExportService.enhanceFilterParams(this.filterParams, 'Transactions',
      this.selectedCategory, this.selectedYear, this.selectedChart);
    this.statisticsExportService.exportDataWithDialog(enhancedFilterParams,
      this.translateService.instant('statistics.dialog.transactions.export.title'),
      this.translateService.instant('statistics.dialog.transactions.export.confirm'));
  }

  public getChartLabel(): string {
    let mainLabel: string;
    if (!this.selectedChart || !this.selectedCategory) {
      // selection not yet defined:
      return ' ';
    }
    if (this.selectedChart === 'month') {
      if (this.selectedCategory === 'C') {
        mainLabel = this.translateService.instant('statistics.transactions_per_cs_month_title',
          { total: Math.round(this.totalTransactions).toLocaleString(this.language) });
      } else {
        mainLabel = this.translateService.instant('statistics.transactions_per_user_month_title',
          { total: Math.round(this.totalTransactions).toLocaleString(this.language) });
      }
    } else {
      if (this.selectedCategory === 'C') {
        if (this.selectedYear > 0) {
          mainLabel = this.translateService.instant('statistics.transactions_per_cs_year_title',
            { total: Math.round(this.totalTransactions).toLocaleString(this.language) });
        } else if (this.selectedYear < 0) {
          mainLabel = this.translateService.instant('statistics.transactions_per_cs_timeFrame_title',
            { total: Math.round(this.totalTransactions).toLocaleString(this.language) });
        } else {
          mainLabel = this.translateService.instant('statistics.transactions_per_cs_total_title',
            { total: Math.round(this.totalTransactions).toLocaleString(this.language) });
        }
      } else {
        if (this.selectedYear > 0) {
          mainLabel = this.translateService.instant('statistics.transactions_per_user_year_title',
            { total: Math.round(this.totalTransactions).toLocaleString(this.language) });
        } else if (this.selectedYear < 0) {
          mainLabel = this.translateService.instant('statistics.transactions_per_user_timeFrame_title',
            { total: Math.round(this.totalTransactions).toLocaleString(this.language) });
        } else {
          mainLabel = this.translateService.instant('statistics.transactions_per_user_total_title',
            { total: Math.round(this.totalTransactions).toLocaleString(this.language) });
        }
      }
    }

    return mainLabel;
  }

  public initCharts(): void {
    const labelXAxis: string = this.translateService.instant('statistics.graphic_title_month_x_axis');
    const labelYAxis: string = this.translateService.instant('statistics.graphic_title_transactions_y_axis');
    const toolTipUnit = '';
    this.barChart = new SimpleChart(this.language, ChartTypeValues.STACKED_BAR,
      this.getChartLabel(), labelXAxis, labelYAxis, toolTipUnit, true);
    this.barChart.initChart(this.ctxBarChart);
    this.pieChart = new SimpleChart(this.language, ChartTypeValues.PIE,
      this.getChartLabel(), undefined, undefined, toolTipUnit, true);
    this.pieChart.initChart(this.ctxPieChart);
    this.chartsInitialized = true;
  }

  public updateCharts(refresh: boolean): void {
    if (refresh) {
      if (this.selectedChart === 'month') {
        this.barChartData = this.barChart.cloneChartData(this.barChartData, true);
        this.barChart.updateChart(this.barChartData, this.getChartLabel());
      } else {
        this.pieChartData = this.pieChart.cloneChartData(this.pieChartData, true);
        this.pieChart.updateChart(this.pieChartData, this.getChartLabel());
      }

      this.buildCharts();
    } else {
      if (this.selectedChart === 'month') {
        this.barChartData = this.barChart.cloneChartData(this.barChartData);
        this.barChart.updateChart(this.barChartData, this.getChartLabel());
      } else {
        this.pieChartData = this.pieChart.cloneChartData(this.pieChartData);
        this.pieChart.updateChart(this.pieChartData, this.getChartLabel());
      }
    }
  }

  public buildCharts(): void {
    this.spinnerService.show();
    if (this.selectedCategory === 'C') {
      this.centralServerService.getChargingStationTransactionsStatistics(this.selectedYear, this.filterParams)
        .subscribe((statisticsData) => {
          this.barChartData = this.statisticsBuildService.buildStackedChartDataForMonths(statisticsData, 2);
          this.pieChartData = this.statisticsBuildService.calculateTotalChartDataFromStackedChartData(this.barChartData);
          this.totalTransactions = this.statisticsBuildService.calculateTotalValueFromChartData(this.barChartData);
          if (this.selectedChart === 'month') {
            this.barChart.updateChart(this.barChartData, this.getChartLabel());
          } else {
            this.pieChart.updateChart(this.pieChartData, this.getChartLabel());
          }
          this.spinnerService.hide();
        });
    } else {
      this.centralServerService.getUserTransactionsStatistics(this.selectedYear, this.filterParams)
        .subscribe((statisticsData) => {
          this.barChartData = this.statisticsBuildService.buildStackedChartDataForMonths(statisticsData, 2);
          this.pieChartData = this.statisticsBuildService.calculateTotalChartDataFromStackedChartData(this.barChartData);
          this.totalTransactions = this.statisticsBuildService.calculateTotalValueFromChartData(this.barChartData);
          if (this.selectedChart === 'month') {
            this.barChart.updateChart(this.barChartData, this.getChartLabel());
          } else {
            this.pieChart.updateChart(this.pieChartData, this.getChartLabel());
          }
          this.spinnerService.hide();
        });
    }
  }
}
