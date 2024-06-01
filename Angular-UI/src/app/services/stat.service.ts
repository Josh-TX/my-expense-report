import { Injectable, Signal, WritableSignal, computed, signal } from '@angular/core';
import { Settings, SettingsService } from "@services/settings.service";
import { Transaction, TransactionService } from "@services/transaction.service";
import { getStartOfMonth, groupBy, getSum, sortBy, sortByDesc, areValuesSame, roundToCent, getSD, getCombinedSet } from "@services/helpers";
import { CategoryService, Subcategory } from './category.service';

export type Stat = {
    trxnCount: number,
    sumAmount: number,
    sd?: number | undefined
}

export type MonthlyInfo = {
    monthCount: number,
    monthSD?: number | undefined
}

export type YearlyInfo = {
    yearCount: number,
    yearSD?: number | undefined
    extrapolatedAmount: number,
    extrapolatedSD?: number | undefined
}

export type TotalStatMonthlyInfo = Stat & MonthlyInfo;
export type TotalStatYearlyInfo = Stat & YearlyInfo;

export type CatStatMonthlyInfo = Stat & MonthlyInfo & { catName: string }
export type SubcatStatMonthlyInfo = Stat & MonthlyInfo & { subcategory: Subcategory }

export type CatStatYearlyInfo = Stat & YearlyInfo & { catName: string }
export type SubcatStatYearlyInfo = Stat & YearlyInfo & { subcategory: Subcategory }

export type CatMonthStat = Stat & {
    month: Date,
    catName: string
}
export type SubcatMonthStat = Stat & {
    month: Date,
    subcategory: Subcategory
}

export type CatYearStat = Stat & {
    year: Date,
    extrapolatedAmount: number,
    monthCount: number,
    catName: string
}
export type SubcatYearStat = Stat & {
    year: Date,
    extrapolatedAmount: number,
    monthCount: number,
    subcategory: Subcategory
}


type MonthStatsContainer = {
    subcatMonthStats: SubcatMonthStat[],
    catMonthStats: CatMonthStat[]
}

type YearStatsContainer = {
    catYearStats: CatYearStat[]
    subcatYearStats: SubcatYearStat[],
}

@Injectable({
    providedIn: 'root'
})
export class StatService {

    private catMonthStats$: Signal<CatMonthStat[]>;
    private subcatMonthStats$: Signal<SubcatMonthStat[]>;    
    private catYearStats$: Signal<CatYearStat[]>;
    private subcatYearStats$: Signal<SubcatYearStat[]>;

    constructor(
        private transactionsService: TransactionService, 
        private categoryService: CategoryService, 
        private settingsService: SettingsService
        ) {
        this.catMonthStats$ = signal([]);
        this.subcatMonthStats$ = signal([]);
        var monthStatsContainer$ = computed(() => this.createMonthStatsContainer(this.transactionsService.getTransactions(), this.settingsService.getSettings(), true));
        this.catMonthStats$ = computed(() => monthStatsContainer$().catMonthStats);
        this.subcatMonthStats$ = computed(() => monthStatsContainer$().subcatMonthStats);
        var yearStatsContainer$ = computed(() => this.createYearStatsContainer(this.transactionsService.getTransactions(), this.settingsService.getSettings()));
        this.catYearStats$ = computed(() => yearStatsContainer$().catYearStats);
        this.subcatYearStats$ = computed(() => yearStatsContainer$().subcatYearStats);
    }

    getCurrentMonth(): Date | undefined {
        if (this.catMonthStats$().length){
            return this.catMonthStats$()[0].month;
        }
        return undefined;
    }

    getCurrentYear(): Date | undefined {
        if (this.catYearStats$().length){
            return this.catYearStats$()[0].year;
        }
        return undefined;
    }

    getRecentCutoff(): Date | undefined{
        if (this.catMonthStats$().length){
            var recentCutoff = new Date(this.catMonthStats$()[0].month);
            recentCutoff.setMonth(recentCutoff.getMonth() - Math.max(0, this.settingsService.getSettings().recentMonthCount - 1));
            return recentCutoff;
        }
        return undefined
    }

    getCatMonthStats(): CatMonthStat[]{
        return this.catMonthStats$();
    }
    getSubcatMonthStats(): SubcatMonthStat[]{
        return this.subcatMonthStats$();
    }

    getCatYearStats(): CatYearStat[]{
        return this.catYearStats$();
    }
    getSubcatYearStats(): SubcatYearStat[]{
        return this.subcatYearStats$();
    }

