import { Injectable } from '@angular/core';
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
    private rules: CategoryRule[] = [];
    private subcategories: Subcategory[] = [];

    constructor(
        private settingsService: SettingsService,
        private storageService: StorageService

    ) {
        this.reset();
        var data = this.storageService.retrieve("category-rules.json");
        if (data && Array.isArray(data)) {
            data.forEach((z: CategoryRule) => this._addRule(z));
        }
    }

    private _addRule(newRule: CategoryRule){
        var subcategory = this.subcategories.find(z => z.catName.toLowerCase() == newRule.catName.toLowerCase()
            && z.subcatName.toLowerCase() == newRule.subcatName.toLowerCase());
        if (subcategory == null){
            subcategory = {
                catName: newRule.catName,
                subcatName: newRule.subcatName 
            }
            this.subcategories.push(subcategory)
        }
        this.rules.push({
            catName: newRule.catName,
            subcatName: newRule.subcatName,
            text: newRule.text.toLowerCase()
        });
    }

    private reset(){
        this.rules = [];
        this.subcategories = [{catName: "", subcatName: ""}];
    }

    doesRuleTextMatch(trxn: { name: string, amount: number }, ruleText: string): boolean {
        return trxn.name.toLowerCase().includes(ruleText.toLowerCase());
    }

    isDuplicate(ruleText: string): boolean {
        return this.rules.some(z => z.text.toLowerCase() == ruleText.toLowerCase());
    }

    getRules(): CategoryRule[] {
        return [...this.rules];
    }

    addRules(rules: CategoryRule[]) {
        rules.forEach(z => this._addRule(z));
        this.storageService.store("category-rules.json", this.rules);
    }

    replaceRules(rules: CategoryRule[]) {
        this.reset();
        this.addRules(rules);
    }

    getTrxnSubcategory(trxn: { name: string, amount: number }, useIncomeCategory: boolean): Subcategory {
        if (trxn.amount < 0 && useIncomeCategory) {
            return {
                catName: "income",
                subcatName: "income"
            };
        }
        var foundRule = this.rules.find(rule => this.doesRuleTextMatch(trxn, rule.text));
        if (foundRule) {
            return foundRule;
        }
        return {
            catName: "",
            subcatName: ""
        };
    }

    getSubcategories(): Subcategory[] {
        return [...this.subcategories];
    }
}
