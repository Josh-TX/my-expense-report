import { Component, Input, computed, effect } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule  } from '@angular/material/button';
import { ReportCellComponent } from '@components/report-cell/report-cell.component';
import { ReportRowComponent } from '@components/report-row/report-row.component';
import { ReportColumnComponent } from '@components/report-column/report-column.component';
import { MatDialog } from '@angular/material/dialog';
import { ReportService, Report, ReportCell, ReportRow, ReportHeader, ReportSummary } from '@services/report.service';
import { ExportService } from '@services/export.service';
import { CategoryColorService } from '@services/category-color.service';
import { LocalSettingsService } from '@services/local-settings.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { roundToCent } from '@services/helpers';
import { SettingsService } from '@services/settings.service';


@Component({
    selector: 'mer-report',
    standalone: true,
    imports: [CommonModule, FormsModule, MatButtonModule, MatSlideToggleModule, MatTooltipModule],
    templateUrl: './report.component.html'
})
export class ReportComponent {
    @Input() isYearly: boolean = false;
    report: Report | null = null;
    showSubcategories: boolean = false;
    showAverages: boolean = false;
    selectedCell: ReportCell | null = null;
    selectedDate: ReportRow | null = null;
    selectedHeader: ReportHeader | null = null;

    private effectRun = false;
    constructor(
        private reportService: ReportService,
        private categoryColorService: CategoryColorService,
        private localSettingsService: LocalSettingsService,
        private dialog: MatDialog,
        private exportService: ExportService,
        private settingsService: SettingsService
    ) {
        var signal1 = computed(() => this.settingsService.getSettings().recentMonthCount);
        var signal2 = computed(() => this.settingsService.getSettings().reportColorDeadZone);
        var signal3 = computed(() => this.settingsService.getSettings().reportColorSevereZScore);
        var timeoutId: any;
        effect(() => {
            signal1(); 
            signal2();
            signal3();
            clearTimeout(timeoutId);
            if (this.effectRun){
                timeoutId = setTimeout(() => {
                    this.updateReport();
                }, 1000)
            }
            this.effectRun = true;
        })
    }

    ngOnInit() {
        this.showSubcategories = this.localSettingsService.getValue("reportSubcat") ?? false;
        this.showAverages = this.localSettingsService.getValue("reportAverages") ?? false;
        this.updateReport();
    }

    showSubcategoriesChanged() {
        this.localSettingsService.setValue("reportSubcat", this.showSubcategories);
        this.updateReport();
    }

    showAveragesChanged(){
        this.localSettingsService.setValue("reportAverages", this.showAverages);
    }

    export() {
        var stringHeaderRows: string[][] = []
        for(var headerRow of this.report!.headerRows){
            var stringHeaders: string[] = [this.isYearly ? "year" : "month"];
            for (var header of headerRow){
                stringHeaders.push(header.name);
                for (var i = 1; i < header.width; i++){
                    stringHeaders.push("");
                }
            }
            stringHeaderRows.push(stringHeaders);
        }
        if (stringHeaderRows.length == 2){
            stringHeaderRows[0][0] = "";
        }
        var datePipe = new DatePipe('en-US');
        var currencyPipe = new CurrencyPipe('en-US');
        var dateTransformStr = this.isYearly ? 'y' : 'MMM y'
        var rowData = this.report!.rows.map(row => 
            [
                datePipe.transform(row.date, dateTransformStr)!, 
                ...row.cells.map(z => currencyPipe.transform(z.amount)!)
            ]
        )
        if (this.showAverages){
            rowData.unshift([
                "Average",
                ...this.report!.columnSummaries.map(z => currencyPipe.transform(z.amountPerPeriod)!)
            ])
        }
        var data = [
            ...stringHeaderRows,
            ...rowData
        ]
        var fileName = this.isYearly ? "yearly-report.csv" : "monthly-report.csv";
        this.exportService.exportData(data, fileName)
    }

    cellClicked(cell: ReportCell, row: ReportRow, index: number) {
        this.selectedCell = cell;
        var ref = this.dialog.open(ReportCellComponent, {autoFocus: false});
        var column = this.report!.columns[index];
        var average = this.report!.columnSummaries[index].amountPerPeriod;
        ref.componentInstance.init(row.date, column, this.isYearly, average);
        ref.afterClosed().subscribe(() => {
            setTimeout(() => {
                this.selectedCell = null;
            }, 50);
        })
    }

    getSummaryText(summary: ReportSummary): string{
        var period = this.isYearly ? "year" : "month";
        return `amount\u00A0per\u00A0${period}:\u00A0$${roundToCent(summary.amountPerPeriod)} ` 
            + `trxns\u00A0per\u00A0${period}:\u00A0${Math.round(summary.trxnsPerPeriod * 10) / 10} `
            + `amount\u00A0per\u00A0trxn:\u00A0$${roundToCent(summary.amountPerTrxn)}`;
    }

    dateClicked(row: ReportRow) {
        this.selectedDate = row;
        var ref = this.dialog.open(ReportRowComponent, {autoFocus: false, panelClass: "dialog-xl"});
        ref.componentInstance.init(row.date, this.showSubcategories, this.isYearly);
        ref.afterClosed().subscribe(() => {
            setTimeout(() => {
                this.selectedDate = null;
            }, 50);
        })
    }

    getColorStyles(header: ReportHeader){
        var colorSet = this.categoryColorService.getColorSet(header.name);
        return `background: ${colorSet.background}; border: 1px solid ${colorSet.border}`
    }

    headerClicked(header: ReportHeader) {
        if (header.special){
            return;
        }
        this.selectedHeader = header;
        var ref = this.dialog.open(ReportColumnComponent, {autoFocus: false, panelClass: "dialog-xl"});
        var header0Index = this.report!.headerRows[0].indexOf(header);
        var header1Index = this.report!.headerRows.length > 1 ? this.report!.headerRows[1].indexOf(header) : -1;
        if (header0Index >= 0){
            var catName = header.name;
        } else if (header1Index >= 0){
            var catName = this.report!.columns[header1Index].catName!;
            var subcatName = this.report!.columns[header1Index].subcatName;
        } else {
            throw "column not found";
        }
        ref.componentInstance.init(catName, subcatName, this.isYearly);
        ref.afterClosed().subscribe(() => {
            setTimeout(() => {
                this.selectedHeader = null;
            }, 50);
        })
    }

    updateReport() {
        if (this.isYearly) {
            if (this.showSubcategories) {
                this.report = this.reportService.getYearlySubcategoryReport();
            } else {
                this.report = this.reportService.getYearlyCategoryReport();
            }
        } else {
            if (this.showSubcategories) {
                this.report = this.reportService.getMonthlySubcategoryReport();
            } else {
                this.report = this.reportService.getMonthlyCategoryReport();
            }
        }
    }


    getColorOpacity(cell: ReportCell): string {
        return "--report-cell-opacity: " + Math.abs(cell.deviation);
    }

    getMaxWidth() {
        return (this.report!.columns.length + 2) * 300;
    }

    anyExtrapolated(): boolean{
        return this.report!.rows.some(z => z.extrapolated);
    }
}
