import { Injectable } from '@angular/core';
import { Settings, SettingsService } from "@services/settings.service";
import { Transaction, TransactionService } from "@services/transaction.service";
import { StatService } from './stat.service';
import { CategoryService, Subcategory } from './category.service';
import { getSum, groupBy, getDistinct, getDistinctBySelectorFunc, areValuesSame } from '@services/helpers';

export type Report = {
    headerRows: ReportHeader[][]
    rows: ReportRow[]
    columns: ReportColumn[],
    averages: number[];
    totalAverage: number;
}

export type ReportHeader = {
    width: number;
    name: string;
}

export type ReportColumn = {
    catName: string;
    subcatName?: string | undefined;
}

export type ReportRow = {
    date: Date;
    cells: ReportCell[];
    totalCell: ReportCell;
    extrapolated?: number | undefined;
}

export type ReportCell = {
    amount: number;
    deviation: number;
}

type SubcategoryContainer = {
    category: string,
    subcategories: string[]
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {

    private allTransactions: Transaction[] = [];
    private recentTransactions: Transaction[] = [];
    private settings: Settings;

    constructor(
        private transactionsService: TransactionService, 
        private settingsService: SettingsService,
        private statService: StatService,
        private categoryService: CategoryService) {
        this.settings = this.settingsService.getSettings();
    }

    getMonthlyCategoryReport(): Report | null {
        var catMonthStats = this.statService.getCatMonthStats();
        if (!catMonthStats.length){
            return null;
        }
        var recentCatStats = this.statService.getRecentCatStats();
        var recentTotalStat = this.statService.getRecentTotalStat();
        var headerRows: ReportHeader[][] = [recentCatStats.map(z => ({ width: 1, name: z.catName }))];
        var columns: ReportColumn[] = recentCatStats.map(z => ({ catName: z.catName }));
        var rows: ReportRow[] = [];
        var statMonthGroups = groupBy(catMonthStats, z => z.month);
        for (var statMonthGroup of statMonthGroups){
            var cells: ReportCell[] = [];
            for (var recentCatStat of recentCatStats){
                var cellStat = statMonthGroup.items.find(z => z.catName == recentCatStat.catName)!
                cells.push({
                    amount: cellStat.sumAmount,
                    deviation: this.getDeviation(cellStat.sumAmount, recentCatStat.sumAmount / recentCatStat.monthCount, recentCatStat.monthSD)
                });
            }
            var rowTotal = getSum(statMonthGroup.items.map(z => z.sumAmount));
            rows.push({
                date: statMonthGroup.key,
                cells: cells,
                totalCell: {
                    amount: rowTotal,
                    deviation: this.getDeviation(rowTotal, recentTotalStat.sumAmount / recentTotalStat.monthCount, recentTotalStat.monthSD)
                }
            });
        }
        var report: Report = {
            headerRows: headerRows,
            rows: rows,
            columns: columns,
            averages: recentCatStats.map(z => z.sumAmount / z.monthCount),
            totalAverage: recentTotalStat.sumAmount / recentTotalStat.monthCount
        };
        return report;
    }

    getYearlyCategoryReport(): Report | null {
        return this.getMonthlyCategoryReport();
    }

    getMonthlySubcategoryReport(): Report | null {
        var subcatMonthStats = this.statService.getSubcatMonthStats();
        if (!subcatMonthStats.length){
            return null;
        }
        var recentSubcatStats = this.statService.getRecentSubcatStats();
        var categoryGroups = groupBy(recentSubcatStats.map(z => z.subcategory), z => z.catName);
        var recentTotalStat = this.statService.getRecentTotalStat();
        var headerFirstRow: ReportHeader[] = categoryGroups.map(z => ({ 
            width: z.items.length, 
            name: z.key }));
        var headerRows: ReportHeader[][] = [
            headerFirstRow,
            recentSubcatStats.map(z => ({ width: 1, name: z.subcategory.subcatName }))
        ];
        var columns: ReportColumn[] = recentSubcatStats.map(z => ({ catName: z.subcategory.catName, subcatName: z.subcategory.subcatName }));
        var rows: ReportRow[] = [];
        var statMonthGroups = groupBy(subcatMonthStats, z => z.month);
        for (var statMonthGroup of statMonthGroups){
            var cells: ReportCell[] = [];
            for (var recentSubcatStat of recentSubcatStats){
                var cellStat = statMonthGroup.items.find(z => areValuesSame(z.subcategory, recentSubcatStat.subcategory))!
                cells.push({
                    amount: cellStat.sumAmount,
                    deviation: this.getDeviation(cellStat.sumAmount, recentSubcatStat.sumAmount / recentSubcatStat.monthCount, recentSubcatStat.monthSD)
                });
            }
            var rowTotal = getSum(statMonthGroup.items.map(z => z.sumAmount));
            rows.push({
                date: statMonthGroup.key,
                cells: cells,
                totalCell: {
                    amount: rowTotal,
                    deviation: this.getDeviation(rowTotal, recentTotalStat.sumAmount / recentTotalStat.monthCount, recentTotalStat.monthSD)
                }
            });
        }
        var report: Report = {
            headerRows: headerRows,
            rows: rows,
            columns: columns,
            averages: recentSubcatStats.map(z => z.sumAmount / z.monthCount),
            totalAverage: recentTotalStat.sumAmount / recentTotalStat.monthCount
        };
        return report;
    }

    getYearlySubcategoryReport(): Report | null {
        return this.getMonthlySubcategoryReport();
    }


    private getDeviation(amount: number, mean: number, sd: number | undefined): number {
        if (sd == null){
            return 0;
        }
        var diff = amount - mean;
        var sign = diff > 0 ? 1 : -1;
        diff = Math.abs(diff);
        diff = Math.max(0, diff - this.settings.reportColorDeadZone);
        if (diff > this.settings.reportColorHalfDeadZone){
            diff = diff - (this.settings.reportColorHalfDeadZone / 2);
        } else {
            diff = diff / 2;
        }
        var zScore = diff / sd;
        var severity = zScore / this.settings.reportColorSevereZScore;
        severity = Math.min(1, severity);
        return severity * sign;
    }
}