    getRecentTotalStatMonthlyInfo(excludeIncome = false): TotalStatMonthlyInfo {
        var currentMonth = this.getCurrentMonth();
        if (!currentMonth){
            return {
                monthCount: 0,
                trxnCount: 0,
                sumAmount: 0
            };
        }
        return this.getTotalStatMonthlyInfo(currentMonth, this.getRecentCutoff(), excludeIncome);
    }
    private getTotalStatMonthlyInfo(recentDate: Date, oldestDate?: Date | undefined, excludeIncome = false): TotalStatMonthlyInfo {
        var catStats = this.getCatStatsMonthlyInfo(recentDate, oldestDate);
        if (excludeIncome){
            catStats = catStats.filter(z => z.catName != "income");
        }
        var combinedStat = this.getCombinedStat(catStats);
        var monthlyCombinedSet = getCombinedSet(catStats.map(z => ({n: z.monthCount, sum: z.sumAmount, sd: z.monthSD})));
        return {
            monthCount: catStats.length ? catStats[0].monthCount : 0,
            monthSD: monthlyCombinedSet.sd,
            ...combinedStat
        };
    }

    getRecentCatStatsMonthlyInfo(): CatStatMonthlyInfo[] {
        var currentMonth = this.getCurrentMonth();
        if (!currentMonth){
            return [];
        }
        return this.getCatStatsMonthlyInfo(currentMonth, this.getRecentCutoff());
    }

    getRecentSubcatStatsMonthlyInfo(): SubcatStatMonthlyInfo[] {
        var currentMonth = this.getCurrentMonth();
        if (!currentMonth){
            return [];
        }
        return this.getSubcatStatsMonthlyInfo(currentMonth, this.getRecentCutoff());
    }

    getCatStatsMonthlyInfo(recentDate: Date, oldestDate?: Date | undefined): CatStatMonthlyInfo[] {
        var catMonthStatsInRange = this.catMonthStats$().filter(z => z.month.getTime() <= recentDate.getTime());
        var oldCutoff = oldestDate != null ? oldestDate : recentDate;
        catMonthStatsInRange = catMonthStatsInRange.filter(z => z.month.getTime() >= oldCutoff.getTime());
        var catGroups = groupBy(catMonthStatsInRange, z => z.catName);
        var output = catGroups.map(g => ({
            catName: g.key,
            monthCount: g.items.length,
            monthSD: getSD(g.items.map(z => z.sumAmount)),
            ...this.getCombinedStat(g.items)
        }))
        return output;
    }
    
    getSubcatStatsMonthlyInfo(recentDate: Date, oldestDate?: Date | undefined): SubcatStatMonthlyInfo[] {
        var subcatMonthStatsInRange = this.subcatMonthStats$().filter(z => z.month.getTime() <= recentDate.getTime());
        var oldCutoff = oldestDate != null ? oldestDate : recentDate;
        subcatMonthStatsInRange = subcatMonthStatsInRange.filter(z => z.month.getTime() >= oldCutoff.getTime());
        var subcatGroups = groupBy(subcatMonthStatsInRange, z => z.subcategory);
        return subcatGroups.map(g => ({
            subcategory: g.key,
            monthCount: g.items.length,
            monthSD: getSD(g.items.map(z => z.sumAmount)),
            ...this.getCombinedStat(g.items)
        }));
    }


    getTotalStatYearlyInfo(excludeIncome = false): TotalStatYearlyInfo {
        var catStats = this.getCatStatsYearlyInfo();
        if (excludeIncome){
            catStats = catStats.filter(z => z.catName != "income");
        }
        var combinedStat = this.getCombinedStat(catStats);
        var yearlyCombinedSet = getCombinedSet(catStats.map(z => ({n: z.yearCount, sum: z.sumAmount, sd: z.yearSD})));
        var extrapolatedCombinedSet = getCombinedSet(catStats.map(z => ({n: z.yearCount, sum: z.extrapolatedAmount, sd: z.extrapolatedSD})));
        return {
            yearCount: catStats.length ? catStats[0].yearCount : 0,
            yearSD: yearlyCombinedSet.sd,
            extrapolatedAmount: extrapolatedCombinedSet.sum,
            extrapolatedSD: extrapolatedCombinedSet.sd,
            ...combinedStat
        };
    }
    getCatStatsYearlyInfo(): CatStatYearlyInfo[] {
        var catGroups = groupBy(this.catYearStats$(), z => z.catName);
        var output: CatStatYearlyInfo[] = [];
        for (var catGroup of catGroups){
            var extAmounts = catGroup.items.map(z => z.extrapolatedAmount);
            var extSum = getSum(extAmounts);
            output.push({
                catName: catGroup.key,
                yearCount: catGroup.items.length,
                yearSD: getSD(catGroup.items.map(z => z.sumAmount)),
                extrapolatedAmount: extSum,
                extrapolatedSD: getSD(extAmounts, extSum),
                ...this.getCombinedStat(catGroup.items)
            });
        }
        return output;
    }
    getSubcatStatsYearlyInfo(): SubcatStatYearlyInfo[] {
        var subcatGroups = groupBy(this.subcatYearStats$(), z => z.subcategory);
        var output: SubcatStatYearlyInfo[] = [];
        for (var subcatGroup of subcatGroups){
            var extAmounts = subcatGroup.items.map(z => z.extrapolatedAmount);
            var extSum = getSum(extAmounts);
            output.push({
                subcategory: subcatGroup.key,
                yearCount: subcatGroup.items.length,
                yearSD: getSD(subcatGroup.items.map(z => z.sumAmount)),
                extrapolatedAmount: extSum,
                extrapolatedSD: getSD(extAmounts, extSum),
                ...this.getCombinedStat(subcatGroup.items)
            });
        }
        return output;
    }

