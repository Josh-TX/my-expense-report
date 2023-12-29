import { Injectable, Signal, WritableSignal, computed, effect, signal } from '@angular/core';
import { CategoryRule, CategoryService, Subcategory } from './category.service';
import { StorageService } from './storage.service';
import { Settings, SettingsService } from './settings.service';

export type Transaction = {
    id: number,
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

type StoredTransaction = {
    date: Date,
    name: string,
    amount: number,
    importDate: Date,
    importFile: string,

    subcategory?: Subcategory | undefined
}

type StoredTransactionPlusId = StoredTransaction & { id: number }

@Injectable({
    providedIn: 'root'
})
export class TransactionService {
    private id: number = 1;
    private tranasctions$: Signal<Transaction[]>;
    private storedTransactions$: WritableSignal<StoredTransactionPlusId[]>;
    private effectFired: boolean = false;

    constructor(
        private categoryService: CategoryService,
        private storageService: StorageService,
        private settingsService: SettingsService
    ) {
        this.tranasctions$ = computed(() => this.getComputedTrxns(this.storedTransactions$(), this.settingsService.getSettings(), this.categoryService.getRules()))
        this.storedTransactions$ = signal(this.getStoredTrxns());
        effect(() => this.setStoredTrxns(this.storedTransactions$()))
    }

    addTransactions(trxns: TransactionToAdd[], filename: string) {
        var importDate = new Date();
        importDate.setMilliseconds(0);//needed for filters to work on transactions page
        var translatedTrxns = trxns.map(z => (<StoredTransactionPlusId>{
            id: this.id++,
            name: z.name,
            amount: z.amount,
            date: z.date,
            importDate: importDate,
            importFile: filename
        }));
        var storedTransactions = [ ...this.storedTransactions$(), ...translatedTrxns ]
        this.storedTransactions$.set(storedTransactions);
    }

    isDuplicate(date: Date, name: string, amount: number) {
        return this.storedTransactions$().some(z => z.date.getTime() == date.getTime() && z.amount == amount && z.name.toLowerCase() == name.toLowerCase());
    }

    getTransactions(): Transaction[] {
        return this.tranasctions$();
    }

    deleteTrxns(trxns: Transaction[]){
        var trxnIds = trxns.map(z => z.id);
        var remainingStoredTrxns = this.storedTransactions$().filter(z => !trxnIds.includes(z.id));
        this.storedTransactions$.set(remainingStoredTrxns);
    }

    negateAmounts(trxns: Transaction[]){
        var storedTrxns = trxns.map(trxn => this.storedTransactions$().find(z => z.id == trxn.id)!);
        storedTrxns.forEach(z => z.amount = -z.amount);
        this.storedTransactions$.set([...this.storedTransactions$()]);
    }

    editSubcategories(trxns: Transaction[], subcategory: Subcategory){
        var storedTrxns = trxns.map(trxn => this.storedTransactions$().find(z => z.id == trxn.id)!);
        storedTrxns.forEach(z => z.subcategory = subcategory);
        this.storedTransactions$.set([...this.storedTransactions$()]);
    }

    private getComputedTrxns(storedTransactions: StoredTransactionPlusId[], settings: Settings, categoryRules: CategoryRule[]): Transaction[] {
        var output: Transaction[] = [];
        for (var storedTrxn of storedTransactions) {
            var subcategory = this.getTrxnSubcategory(storedTrxn, categoryRules, settings.useIncomeCategory);
            output.push({
                id: storedTrxn.id,
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
        if (trxn.subcategory != null){
            return trxn.subcategory;
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

    private getStoredTrxns(): StoredTransactionPlusId[] {
        var data = this.storageService.retrieve("transactions.json");
        var storedTransactions: StoredTransaction[] = data && Array.isArray(data) ? data : [];
        return storedTransactions.map(z => ({...z, id: this.id++}))
    }
    private setStoredTrxns(storedTransactions: StoredTransactionPlusId[]){
        if (this.effectFired){ 
            //the effect will fire once just when the signal is initialized
            //we only need to store on subsequent signal calls. Not important for browser only
            var trxnsWithoutId: StoredTransaction[] = storedTransactions.map(z => ({
                date: z.date,
                amount: z.amount,
                name: z.name,
                importDate: z.importDate,
                importFile: z.importFile,
                subcategory: z.subcategory
            }))
            this.storageService.store("transactions.json", trxnsWithoutId)
        } 
        this.effectFired = true;
    }
}