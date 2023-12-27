import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { CategoryDonutComponent } from '@components/category-donut/category-donut.component';
import { ReportService, Report, ReportCell, ReportRow } from '@services/report.service';
import { TransactionService } from '@services/transaction.service';
import { SettingsService } from '@services/settings.service';
import { BarCategoryItem, BarData, BarDateItem, CategoryBarComponent } from "@components/category-bar/category-bar.component";
import { StatService } from '@services/stat.service';
import { groupBySelectorFunc } from '@services/helpers';

@Component({
    selector: 'mer-dashboard-metrics',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatTableModule, CategoryDonutComponent, CategoryBarComponent],
    templateUrl: './dashboard-metrics.component.html'
})
export class DashboardMetricsComponent {
    barData: BarData | undefined;
    constructor(
        private reportService: ReportService,
        private statService: StatService,
    ) {

    }
    ngOnInit() {
        this.CalcBarData();

    }

    private CalcBarData(){
        var stats = this.statService.getCatMonthStats();
        if (stats.length) {
            var dateItems: BarDateItem[] = [];
            var monthGroups = groupBySelectorFunc(stats, z => z.month);
            for (var monthGroup of monthGroups){
                var catItems: BarCategoryItem[] = monthGroup.items.map(catMonthStat => ({
                    catName: catMonthStat.catName,
                    amount: catMonthStat.sumAmount
                }));
                dateItems.push({
                    date: monthGroup.key,
                    items: catItems
                });
            }
            this.barData = {
                isYearly: false,
                items: dateItems
            };
        }
    }
}