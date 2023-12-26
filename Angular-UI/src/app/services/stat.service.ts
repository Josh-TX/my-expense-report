import { Injectable } from '@angular/core';
import { SettingsService } from "@services/settings.service";
import { Transaction, TransactionService } from "@services/transaction.service";
import { CategoryService, Subcategory } from "@services/category.service";
import { getStartOfMonth, getDistinctBySelectorFunc, groupBySelectorFunc, getSum, sortBy, sortByDesc, areValuesSame, roundToCent, getSD, getCombinedSet } from "@services/helpers";

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

@Injectable({
    providedIn: 'root'
})
export class StatService {
    private catMonthStats: CatMonthStat[] = [];
    private subcatMonthStats: SubcatMonthStat[] = [];
    private recentCutoff: Date = new Date();

    constructor(
        private transactionsService: TransactionService, 
        private categoryService: CategoryService, 
        private settingsService: SettingsService
        ) {
        this.update();
    }

    getCurrentMonth(): Date | undefined {
        if (this.catMonthStats.length){
            return this.catMonthStats[0].month;
        }
        return undefined;
    }

    getRecentCutoff(): Date {
        return new Date(this.recentCutoff.getTime());
    }

    getCatMonthStats(): CatMonthStat[]{
        return this.catMonthStats;
    }
    getSubcatMonthStats(): SubcatMonthStat[]{
        return this.subcatMonthStats;
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
        var catMonthStatsInRange = this.catMonthStats.filter(z => z.month.getTime() <= recentDate.getTime());
        var oldCutoff = oldestDate != null ? oldestDate : recentDate;
        catMonthStatsInRange = catMonthStatsInRange.filter(z => z.month.getTime() >= oldCutoff.getTime());
        var catGroups = groupBySelectorFunc(catMonthStatsInRange, z => z.catName);
        var output = catGroups.map(g => ({
            catName: g.key,
            monthCount: g.items.length,
            monthSD: getSD(g.items.map(z => z.sumAmount)),
            ...this.getCombinedStat(g.items)
        }))
        return output;
    }

    getSubcatStats(recentDate: Date, oldestDate?: Date | undefined): SubcatStat[] {
        var subcatMonthStatsInRange = this.subcatMonthStats.filter(z => z.month.getTime() <= recentDate.getTime());
        var oldCutoff = oldestDate != null ? oldestDate : recentDate;
        subcatMonthStatsInRange = subcatMonthStatsInRange.filter(z => z.month.getTime() >= oldCutoff.getTime());
        var subcatGroups = groupBySelectorFunc(subcatMonthStatsInRange, z => z.subcategory);
        return subcatGroups.map(g => ({
            subcategory: g.key,
            monthCount: g.items.length,
            monthSD: getSD(g.items.map(z => z.sumAmount)),
            ...this.getCombinedStat(g.items)
        }));
    }



    private update() {
        this.subcatMonthStats = [];
        var transactions = this.transactionsService.getTransactions();
        var transactions = this.filterOutNewTransactions(transactions);
        if (!transactions.length) {
            return;
        }
        var subcategories = this.categoryService.getSubcategories();
        var getMonthsInRange = this.getMonthsInRange(transactions[0].trxnDate, transactions[transactions.length - 1].trxnDate);
        var monthTrxnGroups = groupBySelectorFunc(transactions, t => getStartOfMonth(t.trxnDate).getTime());
        for (var month of getMonthsInRange) {
            var monthTransactions = monthTrxnGroups.find(z => z.key == month.getTime())?.items ?? [];
            for (var subcategory of subcategories) {
                var subcatMonthTransactions = monthTransactions.filter(trxn => trxn.catName == subcategory.catName && trxn.subcatName == subcategory.subcatName);
                var stat = this.getStat(subcatMonthTransactions.map(z => z.amount));
                this.subcatMonthStats.push({
                    month: month, 
                    subcategory: subcategory,
                    ...stat
                });
            }
        }
        this.catMonthStats = [];
        var catMonthGroups = groupBySelectorFunc(this.subcatMonthStats, g => ({catName: g.subcategory.catName, month: g.month}));
        for (var group of catMonthGroups){
            var stat = this.getCombinedStat(group.items);
            this.catMonthStats.push({
                month: group.key.month, 
                catName: group.key.catName, 
                ...stat
            });
        }

        this.recentCutoff = new Date(this.catMonthStats[0].month);
        this.recentCutoff.setMonth(this.recentCutoff .getMonth() - this.settingsService.getSettings().recentMonthCount);
        var recentCatMonthStats = this.catMonthStats.filter(z => z.month >= this.recentCutoff);
        var recentCatSums = groupBySelectorFunc(recentCatMonthStats, g => g.catName)
            .map(z => ({catName: z.key, sumAmount: getSum(z.items.map(zz => zz.sumAmount))}));
        var recentSubcatMonthStats = this.subcatMonthStats.filter(z => z.month >= this.recentCutoff);
        var recentSubcatSums = groupBySelectorFunc(recentSubcatMonthStats, g => g.subcategory)
            .map(z => ({subcategory: z.key, sumAmount: getSum(z.items.map(zz => zz.sumAmount))}));

        sortByDesc(this.catMonthStats, z => recentCatSums.find(zz => zz.catName == z.catName)!.sumAmount);
        sortByDesc(this.catMonthStats, z => z.catName == "" ? -1 : 0);
        sortByDesc(this.catMonthStats, z => z.month.getTime());

        sortByDesc(this.subcatMonthStats, z => recentSubcatSums.find(zz => areValuesSame(z.subcategory, zz.subcategory))!.sumAmount);
        sortByDesc(this.subcatMonthStats, z => recentCatSums.find(zz => zz.catName == z.subcategory.catName)!.sumAmount);
        sortByDesc(this.catMonthStats, z => z.catName == "" ? -1 : 0);
        sortByDesc(this.subcatMonthStats, z => z.month.getTime());
    }

    private filterOutNewTransactions(transactions: Transaction[]): Transaction[] {
        //transactions are already sorted from recent to oldest
        if (!transactions.length) {
            return [];
        }
        if (transactions[0].trxnDate.getDate() < this.settingsService.getSettings().requiredDaysForLatestMonth) {
            var tooNewCuttoff = getStartOfMonth(transactions[0].trxnDate);
            transactions = transactions.filter(z => z.trxnDate.getTime() < tooNewCuttoff.getTime());
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