    private createYearStatsContainer(transactions: Transaction[], settings: Settings): YearStatsContainer {
        //I don't use monthStatsContainer$().subcatMonthStats because it can exclude the most recent month depending on settings.requiredDaysForLatestMonth
        //despite being ineffecient, for the sake of accuracy I'll recompute the subcatMonthStats without filtering by requiredDaysForLatestMonth. 
        var subcatMonthStats = this.createMonthStatsContainer(transactions, settings, false).subcatMonthStats;
        //first compute subcatYearStats from the subcatMonthStats
        var subcatYearGroups = groupBy(subcatMonthStats, z => ({subcategory: z.subcategory, year: z.month.getFullYear()}));
        var subcatYearStats: SubcatYearStat[] = [];
        for (var subcatYearGroup of subcatYearGroups){
            var stat = this.getCombinedStat(subcatYearGroup.items);
            subcatYearStats.push({
                year: new Date(subcatYearGroup.key.year, 0,1), 
                extrapolatedAmount: stat.sumAmount * 12 / subcatYearGroup.items.length, //this will be a slight underestimate if the most recent month is incomplete
                monthCount: subcatYearGroup.items.length,
                subcategory: subcatYearGroup.key.subcategory, 
                ...stat
            });
        }
        //now we can use the subcatYearStats to compute the catYearStats. 
        var catYearStats: CatYearStat[] = [];
        var catYearGroups = groupBy(subcatYearStats, g => ({catName: g.subcategory.catName, year: g.year}));
        for (var catYearGroup of catYearGroups){
            var stat = this.getCombinedStat(catYearGroup.items);
            var monthCount = catYearGroup.items[0].monthCount;
            catYearStats.push({
                year: catYearGroup.key.year,
                extrapolatedAmount: stat.sumAmount * 12 / monthCount,
                monthCount: monthCount,
                catName: catYearGroup.key.catName, 
                ...stat
            });
        }
        return {
            catYearStats: catYearStats,
            subcatYearStats: subcatYearStats
        };
    }

