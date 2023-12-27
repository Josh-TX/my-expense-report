import { Injectable, Signal, WritableSignal, computed, signal } from '@angular/core';
import { Settings, SettingsService } from "@services/settings.service";
import { Transaction, TransactionService } from "@services/transaction.service";
import { CategoryService, Subcategory } from "@services/category.service";
import { getStartOfMonth, getDistinctBySelectorFunc, groupBy, getSum, sortBy, sortByDesc, areValuesSame, roundToCent, getSD, getCombinedSet } from "@services/helpers";

export type Stat = {
    trxnCount: number,
    sumAmount: number,
    sd?: number | undefined
}

export type TotalStat = Stat & {
    monthCount: number,
    monthSD?: number | undefined
}

export type CatStat = Stat & {
    catName: string,
    monthCount: number,
    monthSD: number | undefined
}

export type SubcatStat = Stat & {
    subcategory: Subcategory,
    monthCount: number,
    monthSD: number | undefined
}

export type CatMonthStat = Stat & {
    month: Date,
    catName: string
}

export type SubcatMonthStat = Stat & {
    month: Date,
    subcategory: Subcategory
}

type VariousStatsContainer = {
    subcatMonthStats: SubcatMonthStat[],
    catMonthStats: CatMonthStat[]
}

@Injectable({
    providedIn: 'root'
})
export class StatService {

    private catMonthStats$: Signal<CatMonthStat[]>;
    private subcatMonthStats$: Signal<SubcatMonthStat[]>;

    constructor(
        private transactionsService: TransactionService, 
        private categoryService: CategoryService, 
        private settingsService: SettingsService
        ) {
        this.catMonthStats$ = signal([]);
        this.subcatMonthStats$ = signal([]);
        var variousStatsContainer$ = computed(() => this.updateVariousStatsContainer(this.transactionsService.getTransactions(), this.settingsService.getSettings()));
        this.catMonthStats$ = computed(() => variousStatsContainer$().catMonthStats);
        this.subcatMonthStats$ = computed(() => variousStatsContainer$().subcatMonthStats);
    }

    getCurrentMonth(): Date | undefined {
        if (this.catMonthStats$().length){
            return this.catMonthStats$()[0].month;
        }
        return undefined;
    }

