import { Injectable } from '@angular/core';
import { Settings, SettingsService } from "@services/settings.service";
import { MonthlyInfo, Stat, StatService, YearlyInfo } from './stat.service';
import { getSum, groupBy, areValuesSame } from '@services/helpers';
import { Subcategory } from './category.service';

export type Report = {
    headerRows: ReportHeader[][]
    rows: ReportRow[]
    columns: ReportColumn[],
    columnSummaries: ReportSummary[];
}

export type ReportHeader = {
    width: number;
    name: string;
    special?: ReportSpecialColumn | undefined;
}

export type ReportSpecialColumn = "Total" | "Expenses"

export type ReportColumn = {
    catName?: string | undefined;
    subcatName?: string | undefined;
    special?: ReportSpecialColumn | undefined; 
}

export type ReportSummary = {
    amountPerPeriod: number;
    trxnsPerPeriod: number;
    amountPerTrxn: number;
}

export type ReportRow = {
    date: Date;
    extrapolated: boolean;
    cells: ReportCell[];
}

export type ReportCell = {
    amount: number;
    deviation: number;
}


@Injectable({
    providedIn: 'root'
})
export class ReportService {


    constructor(
        private settingsService: SettingsService,
        private statService: StatService) {
    }

    getMonthlyCategoryReport(): Report | null {
        var catMonthStats = this.statService.getCatMonthStats();
        if (!catMonthStats.length){
            return null;
        }
        var recentCatStats = this.statService.getRecentCatStatsMonthlyInfo();
        var recentTotalStat = this.statService.getRecentTotalStatMonthlyInfo();
        var recentExpenseStat = this.statService.getRecentTotalStatMonthlyInfo(true); //excludes income
        var headerRows = this.getCategoryHeaders(recentCatStats.map(z => z.catName));
        var columns = this.headersToColumn(headerRows);
        var rows: ReportRow[] = [];
        var statMonthGroups = groupBy(catMonthStats, z => z.month);
        for (var statMonthGroup of statMonthGroups){
            var cells: ReportCell[] = [];
            for (var column of columns){
                if (!column.special){
                    var recentCatStat = recentCatStats.find(z => z.catName == column.catName)!;
                    var cellStat = statMonthGroup.items.find(z => areValuesSame(z.catName, recentCatStat.catName))!
                    cells.push({
                        amount: cellStat.sumAmount,
                        deviation: this.getDeviation(cellStat.sumAmount, recentCatStat.sumAmount / recentCatStat.monthCount, recentCatStat.monthSD)
                    });
                } else if (column.special == "Expenses"){
                    var nonIncomeStatYearGroups = statMonthGroup.items.filter(z => z.catName != "income");
                    var expenseTotal = getSum(nonIncomeStatYearGroups.map(z => z.sumAmount));
                    cells.push({
                        amount: expenseTotal,
                        deviation: this.getDeviation(expenseTotal, recentExpenseStat.sumAmount / recentExpenseStat.monthCount, recentExpenseStat.monthSD)
                    });
                } else if (column.special == "Total"){
                    var rowTotal = getSum(statMonthGroup.items.map(z => z.sumAmount));
                    cells.push({
                        amount: rowTotal,
                        deviation: this.getDeviation(rowTotal, recentTotalStat.sumAmount / recentTotalStat.monthCount, recentTotalStat.monthSD)
                    });
                } 
            }
            rows.push({
                date: statMonthGroup.key,
                extrapolated: false,
                cells: cells
            });
        }
        var summaries = columns.map(column => {
            if (!column.special){
                return this.getMonthSummary(recentCatStats.find(z => z.catName == column.catName)!);
            } else if (column.special == "Expenses"){
                return this.getMonthSummary(recentExpenseStat);
            } else if (column.special == "Total"){
                return this.getMonthSummary(recentTotalStat);
            }
            throw "invalid column";
        });
        var report: Report = {
            headerRows: headerRows,
            rows: rows,
            columns: columns,
            columnSummaries: summaries
        };
        return report;
    }

