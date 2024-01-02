import { Injectable, Signal, WritableSignal, computed, effect, signal } from '@angular/core';
import { CategoryRule, CategoryService, Subcategory } from './category.service';
import { StorageService } from './storage.service';
import { Settings, SettingsService } from './settings.service';

export type Transaction = {
    tempId: number,
    importDate: Date,
    importFrom: string,

    date: Date,
    name: string,
    amount: number,

    catName: string,
    subcatName: string
    catSource: string,
}

export type TransactionToAdd = {
    date: Date,
    name: string,
    amount: number,
    manualSubcategory?: Subcategory | undefined
}

type StoredTransaction = {
    date: Date,
    name: string,
    amount: number,
    importDate: Date,
    importFrom: string,

    manualSubcategory: Subcategory | undefined
}

type StoredTransactionPlusId = StoredTransaction & { tempId: number }

@Injectable({
    providedIn: 'root'
})
export class TransactionService {
    private nextTempId: number = 1;
    private transactions$: Signal<Transaction[]>;
    private storedTransactions$: WritableSignal<StoredTransactionPlusId[]>;
    private effectFired: boolean = false;

    constructor(
        private categoryService: CategoryService,
        private storageService: StorageService,
        private settingsService: SettingsService
    ) {
        this.storedTransactions$ = signal(this.getStoredTrxns());
        this.transactions$ = computed(() => this.getComputedTrxns(this.storedTransactions$(), this.categoryService.getRules()))
        effect(() => this.setStoredTrxns(this.storedTransactions$()))
    }

    addTransactions(trxns: TransactionToAdd[], filename: string) {
        var importDate = new Date();
        importDate.setMilliseconds(0); //needed for filters to work on transactions page when copy-pasting
        var translatedTrxns = trxns.map(z => (<StoredTransactionPlusId>{
            tempId: this.nextTempId++,
            name: z.name,
            amount: z.amount,
            date: z.date,
            importDate: importDate,
            importFrom: filename
        }));
        var storedTransactions = [ ...this.storedTransactions$(), ...translatedTrxns ]
        this.storedTransactions$.set(storedTransactions);
    }

    isDuplicate(date: Date, name: string, amount: number) {
        return this.storedTransactions$().some(z => z.date.getTime() == date.getTime() && z.amount == amount && z.name.toLowerCase() == name.toLowerCase());
    }

    getTransactions(): Transaction[] {
        return this.transactions$();
    }

    deleteTrxns(trxns: Transaction[]){
        var trxnIds = trxns.map(z => z.tempId);
        var remainingStoredTrxns = this.storedTransactions$().filter(z => !trxnIds.includes(z.tempId));
        this.storedTransactions$.set(remainingStoredTrxns);
    }

    negateAmounts(trxns: Transaction[]){
        var storedTrxns = trxns.map(trxn => this.storedTransactions$().find(z => z.tempId == trxn.tempId)!);
        storedTrxns.forEach(z => z.amount = -z.amount);
        this.storedTransactions$.set([...this.storedTransactions$()]);
    }

    editSubcategories(trxns: Transaction[], subcategory: Subcategory){
        var storedTrxns = trxns.map(trxn => this.storedTransactions$().find(z => z.tempId == trxn.tempId)!);
        storedTrxns.forEach(z => z.manualSubcategory = subcategory);
        this.storedTransactions$.set([...this.storedTransactions$()]);
    }

    private getComputedTrxns(storedTransactions: StoredTransactionPlusId[], rules: CategoryRule[]): Transaction[] {
        var output: Transaction[] = [];

        for (var storedTrxn of storedTransactions) {
            var lowerName = storedTrxn.name.toLowerCase()
            var catSource = "";
            var subcategory: Subcategory = {
                catName: "other",
                subcatName: "uncategorized"
            };
            if (storedTrxn.amount < 0) {
                var allowedNegativeCatNames = ["hidden", "income"]
                if (storedTrxn.manualSubcategory != null && allowedNegativeCatNames.includes(storedTrxn.manualSubcategory.catName)){
                    subcategory = storedTrxn.manualSubcategory;
                    catSource = `manual category`;
                } else {
                    var eligibleRules = rules.filter(z => allowedNegativeCatNames.includes(z.catName));
                    var foundRule = eligibleRules.find(rule => lowerName.startsWith(rule.text));
                    foundRule = foundRule || eligibleRules.find(rule => lowerName.includes(rule.text));
                    if (foundRule){
                        catSource = `matched rule "${foundRule.text}"`;
                        subcategory = foundRule
                    } else {
                        catSource = `automatic because negative amount`;
                        subcategory = {
                            catName: "income",
                            subcatName: "income"
                        };
                    }
                }
            } else {
                if (storedTrxn.manualSubcategory != null){
                    subcategory = storedTrxn.manualSubcategory;
                    catSource = `manual category`;
                } else {
                    var foundRule = rules.find(rule => lowerName.startsWith(rule.text));
                    if (foundRule){
                        catSource = `matched rule "${foundRule.text}"`;
                        subcategory = foundRule
                    } else {
                        //subcategory was initially set to uncategorized
                    }
                }
            }
            var subcategory = this.categoryService.getSubcategoryForTrxn(storedTrxn);
            output.push({
                tempId: storedTrxn.tempId,
                importDate: storedTrxn.importDate,
                importFrom: storedTrxn.importFrom,
                date: storedTrxn.date,
                name: storedTrxn.name,
                amount: storedTrxn.amount,

                catName: subcategory.catName,
                subcatName: subcategory.subcatName,
                catSource: catSource
            });
        }
        output.sort((z1, z2) => z2.date.getTime() - z1.date.getTime());
        return output;
    }

    private getStoredTrxns(): StoredTransactionPlusId[] {
        var data = this.storageService.retrieve("transactions.json");
        var storedTransactions: StoredTransaction[] = data && Array.isArray(data) ? data : [];
        storedTransactions.forEach(z => {
            //this shouldn't ever happen because the storageService will convert the date strings to date objects
            //but it only looks for certain string formats. If it fails, the app is completely borked, so to be safe check again
            if (!(z.date instanceof Date)){
                z.date = new Date(<any>z.date)
            }
            if (!(z.importDate instanceof Date)){
                z.importDate = new Date(<any>z.importDate)
            }
        })
        return storedTransactions.map(z => ({...z, tempId: this.nextTempId++}))
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
                importFrom: z.importFrom,
                manualSubcategory: z.manualSubcategory
            }))
            this.storageService.store("transactions.json", trxnsWithoutId)
        } 
        this.effectFired = true;
    }
}