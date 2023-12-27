import { Injectable, Signal, WritableSignal, computed, effect, signal } from '@angular/core';
import { CategoryRule, CategoryService, Subcategory } from './category.service';
import { StorageService } from './storage.service';
import { Settings, SettingsService } from './settings.service';

export type Transaction = {
    importDate: Date,
    importFile: string,

    date: Date,
    name: string,
    amount: number,

    catName: string,
    subcatName: string
}

export type TransactionToAdd = {
    date: Date,
    name: string,
    amount: number,
}

type Filter = (trxn: Transaction) => boolean;

@Injectable({
    providedIn: 'root'
})
export class TransactionService {
    private tranasctions$: Signal<Transaction[]>;
    private storedTransactions$: WritableSignal<StoredTransaction[]>;
    constructor(
        private categoryService: CategoryService,
        private storageService: StorageService,
        private settingsService: SettingsService
    ) {
        this.tranasctions$ = computed(() => this.getComputedTrxns(this.storedTransactions$(), this.settingsService.getSettings(), this.categoryService.getRules()))
        var data = this.storageService.retrieve("transactions.json");
        var storedTransactions: StoredTransaction[] = data && Array.isArray(data) ? data : [];
        this.storedTransactions$ = signal(storedTransactions);
        effect(() => this.storageService.store("transactions.json", this.storedTransactions$()))
    }

    addTransactions(trxns: TransactionToAdd[], filename: string) {
        var importDate = new Date();
        var translatedTrxns = trxns.map(z => ({
            name: z.name,
            amount: z.amount,
            date: z.date,
            importDate: importDate,
            importFile: filename
        }));
        var storedTransactions = [ ...this.storedTransactions$(), ...translatedTrxns ]
        this.storedTransactions$.set(storedTransactions);
        this.storageService.store("transactions.json", this.storedTransactions$());
    }

    isDuplicate(date: Date, name: string, amount: number) {
        return this.storedTransactions$().some(z => z.date.getTime() == date.getTime() && z.amount == amount && z.name.toLowerCase() == name.toLowerCase());
    }

    getTransactions(): Transaction[] {
        return this.tranasctions$();
    }


    private getComputedTrxns(storedTransactions: StoredTransaction[], settings: Settings, categoryRules: CategoryRule[]): Transaction[] {
        var output: Transaction[] = [];
        for (var storedTrxn of storedTransactions) {
            var subcategory = this.getTrxnSubcategory(storedTrxn, categoryRules, settings.useIncomeCategory);
            output.push({
                importDate: storedTrxn.importDate,
                importFile: storedTrxn.importFile,
                date: storedTrxn.date,
                name: storedTrxn.name,
                amount: storedTrxn.amount,

                catName: subcategory.catName,
                subcatName: subcategory.subcatName,
            });
        }
        output.sort((z1, z2) => z2.date.getTime() - z1.date.getTime());
        return output;
    }

    private getTrxnSubcategory(trxn: StoredTransaction, categoryRules: CategoryRule[], useIncomeCategory: boolean): Subcategory {
        if (trxn.amount < 0 && useIncomeCategory) {
            return {
                catName: "income",
                subcatName: "income"
            };
        }
        var lower = trxn.name.toLowerCase()
        var foundRule = categoryRules.find(rule => lower.startsWith(rule.text));
        if (foundRule) {
            return foundRule;
        }
        foundRule = categoryRules.find(rule => lower.includes(rule.text));
        if (foundRule) {
            return foundRule;
        }
        return {
            catName: "",
            subcatName: ""
        };
    }


}

type StoredTransaction = {
    date: Date,
    name: string,
    amount: number,
    importDate: Date,
    importFile: string,
}