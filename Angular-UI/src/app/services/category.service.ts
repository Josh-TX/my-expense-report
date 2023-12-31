import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { Settings, SettingsService } from './settings.service';
import { Transaction } from './transaction.service';
import { StorageService } from './storage.service';


export type Subcategory = {
    catName: string,
    subcatName: string
}

export type CategoryRule = {
    catName: string,
    subcatName: string,
    text: string
}

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private rules$: WritableSignal<CategoryRule[]>;
    private subcategories$: WritableSignal<Subcategory[]>;

    constructor(
        private settingsService: SettingsService,
        private storageService: StorageService

    ) {
        this.rules$ = signal([]);
        this.subcategories$ = signal([]);
        this.reset();
        var data = this.storageService.retrieve("category-rules.json");
        if (data && Array.isArray(data)) {
            data.forEach((z: CategoryRule) => this._addRule(z));
        }
    }

    getSubcategoryForTrxn(trxn: { name: string, amount: number, subcategory?: Subcategory | undefined }): Subcategory {
        var lowerName = trxn.name.toLowerCase()
        if (trxn.amount < 0) {
            var allowedCatNames = ["hidden", "income"]
            if (trxn.subcategory != null && allowedCatNames.includes(trxn.subcategory.catName)){
                return trxn.subcategory;
            }
            var eligibleRules = this.rules$().filter(z => allowedCatNames.includes(z.catName));
            var foundRule = eligibleRules.find(rule => lowerName.startsWith(rule.text));
            foundRule = foundRule || eligibleRules.find(rule => lowerName.includes(rule.text));
            return foundRule || {
                catName: "income",
                subcatName: "income"
            };
        }
        if (trxn.subcategory != null){
            return trxn.subcategory;
        }
        var rules = this.rules$();
        var foundRule = rules.find(rule => lowerName.startsWith(rule.text));
        foundRule = foundRule || rules.find(rule => lowerName.includes(rule.text));
        return foundRule || {
            catName: "other",
            subcatName: "uncategorized"
        };
    }

    doesRuleTextMatch(trxn: { name: string, amount: number }, ruleText: string): boolean {
        return trxn.name.toLowerCase().includes(ruleText.toLowerCase());
    }

    isDuplicate(ruleText: string): boolean {
        return this.rules$().some(z => z.text.toLowerCase() == ruleText.toLowerCase());
    }

    getRules(): CategoryRule[] {
        return this.rules$();
    }

    addRules(rules: CategoryRule[]) {
        rules.forEach(z => this._addRule(z));
        this.rules$.set([...this.rules$()]);
        this.storageService.store("category-rules.json", this.rules$());
    }

    replaceRules(rules: CategoryRule[]) {
        this.reset();
        this.addRules(rules);
    }

    getSubcategories(): Subcategory[] {
        return this.subcategories$()
    }

    isUncategorized(subcategory: Subcategory): boolean{
        return subcategory.catName == "other" && subcategory.subcatName == "uncategorized"
    }

    private _addRule(newRule: CategoryRule){
        var subcategory = this.subcategories$().find(z => z.catName.toLowerCase() == newRule.catName.toLowerCase()
            && z.subcatName.toLowerCase() == newRule.subcatName.toLowerCase());
        if (subcategory == null){
            subcategory = {
                catName: newRule.catName,
                subcatName: newRule.subcatName 
            }
            this.subcategories$().push(subcategory)
        }
        //it's very important that rules are added in such a way that the capitalization is uniform
        //by using subcategory.catName rather than newRule.catName, 
        //it'll use the existing subcategory's catName's capitalization (if there was an existing subcategory)
        this.rules$().push({
            catName: subcategory.catName,
            subcatName: subcategory.subcatName,
            text: newRule.text.toLowerCase()
        });
    }

    private reset(){
        this.rules$.set([]);
        var defaultSubcategories = [
            {catName: "other", subcatName: "uncategorized"},
            {catName: "income", subcatName: "income"},
            {catName: "hidden", subcatName: "hidden"},
        ];
        this.subcategories$.set(defaultSubcategories);
    }
}
