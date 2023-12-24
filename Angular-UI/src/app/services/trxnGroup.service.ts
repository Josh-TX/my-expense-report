import { Injectable } from '@angular/core';
import { Settings, SettingsService } from "@services/settings.service";
import { Transaction, TransactionService } from "@services/transaction.service";
import { CategoryInfo } from "@services/category.service";
import { getStartOfMonth, getDistinctBySelectorFunc, groupBySelectorFunc, Stat, getStat, getCombinedStat } from "@services/helpers";


export type TrxnCategoryGroup = Stat & {
    time: number,
    category: string
}

export type TrxnSubcategoryGroup = Stat & {
    time: number,
    category: string,
    subcategory: string
}

@Injectable({
    providedIn: 'root'
})
export class TrxnGroupService {

    private subcategoryGroups: TrxnSubcategoryGroup[] = [];
    private settings: Settings;

    constructor(private transactionsService: TransactionService, private settingsService: SettingsService) {
        this.settings = this.settingsService.getSettings();
        this.updateSubcategoryGroups();
    }

    getCategoryGroups(): TrxnCategoryGroup[]{
        var output: TrxnCategoryGroup[] = [];
        var categoryTimeGroups = groupBySelectorFunc(this.subcategoryGroups, g => ({category: g.category, time: g.time}));
        for (var group of categoryTimeGroups){
            var stat = getCombinedStat(group.items);
            output.push({
                category: group.key.category, 
                time: group.key.time, 
                ...stat
            });
        }
        return this.subcategoryGroups;
    }

    getSubcategoryGroups(): TrxnSubcategoryGroup[]{
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
        var trxnGroups = groupBySelectorFunc(transactions, t => getStartOfMonth(t.trxnDate).getTime());
        for (var month of getMonthsInRange) {
            var monthTransactions = trxnGroups.find(z => z.key == month.getTime())?.items ?? [];
            for (var catInfo of allCatInfos) {
                var subcatMonthTransactions = monthTransactions.filter(z => z.category.toLowerCase() == catInfo.category.toLowerCase() && z.subcategory.toLowerCase() == catInfo.subcategory.toLowerCase())
                var stat = getStat(subcatMonthTransactions.map(z => z.amount));
                this.subcategoryGroups.push({time: month.getTime(), ...catInfo, ...stat});
            }
        }
    }

    private getAllCatInfos(transactions: Transaction[]): CategoryInfo[] {
        var distinctTrxns = getDistinctBySelectorFunc(transactions, z => ({ a: z.category, b: z.subcategory}));
        //do ^that first to greatly reduce quantity of ToLowerCase()
        var distinctTrxns = getDistinctBySelectorFunc(distinctTrxns, z => ({ a: z.category.toLowerCase(), b: z.subcategory.toLowerCase()}));
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

}