    getRecentCutoff(): Date | undefined{
        if (this.catMonthStats$().length){
            var recentCutoff = new Date(this.catMonthStats$()[0].month);
            recentCutoff.setMonth(recentCutoff.getMonth() - this.settingsService.getSettings().recentMonthCount);
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

    getRecentTotalStat(): TotalStat {
        var currentMonth = this.getCurrentMonth();
        if (!currentMonth){
            return {
                monthCount: 0,
                trxnCount: 0,
                sumAmount: 0
            };
        }
        return this.getTotalStat(currentMonth, this.getRecentCutoff());
    }

    getTotalStat(recentDate: Date, oldestDate?: Date | undefined): TotalStat {
        var catStats = this.getCatStats(recentDate, oldestDate);
        var combinedStat = this.getCombinedStat(catStats);
        var monthlyCombinedSet = getCombinedSet(catStats.map(z => ({n: z.monthCount, sum: z.sumAmount, sd: z.monthSD})));
        return {
            monthCount: catStats.length ? catStats[0].monthCount : 0,
            monthSD: monthlyCombinedSet.sd,
            ...combinedStat
        };
    }

    getRecentCatStats(): CatStat[] {
        var currentMonth = this.getCurrentMonth();
        if (!currentMonth){
            return [];
        }
        return this.getCatStats(currentMonth, this.getRecentCutoff());
    }

    getRecentSubcatStats(): SubcatStat[] {
        var currentMonth = this.getCurrentMonth();
        if (!currentMonth){
            return [];
        }
        return this.getSubcatStats(currentMonth, this.getRecentCutoff());
    }

    getCatStats(recentDate: Date, oldestDate?: Date | undefined): CatStat[] {
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

    getSubcatStats(recentDate: Date, oldestDate?: Date | undefined): SubcatStat[] {
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

    private updateVariousStatsContainer(transactions: Transaction[], settings: Settings): VariousStatsContainer {
        var transactions = this.filterOutNewTransactions(transactions);
        if (!transactions.length) {
            return {
                catMonthStats: [],
                subcatMonthStats: []
            };
        }
        //first compute subcatMonthStats from the transactions
        var subcatMonthStats = [];
        var subcategories = this.categoryService.getSubcategories();
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
        //use the subcatMonthStats to compute the catMonthStats
        var catMonthStats = [];
        var catMonthGroups = groupBy(subcatMonthStats, g => ({catName: g.subcategory.catName, month: g.month}));
        for (var group of catMonthGroups){
            var stat = this.getCombinedStat(group.items);
            catMonthStats.push({
                month: group.key.month, 
                catName: group.key.catName, 
                ...stat
            });
        }
        //filter out catMonthStats & subcatMonthStats when the category has $0 total (considering all months)
        //this is mostly for possibly filtering out the income category or the uncategorized category
        var catNamesWithZero = groupBy(catMonthStats, g => g.catName)
            .filter(group => getSum(group.items.map(zz => zz.sumAmount)) == 0)
            .map(group => group.key);
        catMonthStats = catMonthStats.filter(z => !catNamesWithZero.includes(z.catName));
        subcatMonthStats = subcatMonthStats.filter(z => !catNamesWithZero.includes(z.subcategory.catName));

        //sort the catMonthStats based on the category's total among just the recent months
        var recentCutoff = new Date(catMonthStats[0].month);
        recentCutoff.setMonth(recentCutoff.getMonth() - settings.recentMonthCount);
        var recentCatMonthStats = catMonthStats.filter(z => z.month >= recentCutoff);
        var recentCatSumAmounts = groupBy(recentCatMonthStats, g => g.catName)
            .map(z => ({catName: z.key, sumAmount: getSum(z.items.map(zz => zz.sumAmount))}));
        //by sorting multiple times, it's similar to LINQ's OrderBy().ThenBy().ThenBy()
        //this is because when the compare function returns 0, it'll keep the relative positions of such items the same
        //The last sort will have the highest priorty, meaning it'll be sorted by month.
        //but among categories with the same month, the catMonth whose category has the higher amount will be first (except uncategorized). 
        sortByDesc(catMonthStats, z => recentCatSumAmounts.find(zz => zz.catName == z.catName)!.sumAmount);
        sortByDesc(catMonthStats, z => z.catName == "" ? -1 : 0);
        sortByDesc(catMonthStats, z => z.month.getTime());

        //subcatMonthStats will be sorted very similar to catMonthStats
        //but the subcategories within each category are also sorted from highest to lowest (though category has more precedence)
        var recentSubcatMonthStats = subcatMonthStats.filter(z => z.month >= recentCutoff);
        var recentSubcatSumAmounts = groupBy(recentSubcatMonthStats, g => g.subcategory)
            .map(z => ({subcategory: z.key, sumAmount: getSum(z.items.map(zz => zz.sumAmount))}));

        sortByDesc(subcatMonthStats, z => recentSubcatSumAmounts.find(zz => areValuesSame(z.subcategory, zz.subcategory))!.sumAmount);
        sortByDesc(subcatMonthStats, z => recentCatSumAmounts.find(zz => zz.catName == z.subcategory.catName)!.sumAmount);
        sortByDesc(subcatMonthStats, z => z.subcategory.catName == "" ? -1 : 0);
        sortByDesc(subcatMonthStats, z => z.month.getTime());

        return {
            catMonthStats: catMonthStats,
            subcatMonthStats: subcatMonthStats,
        }
    }


    private filterOutNewTransactions(transactions: Transaction[]): Transaction[] {
        //transactions are already sorted from recent to oldest
        if (!transactions.length) {
            return [];
        }
        if (transactions[0].date.getDate() < this.settingsService.getSettings().requiredDaysForLatestMonth) {
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