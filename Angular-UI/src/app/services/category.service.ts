import { Injectable } from '@angular/core';
import { Settings, SettingsService } from './settings.service';
import { Transaction } from './transaction.service';
import { StorageService } from './storage.service';

export type CategoryInfo = {
    category: string,
    subcategory: string
}

export type CategoryMetrics = {
    name: string,
    subcategories: SubcategoryMetrics[]
    totalAmount: number,
    recentAmount: number,
    totalTrxnCount: number,
    recentTrxnCount: number
}

export type SubcategoryMetrics = {
    name: string,
    totalAmount: number,
    recentAmount: number,
    totalTrxnCount: number,
    recentTrxnCount: number
}

export type CategoryRule = {
    category: string,
    subcategory: string,
    text: string
}

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    rules: CategoryRule[] = [];
    allInfos: CategoryInfo[] = [];
    constructor(
        private settingsService: SettingsService,
        private storageService: StorageService

    ) {
        var data = this.storageService.retrieve("category-rules.json");
        if (data && Array.isArray(data)) {
            this.rules = data;
        }
        this.updateAllInfos()
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
        this.rules.push(...rules);
        this.updateAllInfos();
        this.storageService.store("category-rules.json", this.rules);
    }

    replaceRules(rules: CategoryRule[]) {
        this.rules = rules;
        this.updateAllInfos();
        this.storageService.store("category-rules.json", this.rules);
    }

    private updateAllInfos() {
        this.allInfos = [];
        for (var rule of this.rules) {
            if (!this.allInfos.some(info => info.category.toLowerCase() == rule.category.toLowerCase() && info.subcategory.toLowerCase() == rule.subcategory.toLowerCase())) {
                this.allInfos.push({
                    category: rule.category,
                    subcategory: rule.subcategory
                });
            }
        }
    }

    getTrxnCategoryInfo(trxn: { name: string, amount: number }, useIncomeCategory: boolean): CategoryInfo {
        if (trxn.amount < 0 && useIncomeCategory) {
            return {
                category: "income",
                subcategory: ""
            };
        }
        var foundRule = this.rules.find(rule => this.doesRuleTextMatch(trxn, rule.text));
        if (foundRule) {
            return foundRule;
        }
        return {
            category: "",
            subcategory: ""
        };
    }

    getAllCategoryInfos() {
        return [...this.allInfos];
    }
}
