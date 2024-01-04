import { Component, Input } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule  } from '@angular/material/button';
import { ReportCellComponent } from '@components/report-cell/report-cell.component';
import { ReportRowComponent } from '@components/report-row/report-row.component';
import { ReportColumnComponent } from '@components/report-column/report-column.component';
import { MatDialog } from '@angular/material/dialog';
import { ReportService, Report, ReportCell, ReportRow, ReportHeader } from '@services/report.service';
import { ExportService } from '@services/export.service';
import { CategoryColorService } from '@services/category-color.service';
import { LocalSettingsService } from '@services/local-settings.service';


@Component({
    selector: 'mer-report',
    standalone: true,
    imports: [CommonModule, FormsModule, MatButtonModule, MatSlideToggleModule],
    templateUrl: './report.component.html'
})
export class ReportComponent {
    @Input() isYearly: boolean = false;
    report: Report | null = null;
    showSubcategories: boolean = false;
    selectedCell: ReportCell | null = null;
    selectedDate: ReportRow | null = null;
    selectedHeader: ReportHeader | null = null;

    constructor(
        private reportService: ReportService,
        private categoryColorService: CategoryColorService,
        private localSettingsService: LocalSettingsService,
        private dialog: MatDialog,
        private exportService: ExportService
    ) {
    }

    ngOnInit() {
        console.log("test", this.localSettingsService.getValue("reportSubcat"))
        this.showSubcategories = this.localSettingsService.getValue("reportSubcat") ?? false;
        this.updateReport();
    }

    showSubcategoriesChanged() {
        this.localSettingsService.setValue("reportSubcat", this.showSubcategories);
        this.updateReport();
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
            stringHeaders.push("total");
            stringHeaderRows.push(stringHeaders);
        }
        if (stringHeaderRows.length == 2){
            stringHeaderRows[0][0] = "";
            stringHeaderRows[0][stringHeaderRows[0].length - 1] = "";
        }
        var datePipe = new DatePipe('en-US');
        var currencyPipe = new CurrencyPipe('en-US');
        var dateTransformStr = this.isYearly ? 'y' : 'MMM y'
        var rowData = this.report!.rows.map(row => 
            [
                datePipe.transform(row.date, dateTransformStr)!, 
                ...row.cells.map(z => currencyPipe.transform(z.amount)!),
                currencyPipe.transform(row.totalCell.amount)!
            ]
        )
        var data = [
            ...stringHeaderRows,
            ...rowData
        ]
        var fileName = this.isYearly ? "yearly-report.csv" : "monthly-report.csv";
        this.exportService.exportData(data, fileName)
    }

    cellClicked(cell: ReportCell, row: ReportRow, index: number | null) {
        this.selectedCell = cell;
        var ref = this.dialog.open(ReportCellComponent, {autoFocus: false});
        var column = index != null ? this.report!.columns[index] : null;
        ref.componentInstance.init(row.date, column, this.isYearly);
        ref.afterClosed().subscribe(() => {
            setTimeout(() => {
                this.selectedCell = null;
            }, 50);
        })
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
        this.selectedHeader = header;
        var ref = this.dialog.open(ReportColumnComponent, {autoFocus: false, panelClass: "dialog-xl"});
        var header0Index = this.report!.headerRows[0].indexOf(header);
        var header1Index = this.report!.headerRows.length > 1 ? this.report!.headerRows[1].indexOf(header) : -1;
        if (header0Index >= 0){
            var catName = header.name;
        } else if (header1Index >= 0){
            var catName = this.report!.columns[header1Index].catName;
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
}