    getYearlyCategoryReport(): Report | null {
        var catYearStats = this.statService.getCatYearStats();
        if (!catYearStats.length){
            return null;
        }
        var catStats = this.statService.getCatStatsYearlyInfo();
        var totalStat = this.statService.getTotalStatYearlyInfo();
        var expenseStat = this.statService.getTotalStatYearlyInfo(true); //excludes income
        var headerRows = this.getCategoryHeaders(catStats.map(z => z.catName));
        var columns = this.headersToColumn(headerRows);
        var rows: ReportRow[] = [];
        var statYearGroups = groupBy(catYearStats, z => z.year);
        for (var statYearGroup of statYearGroups){
            var cells: ReportCell[] = [];
            var extrapolated = false;
            for (var column of columns){
                if (!column.special){
                    var catStat = catStats.find(z => z.catName == column.catName)!;
                    var cellStat = statYearGroup.items.find(z => areValuesSame(z.catName, catStat.catName))!
                    cells.push({
                        amount: cellStat.sumAmount,
                        deviation: this.getDeviation(cellStat.extrapolatedAmount, catStat.extrapolatedAmount / catStat.yearCount, catStat.extrapolatedSD)
                    });
                } else if (column.special == "Expenses"){
                    var nonIncomeStatYearGroups = statYearGroup.items.filter(z => z.catName != "income");
                    var expenseTotal = getSum(nonIncomeStatYearGroups.map(z => z.sumAmount));
                    var extExpenseTotal = getSum(nonIncomeStatYearGroups.map(z => z.extrapolatedAmount));
                    cells.push({
                        amount: expenseTotal,
                        deviation: this.getDeviation(extExpenseTotal, expenseStat.extrapolatedAmount / expenseStat.yearCount, expenseStat.extrapolatedSD)
                    });
                } else if (column.special == "Total"){
                    var rowTotal = getSum(statYearGroup.items.map(z => z.sumAmount));
                    var extRowTotal = getSum(statYearGroup.items.map(z => z.extrapolatedAmount));
                    extrapolated = rowTotal != extRowTotal
                    cells.push({
                        amount: rowTotal,
                        deviation: this.getDeviation(extRowTotal, totalStat.extrapolatedAmount / totalStat.yearCount, totalStat.extrapolatedSD)
                    });
                } 
            }
            rows.push({
                date: statYearGroup.key,
                cells: cells,
                extrapolated: extrapolated
            });
        }
        var summaries = columns.map(column => {
            if (!column.special){
                return this.getYearSummary(catStats.find(z => z.catName == column.catName)!);
            } else if (column.special == "Expenses"){
                return this.getYearSummary(expenseStat);
            } else if (column.special == "Total"){
                return this.getYearSummary(totalStat);
            }
            throw "invalid column";
        });
        var report: Report = {
            headerRows: headerRows,
            rows: rows,
            columns: columns,
            columnSummaries: summaries
        };
        return report;
    }

    getMonthlySubcategoryReport(): Report | null {
        var subcatMonthStats = this.statService.getSubcatMonthStats();
        if (!subcatMonthStats.length){
            return null;
        }
        var recentSubcatStats = this.statService.getRecentSubcatStatsMonthlyInfo();
        var recentTotalStat = this.statService.getRecentTotalStatMonthlyInfo();
        var recentExpenseStat = this.statService.getRecentTotalStatMonthlyInfo(true);
        var headerRows = this.getSubcategoryHeaders(recentSubcatStats.map(z => z.subcategory));
        var columns: ReportColumn[] = this.headersToColumn(headerRows);
        var rows: ReportRow[] = [];
        var statMonthGroups = groupBy(subcatMonthStats, z => z.month);
        for (var statMonthGroup of statMonthGroups){
            var cells: ReportCell[] = [];
            for (var column of columns){
                if (!column.special){
                    var recentSubcatStat = recentSubcatStats.find(z => z.subcategory.catName == column.catName && z.subcategory.subcatName == column.subcatName)!;
                    var cellStat = statMonthGroup.items.find(z => areValuesSame(z.subcategory, recentSubcatStat.subcategory))!
                    cells.push({
                        amount: cellStat.sumAmount,
                        deviation: this.getDeviation(cellStat.sumAmount, recentSubcatStat.sumAmount / recentSubcatStat.monthCount, recentSubcatStat.monthSD)
                    });
                } else if (column.special == "Expenses"){
                    var nonIncomeStatYearGroups = statMonthGroup.items.filter(z => z.subcategory.catName != "income");
                    var expenseTotal = getSum(nonIncomeStatYearGroups.map(z => z.sumAmount));
                    cells.push({
                        amount: expenseTotal,
                        deviation: this.getDeviation(expenseTotal, recentExpenseStat.sumAmount / recentExpenseStat.monthCount, recentExpenseStat.monthSD)
                    });
                } else if (column.special == "Total"){
                    var rowTotal = getSum(statMonthGroup.items.map(z => z.sumAmount));
                    cells.push({
                        amount: rowTotal,
                        deviation: this.getDeviation(rowTotal, recentTotalStat.sumAmount / recentTotalStat.monthCount, recentTotalStat.monthSD)
                    });
                } 
            }
            rows.push({
                date: statMonthGroup.key,
                cells: cells,
                extrapolated: false
            });
        }
        var summaries = columns.map(column => {
            if (!column.special){
                return this.getMonthSummary(recentSubcatStats.find(z => z.subcategory.catName == column.catName && z.subcategory.subcatName == column.subcatName)!);
            } else if (column.special == "Expenses"){
                return this.getMonthSummary(recentExpenseStat);
            } else if (column.special == "Total"){
                return this.getMonthSummary(recentTotalStat);
            }
            throw "invalid column";
        });
        var report: Report = {
            headerRows: headerRows,
            rows: rows,
            columns: columns,
            columnSummaries: summaries
        };
        return report;
    }

