import { Injectable, Signal, WritableSignal, computed, effect, signal } from '@angular/core';
import { CategoryRule, CategoryRuleService } from './category-rule.service';
import { StorageService } from './storage.service';
import { Settings, SettingsService } from './settings.service';
import { areValuesSame, getStartOfMonth } from './helpers';
import { CategoryService, Subcategory } from './category.service';

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
    private _isSampleData: boolean = false;
    private isSampleData$: Signal<boolean>;
    private storedTransactions$: WritableSignal<StoredTransactionPlusId[]>;
    private storeAttempted: boolean = false;
    private transactionsLoaded$: WritableSignal<boolean>;

    public loaded: Promise<any>;

    constructor(
        private categoryRuleService: CategoryRuleService,
        private categoryService: CategoryService,
        private storageService: StorageService
    ) {
        this.isSampleData$ = computed(() => this.transactionsLoaded$() && this.transactions$() && this._isSampleData)
        this.storedTransactions$ = signal([]);
        this.transactionsLoaded$ = signal(false);
        this.loaded = this.getStoredTrxns().then(storedTransactions => {
            this.transactionsLoaded$.set(true);
            this.updateStoredTransactions(storedTransactions);
        });
        this.transactions$ = computed(() => this.getComputedTrxns(this.storedTransactions$(), this.categoryRuleService.getRules()))
        effect(() => this.setStoredTrxns(this.storedTransactions$()))
    }

    isSampleData(): boolean {
        return this.isSampleData$();
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
                importFrom: filename,
                manualSubcategory: this.getSubcategoryIfValid(z.manualSubcategory)
            }));
        var storedTransactions = [ ...this.storedTransactions$(), ...translatedTrxns ];
        this.updateStoredTransactions(storedTransactions);
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
        this.updateStoredTransactions(remainingStoredTrxns);
    }

    assignManualCats(trxns: Transaction[], subcategory: Subcategory | undefined){
        var storedTrxns = trxns.map(trxn => this.storedTransactions$().find(z => z.tempId == trxn.tempId)!);
        storedTrxns.forEach(z => { z.manualSubcategory = this.getSubcategoryIfValid(subcategory) });
        this.updateStoredTransactions([...this.storedTransactions$()]);
    }

    negateAmounts(trxns: Transaction[]){
        var storedTrxns = trxns.map(trxn => this.storedTransactions$().find(z => z.tempId == trxn.tempId)!);
        storedTrxns.forEach(z => z.amount = -z.amount);
        this.updateStoredTransactions([...this.storedTransactions$()]);
    }

    renameCats(existingCatName: string, newCatName: string){
        var allStoredTrxns = this.storedTransactions$();
        var trxnsToUpdate = allStoredTrxns.filter(z => z.manualSubcategory != null && z.manualSubcategory.catName == existingCatName);
        trxnsToUpdate.forEach(z => z.manualSubcategory!.catName = newCatName);
        this.updateStoredTransactions([...allStoredTrxns]);
    }

    renameSubcats(existingSubcat: Subcategory, newSubcat: Subcategory){
        var allStoredTrxns = this.storedTransactions$();
        var trxnsToUpdate = allStoredTrxns.filter(z => z.manualSubcategory != null && areValuesSame(z.manualSubcategory, existingSubcat));
        trxnsToUpdate.forEach(z => z.manualSubcategory = {...newSubcat});
        this.updateStoredTransactions([...allStoredTrxns]);
    }

    private updateStoredTransactions(storedTrxns: StoredTransactionPlusId[]){
        this.categoryService.clearFromManualCategories(); //this is important because the sample data will initially add categories via manual categories.
        this.storedTransactions$.set(storedTrxns);
    }

    private getSubcategoryIfValid(subcat: Subcategory | undefined): Subcategory | undefined{
        if (subcat && subcat.catName && subcat.subcatName && (subcat.catName != "other" || subcat.subcatName != "uncategorized")){
            return subcat
        }
        return undefined;
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
                    subcategory = this.categoryService.registerManualCategory(storedTrxn.manualSubcategory);
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
                    subcategory = this.categoryService.registerManualCategory(storedTrxn.manualSubcategory);
                    catSource = `manual category`;
                } else {
                    var foundRule = rules.find(rule => lowerName.startsWith(rule.text));
                    foundRule = foundRule || rules.find(rule => lowerName.includes(rule.text));
                    if (foundRule){
                        catSource = `matched rule "${foundRule.text}"`;
                        subcategory = foundRule
                    } else {
                        //subcategory was initially set to uncategorized
                    }
                }
            }
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
        if (!output.length){
            output = this.getSampleTransactions();
            this._isSampleData = true;
        } else {
            this._isSampleData = false;
        }
        output.sort((z1, z2) => z2.date.getTime() - z1.date.getTime());
        return output;
    }

    private getStoredTrxns(): Promise<StoredTransactionPlusId[]> {
        return this.storageService.retrieve("transactions.json").then(data => {
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
        })
        
    }
    private setStoredTrxns(storedTransactions: StoredTransactionPlusId[]){
        if (!this.transactionsLoaded$()){
            return;
        }
        if (this.storeAttempted){ 
            //after the transactions are loaded, the effect will fire,
            //but we don't wanna store what we just loaded. So we ignore the first attempt to store trxns
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
        this.storeAttempted = true;
    }

    
    private getSampleTransactions(): Transaction[]{
        var rent = randAmount(500, 900);
        var income = -(rent + 2000)/2;
        var rules: SampleTransactionRule[] = [
            ["mcdonalds" + randomSuffix(), "food", "fast food", 5, 25, 1,5, null],
            ["Chick-fil-A" + randomSuffix(), "food", "fast food", 10, 30, 1,5, null],
            ["starbucks" + randomSuffix(), "food", "coffee", 4, 8, 3,15, null],
            ["Applebee’s" + randomSuffix(), "food", "restaurant", 15, 40, 0,5, null],
            ["Walmart" + randomSuffix(), "food", "groceries", 50, 200, 2,4, null],
            ["Amazon" + randomSuffix(), "shopping", "online", 10, 100, 0,5, null],
            ["Lowes" + randomSuffix(), "shopping", "hardware", 10, 100, 0,1, null],
            ["Kohls" + randomSuffix(), "shopping", "clothes", 30, 50, 0,1, null],
            ["Electric bill" + randomSuffix(), "utilities", "electricity", 100, 180, 1,1, 1],
            ["Internet bill" + randomSuffix(), "utilities", "internet", 60, 60, 1,1, 5],
            ["Water bill" + randomSuffix(), "utilities", "water", 60, 70, 1,1, 12],
            ["gas bill" + randomSuffix(), "utilities", "gas", 60, 100, 1,1, 20],
            ["shell" + randomSuffix(), "car", "gas", 30, 40, 2,3, null],
            ["goodyear" + randomSuffix(), "car", "maintainence", 30, 60, 0,1, null],
            ["state farm" + randomSuffix(), "car", "insurance", 60, 60, 1,1, null],
            ["Cinemark" + randomSuffix(), "fun", "movie", 15, 30, 0,3, null],
            ["Main Event" + randomSuffix(), "fun", "arcade", 20, 20, 0,2, null],
            ["Golf Club" + randomSuffix(), "fun", "golf", 50, 70, 0,1, null],
            ["American Airlines" + randomSuffix(), "vacation", "travel", 600, 1200, -8, 1, null],
            ["Hotels.com" + randomSuffix(), "vacation", "hotel", 400, 600, -8, 1, null],
            ["Apartment Rent" + randomSuffix(), "housing", "rent", rent, rent, 1, 1, 28],
            ["Handyman" + randomSuffix(), "housing", "maintainence", 100, 200, -3, 1, null],
            ["primary care" + randomSuffix(), "health", "doctor", 30, 100, -5, 1, null],
            ["eye specialist" + randomSuffix(), "health", "doctor", 150, 250, -10, 1, null],
            ["health insurance" + randomSuffix(), "health", "insurance", 100, 100, 1, 1, null],
            ["dental" + randomSuffix(), "health", "dental", 20, 80, -6, 1, null],
            ["PayPal" + randomSuffix(), "other", "misc", 20, 300, -3, 1, null],
            ["Direct Deposit" + randomSuffix(), "income", "income", income, income, 1, 1, 1],
            ["Direct Deposit" + randomSuffix(), "income", "income", income, income, 1, 1, 15],
        ]
        var now = new Date();
        var maxDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        maxDate.setDate(0);
        var minDate = getStartOfMonth(maxDate);
        var trxns: Transaction[] = [];
        for (var i = 0; i < 18; i++){
            for (var rule of rules){
                var trxnCount = Math.max(0, randNum(rule[5], rule[6]));
                var dayOfMonths = new Set<number>();
                for (var j = 0; j < trxnCount; j++){
                    var amount = randAmount(rule[3], rule[4]);
                    var dayOfMonth = rule[7] || randNum(minDate.getDate(), maxDate.getDate());
                    while (dayOfMonths.has(dayOfMonth)){
                        dayOfMonth = randNum(minDate.getDate(), maxDate.getDate());
                    }
                    dayOfMonths.add(dayOfMonth);
                    var subcategory = this.categoryService.registerManualCategory({catName: rule[1], subcatName: rule[2]})
                    trxns.push({
                        date: new Date(minDate.getFullYear(), minDate.getMonth(), dayOfMonth),
                        name: rule[0],
                        amount: amount,
                        catName: subcategory.catName,
                        subcatName: subcategory.subcatName,
                        catSource: "manual category",
                        tempId: -1,
                        importDate: now,
                        importFrom: "sample transaction generator",
                    })
                }
            }
            maxDate = new Date(minDate.getTime())
            maxDate.setDate(0);
            minDate = getStartOfMonth(maxDate);
        }
        trxns = trxns.filter(z => z.date.getTime() < now.getTime());
        return trxns;
    }
}

type SampleTransactionRule = [
    name: string,
    catName: string,
    subcatName: string,
    minAmount: number,
    maxAmount: number,
    minPerMonth: number,
    maxPerMonth: number,
    dayOfMonth: number | null,
]

function randAmount(min: number, max: number): number {
    return Math.floor((Math.random() * (max - min + 1) + min) * 100) / 100;
}

function randNum(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomSuffix(){
    var num = Math.floor(1000000 + Math.random() * 9000000);
    var cities = ["Springfield", "Columbus", "Washington", "Arlington", "Greenville", "Fairview", "Dayton"]
    var states = ["OH", "IL", "IN", "MO", "KY", "TX", "TN", "AR"];
    return ` ${num} ${cities[num % cities.length]} ${states[num % states.length]}`
}