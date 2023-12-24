import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { CategoryDonutComponent } from '@components/category-donut/category-donut.component';
import { ReportService, Report, ReportCell, ReportRow } from '@services/report.service';
import { TransactionService } from '@services/transaction.service';
import { SettingsService } from '@services/settings.service';
import { DonutData, DonutSubcategoryItem, DonutCategoryItem } from "@components/category-donut/category-donut.component";
import { BarCategoryItem, BarData, BarDateItem, CategoryBarComponent } from "@components/category-bar/category-bar.component";

@Component({
    selector: 'mer-dashboard-metrics',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatTableModule, CategoryDonutComponent, CategoryBarComponent],
    templateUrl: './dashboard-metrics.component.html'
})
export class DashboardMetricsComponent {
    donutData: DonutData | undefined;
    barData: BarData | undefined;
    constructor(
        private reportService: ReportService
    ) {

    }
    ngOnInit() {
        this.CalcDonutData();
        this.CalcBarData();

    }

    private CalcBarData(){
        var report = this.reportService.getMonthlyCategoryReport();
        var dateItems: BarDateItem[] = [];
        if (report.rows.length) {
            var dateItems: BarDateItem[] = [];
            for (var row of report.rows){
                var catItems: BarCategoryItem[] = row.cells.map((cell, i) => ({
                    category: report.headerRows[0][i].name,
                    amount: cell.amount
                }));
                dateItems.push({
                    date: row.date,
                    items: catItems
                });
            }
            this.barData = {
                isYearly: false,
                items: dateItems
            };
        }
    }

    private CalcDonutData(){
        var report = this.reportService.getMonthlySubcategoryReport();
        if (report.rows.length) {
            var rowIndex = 0;
            var row = report.rows[rowIndex];
            var categoryItems: DonutCategoryItem[] = [];
            var sumWidth = 0;
            for (var catIndex = 0; catIndex < report.headerRows[0].length; catIndex++) {
                var colIndexes: number[] = [];
                for (var colIndex = sumWidth; colIndex < sumWidth + report.headerRows[0][catIndex].width; colIndex++) {
                    colIndexes.push(colIndex);
                }
                var subcategoryNames = report.headerRows[1].filter((z, i) => colIndexes.includes(i)).map(z => z.name);
                var subcategoryAmounts = row.cells.filter((z, i) => colIndexes.includes(i)).map(z => z.amount);
                var subcategoryAverageAmounts = report.averages.filter((z, i) => colIndexes.includes(i));
                var subcategoryItems = row.cells.filter((z, i) => colIndexes.includes(i)).map((z, i) => <DonutSubcategoryItem>{
                    subcategory: subcategoryNames[i],
                    amount: subcategoryAmounts[i],
                    averageAmount: subcategoryAverageAmounts[i]
                });
                var categoryAmount = subcategoryAmounts.reduce((a, b) => a + b, 0);
                var categoryAverageAmount = subcategoryAverageAmounts.reduce((a, b) => a + b, 0);

                categoryItems.push({
                    category: report.headerRows[0][catIndex].name,
                    amount: categoryAmount,
                    averageAmount: categoryAverageAmount,
                    items: subcategoryItems
                });
                sumWidth += report.headerRows[0][catIndex].width;

            }
            this.donutData = {
                isYearly: false,
                date: row.date,
                items: categoryItems
            };
        }
    }
}