    getYearlySubcategoryReport(): Report | null {
        var subcatYearStats = this.statService.getSubcatYearStats();
        if (!subcatYearStats.length){
            return null;
        }
        var subcatStats = this.statService.getSubcatStatsYearlyInfo();
        var totalStat = this.statService.getTotalStatYearlyInfo();
        var expenseStat = this.statService.getTotalStatYearlyInfo(true); //excludes income
        
        var headerRows = this.getSubcategoryHeaders(subcatStats.map(z => z.subcategory));
        var columns = this.headersToColumn(headerRows);
        var rows: ReportRow[] = [];
        var statYearGroups = groupBy(subcatYearStats, z => z.year);
        for (var statYearGroup of statYearGroups){
            var cells: ReportCell[] = [];
            var extrapolated = false;
            for (var column of columns){
                if (!column.special){
                    var subcatStat = subcatStats.find(z => z.subcategory.catName == column.catName && z.subcategory.subcatName == column.subcatName)!;
                    var cellStat = statYearGroup.items.find(z => areValuesSame(z.subcategory, subcatStat.subcategory))!
                    cells.push({
                        amount: cellStat.sumAmount,
                        deviation: this.getDeviation(cellStat.extrapolatedAmount, subcatStat.extrapolatedAmount / subcatStat.yearCount, subcatStat.extrapolatedSD)
                    });
                } else if (column.special == "Expenses"){
                    var nonIncomeStatYearGroups = statYearGroup.items.filter(z => z.subcategory.catName != "income");
                    var expenseTotal = getSum(nonIncomeStatYearGroups.map(z => z.sumAmount));
                    var extExpenseTotal = getSum(nonIncomeStatYearGroups.map(z => z.extrapolatedAmount));
                    cells.push({
                        amount: expenseTotal,
                        deviation: this.getDeviation(extExpenseTotal, expenseStat.extrapolatedAmount / expenseStat.yearCount, expenseStat.extrapolatedSD)
                    });
                } else if (column.special == "Total"){
                    
                    var rowTotal = getSum(statYearGroup.items.map(z => z.sumAmount));
                    var extRowTotal = getSum(statYearGroup.items.map(z => z.extrapolatedAmount));
                    extrapolated = rowTotal != extRowTotal
                    cells.push({
                        amount: rowTotal,
                        deviation: this.getDeviation(extRowTotal, totalStat.extrapolatedAmount / totalStat.yearCount, totalStat.extrapolatedSD)
                    });
                } 
            }
            rows.push({
                date: statYearGroup.key,
                cells: cells,
                extrapolated: extrapolated
            });
        }
        var summaries = columns.map(column => {
            if (!column.special){
                return this.getYearSummary(subcatStats.find(z => z.subcategory.catName == column.catName && z.subcategory.subcatName == column.subcatName)!);
            } else if (column.special == "Expenses"){
                return this.getYearSummary(expenseStat);
            } else if (column.special == "Total"){
                return this.getYearSummary(totalStat);
            }
            throw "invalid column";
        });
        var report: Report = {
            headerRows: headerRows,
            rows: rows,
            columns: columns,
            columnSummaries: summaries
        };
        return report;
    }