    private createMonthStatsContainer(transactions: Transaction[], settings: Settings, filterToRecent: boolean): MonthStatsContainer {
        if (filterToRecent){
            var transactions = this.filterOutNewTransactions(transactions, settings);
        }
        if (!transactions.length) {
            return {
                catMonthStats: [],
                subcatMonthStats: []
            };
        }
        //first compute subcatMonthStats from the transactions
        var subcatMonthStats: SubcatMonthStat[] = [];
        var subcategories = this.categoryService.getSubcategories().filter(z => z.catName != "hidden");
        //by filtering out hidden from subcategories, we've just filtered out those transactions from anything that uses the stat service
        var getMonthsInRange = this.getMonthsInRange(transactions[0].date, transactions[transactions.length - 1].date);
        var monthTrxnGroups = groupBy(transactions, t => getStartOfMonth(t.date).getTime());
        for (var month of getMonthsInRange) {
            var monthTransactions = monthTrxnGroups.find(z => z.key == month.getTime())?.items ?? [];
            for (var subcategory of subcategories) {
                var subcatMonthTransactions = monthTransactions.filter(trxn => trxn.catName == subcategory.catName && trxn.subcatName == subcategory.subcatName);
                var stat = this.getStat(subcatMonthTransactions.map(z => z.amount));
                subcatMonthStats.push({
                    month: month, 
                    subcategory: subcategory,
                    ...stat
                });
            }
        }
        //filter out subcatMonthStats with no transactions
        var subcatsWithZero = groupBy(subcatMonthStats, g => g.subcategory)
            .filter(group => getSum(group.items.map(zz => zz.trxnCount)) == 0)
            .map(group => group.key);
        subcatMonthStats = subcatMonthStats.filter(z => !subcatsWithZero.some(subcatWithZero => areValuesSame(z.subcategory, subcatWithZero)));  

        //use the subcatMonthStats to compute the catMonthStats
        var catMonthStats: CatMonthStat[] = [];
        var catMonthGroups = groupBy(subcatMonthStats, g => ({catName: g.subcategory.catName, month: g.month}));
        for (var group of catMonthGroups){
            var stat = this.getCombinedStat(group.items);
            catMonthStats.push({
                month: group.key.month, 
                catName: group.key.catName, 
                ...stat
            });
        }

        //sort the catMonthStats based on the category's total among just the recent months
        var recentCutoff = new Date(catMonthStats[0].month);
        recentCutoff.setMonth(recentCutoff.getMonth() - settings.recentMonthCount);
        var recentCatMonthStats = catMonthStats.filter(z => z.month >= recentCutoff);
        var recentCatSumAmounts = groupBy(recentCatMonthStats, g => g.catName)
            .map(z => ({catName: z.key, sumAmount: getSum(z.items.map(zz => zz.sumAmount))}));
        //by sorting multiple times, it's similar to LINQ's OrderBy().ThenBy().ThenBy()
        //this is because when the compare function returns 0, it'll keep the relative positions of such items the same
        //The last sort will have the highest priorty, hence my last sort is sorting by month
        //but among categories with the same month, the catMonth whose category has the higher amount will be first (except uncategorized). 
        sortByDesc(catMonthStats, z => recentCatSumAmounts.find(zz => zz.catName == z.catName)!.sumAmount);
        sortByDesc(catMonthStats, z => z.catName == "other" ? -1 : (z.catName == "income" ? -2 : 0)); //the other category should be sorted last
        sortByDesc(catMonthStats, z => z.month.getTime());

        //subcatMonthStats will be sorted very similar to catMonthStats
        //but the subcategories within each category are also sorted from highest to lowest (though category has more precedence)
        var recentSubcatMonthStats = subcatMonthStats.filter(z => z.month >= recentCutoff);
        var recentSubcatSumAmounts = groupBy(recentSubcatMonthStats, g => g.subcategory)
            .map(z => ({subcategory: z.key, sumAmount: getSum(z.items.map(zz => zz.sumAmount))}));
        sortByDesc(subcatMonthStats, z => recentSubcatSumAmounts.find(zz => areValuesSame(z.subcategory, zz.subcategory))!.sumAmount);
        sortByDesc(subcatMonthStats, z => recentCatSumAmounts.find(zz => zz.catName == z.subcategory.catName)!.sumAmount);
        sortByDesc(subcatMonthStats, z => z.subcategory.catName == "other" ? -1 : z.subcategory.catName == "income" ? -2 : 0); //the other category should be sorted last
        sortByDesc(subcatMonthStats, z => z.month.getTime());
        return {
            catMonthStats: catMonthStats,
            subcatMonthStats: subcatMonthStats,
        }
    }


    private filterOutNewTransactions(transactions: Transaction[], settings: Settings): Transaction[] {
        //transactions are already sorted from recent to oldest
        if (!transactions.length) {
            return [];
        }
        if (transactions[0].date.getDate() < settings.requiredDaysForLatestMonth) {
            var tooNewCuttoff = getStartOfMonth(transactions[0].date);
            transactions = transactions.filter(z => z.date.getTime() < tooNewCuttoff.getTime());
        }
        return transactions;
    }

    private getMonthsInRange(newestDate: Date, oldestDate: Date): Date[] {
        var newest = getStartOfMonth(newestDate);
        var oldest = getStartOfMonth(oldestDate);
        var output: Date[] = [];
        var current = newest;
        while (current >= oldest) {
            output.push(current);
            current = new Date(current.getFullYear(), current.getMonth() - 1, 1)
        }
        return output;
    }

    private getStat(trxnAmounts: number[]): Stat {
        if (!trxnAmounts.length) {
            return {
                trxnCount: 0,
                sumAmount: 0
                //sd undefined
            };
        }
        if (!trxnAmounts.length || trxnAmounts.length == 1) {
            return {
                trxnCount: 1,
                sumAmount: trxnAmounts[0],
                //sd undefined
            };
        }
        var trxnCount = trxnAmounts.length
        var sumAmount = getSum(trxnAmounts);
        var sd = getSD(trxnAmounts, sumAmount);
        return { 
            trxnCount,
            sumAmount,
            sd 
        };
    }
    
    private getCombinedStat(stats: Stat[]): Stat {
        var combinedSet = getCombinedSet(stats.map(z => ({n: z.trxnCount, sum: z.sumAmount, sd: z.sd})));
        return { 
            trxnCount: combinedSet.n, 
            sumAmount:  combinedSet.sum, 
            sd: combinedSet.sd
        };
    }
}