import { Injectable } from '@angular/core';
import { Settings, SettingsService } from "@services/settings.service";
import { Transaction, TransactionService } from "@services/transaction.service";
import { CategoryInfo } from "@services/category.service";
import * as helpers from "@services/helpers";


export type CategoryGroup = GroupStats & {
    time: number,
    category: string
}

export type SubcategoryGroup = GroupStats & {
    time: number,
    category: string,
    subcategory: string
}

export type GroupStats = {
    n: number,
    sum: number,
    mean: number,
    sd?: number | undefined
}

@Injectable({
    providedIn: 'root'
})
export class GroupService {

    private subcategoryGroups: SubcategoryGroup[] = [];
    private settings: Settings;

    constructor(private transactionsService: TransactionService, private settingsService: SettingsService) {
        this.settings = this.settingsService.getSettings();
        this.updateSubcategoryGroups();
    }

    getCategoryGroups(): CategoryGroup[]{
        var output: CategoryGroup[] = [];
        var categoryTimeGroups = helpers.groupBySelectorFunc(this.subcategoryGroups, g => ({category: g.category, time: g.time}));
        for (var group of categoryTimeGroups){
            var stats = this.combineGroupStats(group.items);
            output.push({
                category: group.key.category, 
                time: group.key.time, 
                ...stats
            });
        }
        return this.subcategoryGroups;
    }

    getSubcategoryGroups(): SubcategoryGroup[]{
        return this.subcategoryGroups;
    }

    private updateSubcategoryGroups() {
        this.subcategoryGroups = [];
        var transactions = this.transactionsService.getTransactions();
        var transactions = this.filterOutNewTransactions(transactions);
        if (!transactions) {
            return;
        }
        var allCatInfos = this.getAllCatInfos(transactions);
        var getMonthsInRange = this.getMonthsInRange(transactions[0].trxnDate, transactions[transactions.length - 1].trxnDate);
        var trxnGroups = helpers.groupBySelectorFunc(transactions, t => helpers.getStartOfMonth(t.trxnDate).getTime());
        for (var month of getMonthsInRange) {
            var monthTransactions = trxnGroups.find(z => z.key == month.getTime())?.items ?? [];
            for (var catInfo of allCatInfos) {
                var subcatMonthTransactions = monthTransactions.filter(z => z.category.toLowerCase() == catInfo.category.toLowerCase() && z.subcategory.toLowerCase() == catInfo.subcategory.toLowerCase())
                var groupStats = this.getGroupStats(subcatMonthTransactions.map(z => z.amount));
                this.subcategoryGroups.push({time: month.getTime(), ...catInfo, ...groupStats});
            }
        }
    }

    private combineGroupStats(stats: GroupStats[]): GroupStats {
        stats = stats.filter(z => z.n > 0);
        if (!stats.length){
            return {
                n: 0,
                mean: 0,
                sum: 0
                //sd undefined
            };
        }
        if (stats.length == 1){
            return stats[0];
        }
        var n = helpers.sum(stats.map(z => z.n));
        var sum = helpers.sum(stats.map(z => z.sum));
        var mean = sum/n;
        var weightedSumOfVariance = helpers.sum(stats.map(z => z.sd == null ? 0 : z.n * z.sd * z.sd));
        var sumSquaredDeviation = helpers.sum(stats.map(z => z.n * Math.pow(z.mean - mean, 2)));
        var sd = Math.sqrt((weightedSumOfVariance + sumSquaredDeviation) / n);
        return { 
            n, 
            sum: sum,
            mean: helpers.roundToCent(mean), 
            sd 
        };
    }

    private getGroupStats(amounts: number[]): GroupStats {
        if (!amounts.length) {
            return {
                n: 0,
                mean: 0,
                sum: 0
                //sd undefined
            };
        }
        if (!amounts.length || amounts.length == 1) {
            return {
                n: 1,
                mean: amounts[0],
                sum: amounts[0],
                //sd undefined
            };
        }
        var n = amounts.length
        var sum = helpers.sum(amounts);
        var mean = sum / n
        var sd = Math.sqrt(amounts.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
        return { 
            n, 
            sum: sum,
            mean: helpers.roundToCent(mean), 
            sd 
        };
    }

    private getAllCatInfos(transactions: Transaction[]): CategoryInfo[] {
        var distinctTrxns = helpers.distinctByEqualityFunc(transactions, (t1, t2) => t1.category == t2.category && t1.subcategory == t2.subcategory);
        //do ^that first to greatly reduce quantity of ToLowerCase()
        var distinctTrxns = helpers.distinctByEqualityFunc(distinctTrxns, (t1, t2) => t1.category.toLowerCase() == t2.category.toLowerCase() && t1.subcategory.toLowerCase() == t2.subcategory.toLowerCase());
        return distinctTrxns.map(z => ({
            category: z.category,
            subcategory: z.subcategory
        }));
    }

    private filterOutNewTransactions(transactions: Transaction[]): Transaction[] {
        //transactions are already sorted from recent to oldest
        if (!transactions.length) {
            return [];
        }
        if (transactions[0].trxnDate.getDate() < this.settings.requiredDaysForLatestMonth) {
            var tooNewcutoff = new Date(transactions[0].trxnDate.getTime());
            //set cutoff to the 12am on the 1st of the month 
            tooNewcutoff.setHours(0, 0, 0, 0)
            tooNewcutoff.setDate(1);
            transactions = transactions.filter(z => z.trxnDate.getTime() < tooNewcutoff.getTime());
        }
        return transactions;
    }

    private getMonthsInRange(newestDate: Date, oldestDate: Date): Date[] {
        var newest = helpers.getStartOfMonth(newestDate);
        var oldest = helpers.getStartOfMonth(oldestDate);
        var output: Date[] = [];
        var current = newest;
        while (current >= oldest) {
            output.push(current);
            current = new Date(current.getFullYear(), current.getMonth() - 1, 1)
        }
        return output;
    }

}