    private getCategoryHeaders(catNames: string[]): ReportHeader[][]{
        var headerFirstRow: ReportHeader[] = catNames.map(z => ({ width: 1, name: z }));
        var headerRows: ReportHeader[][] = [headerFirstRow];
        var incomeGroup = catNames.find(z => z == "income");
        var totalName = "total";
        if (incomeGroup){
            totalName = "net expenses"
            var expenseHeader: ReportHeader = { width: 1, name: "sum expenses", special: "Expenses"};
            headerFirstRow.splice(headerFirstRow.length - 1, 0, expenseHeader);
        }
        var totalHeader: ReportHeader = { width: 1, name: totalName, special: "Total"};
        headerFirstRow.push(totalHeader);
        return headerRows;
    }

    private getSubcategoryHeaders(subcats: Subcategory[]): ReportHeader[][]{
        var catGroups = groupBy(subcats, z => z.catName);
        var headerFirstRow: ReportHeader[] = catGroups.map(z => ({ 
            width: z.items.length, 
            name: z.key 
        }));
        var headerRows: ReportHeader[][] = [
            headerFirstRow,
            subcats.map(z => ({ width: 1, name: z.subcatName }))
        ];
        var incomeGroup = catGroups.find(z => z.key == "income");
        var totalName = "total";
        if (incomeGroup){
            totalName = "net expenses"
            var expenseHeader: ReportHeader = { width: 1, name: "sum expenses", special: "Expenses"};
            headerFirstRow.splice(headerFirstRow.length - 1, 0, expenseHeader);
            headerRows[1].splice(headerRows[1].length - incomeGroup.items.length, 0, expenseHeader)
        }
        var totalHeader: ReportHeader = { width: 1, name: totalName, special: "Total"};
        headerFirstRow.push(totalHeader);
        headerRows[1].push(totalHeader);
        return headerRows;
    }

    private headersToColumn(headers: ReportHeader[][]): ReportColumn[]{
        var output: ReportColumn[] = [];
        var subcatPos = 0;
        for (var catHeader of headers[0]){
            if (headers[1]){
                for (var subcatHeader of headers[1].slice(subcatPos, subcatPos + catHeader.width)){
                    output.push({
                        catName: catHeader.special ? undefined : catHeader.name,
                        subcatName: catHeader.special ? undefined : subcatHeader.name,
                        special: catHeader.special
                    });
                }
                subcatPos += catHeader.width;
            } else {
                output.push({
                    catName: catHeader.special ? undefined : catHeader.name,
                    subcatName: undefined,
                    special: catHeader.special
                });
            }
        }
        return output;
    }

    private getMonthSummary(stat: Stat & MonthlyInfo): ReportSummary {
        return {
            amountPerPeriod: stat.sumAmount / stat.monthCount,
            trxnsPerPeriod: stat.trxnCount / stat.monthCount,
            amountPerTrxn: stat.sumAmount / stat.trxnCount
        }
    }

    
    private getYearSummary(stat: Stat & YearlyInfo): ReportSummary {
        return {
            amountPerPeriod: stat.sumAmount / stat.yearCount,
            trxnsPerPeriod: stat.trxnCount / stat.yearCount,
            amountPerTrxn: stat.sumAmount / stat.trxnCount
        }
    }

    private getDeviation(amount: number, mean: number, sd: number | undefined): number {
        if (sd == null){
            return 0;
        }
        var settings = this.settingsService.getSettings();
        var diff = amount - mean;
        var sign = diff > 0 ? 1 : -1;
        diff = Math.abs(diff);
        diff = Math.max(0, diff - settings.reportColorDeadZone);
        var zScore = diff / sd;
        var severity = zScore / settings.reportColorSevereZScore;
        severity = Math.min(1, severity);
        return severity * sign;
    }
}
