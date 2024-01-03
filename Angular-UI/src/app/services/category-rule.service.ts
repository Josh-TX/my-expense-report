import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { Settings, SettingsService } from './settings.service';
import { StorageService } from './storage.service';
import { CategoryService } from './category.service';


export type CategoryRule = {
    catName: string,
    subcatName: string,
    text: string
}

@Injectable({
    providedIn: 'root'
})
export class CategoryRuleService {
    private rules$: WritableSignal<CategoryRule[]>;

    constructor(
        private settingsService: SettingsService,
        private storageService: StorageService,
        private categoryService: CategoryService
    ) {
        this.rules$ = signal([]);
        var data = this.storageService.retrieve("category-rules.json");
        if (data && Array.isArray(data)) {
            data.forEach((z: CategoryRule) => this._addRule(z));
        }
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
        this.categoryService.clearFromCategoryRules();
        this.rules$.set([]);
        this.addRules(rules);
    }

    private _addRule(newRule: CategoryRule){
        var subcategory = this.categoryService.registerCategoryRule(newRule);
        //it's very important that rules are added in such a way that the capitalization is uniform
        //by using subcategory.catName rather than newRule.catName, 
        //it'll use the existing subcategory's catName's capitalization (if there was an existing subcategory)
        this.rules$().push({
            catName: subcategory.catName,
            subcatName: subcategory.subcatName,
            text: newRule.text.toLowerCase()
        });
    }
}
