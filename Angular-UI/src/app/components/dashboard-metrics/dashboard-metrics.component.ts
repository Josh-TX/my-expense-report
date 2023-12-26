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
import { StatService } from '@services/stat.service';
import { groupBySelectorFunc } from '@services/helpers';

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
        private reportService: ReportService,
        private statService: StatService,
    ) {

    }
    ngOnInit() {
        this.CalcDonutData();
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
    private CalcDonutData(){
        var currentMonth = this.statService.getCurrentMonth();
        if (!currentMonth) {
            return;
        }
        var currentCatStats = this.statService.getCatStats(currentMonth);
        if (currentCatStats.length == 1){
            return;
        }
        var recentCutoff = this.statService.getRecentCutoff();
        var recentCatStats = this.statService.getCatStats(currentMonth, recentCutoff);
        var currentSubcatStats = this.statService.getSubcatStats(currentMonth);
        var recentSubcatStats = this.statService.getSubcatStats(currentMonth, recentCutoff);

        var catItems: DonutCategoryItem[] = [];
        for (var currentCatStat of currentCatStats){
            var catName = currentCatStat.catName;
            var recentCatStat = recentCatStats.find(z => z.catName == catName)!;
            var matchingCurrentSubcatStats = currentSubcatStats.filter(z => z.subcategory.catName == catName);
            var matchingRecentSubcatStats = recentSubcatStats.filter(z => z.subcategory.catName == catName);
            var subcatItems: DonutSubcategoryItem[] = [];
            for (var currentSubcatStat of matchingCurrentSubcatStats){
                var recentSubcatStat = matchingRecentSubcatStats.find(z => z.subcategory.subcatName == currentSubcatStat.subcategory.subcatName)!;
                subcatItems.push({
                    subcategory: currentSubcatStat.subcategory,
                    amount: currentCatStat.sumAmount,
                    averageAmount: recentSubcatStat.sumAmount / recentSubcatStat.monthCount
                });
            }
            catItems.push({
                catName: catName,
                amount: currentCatStat.sumAmount,
                averageAmount: recentCatStat.sumAmount / recentCatStat.monthCount,
                subcategoryItems: subcatItems
            });
        }

        this.donutData = {
            isYearly: false,
            date: currentMonth,
            categoryItems: catItems
        };
    }
}