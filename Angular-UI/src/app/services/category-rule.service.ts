import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { Settings, SettingsService } from './settings.service';
import { StorageService } from './storage.service';
import { CategoryService, Subcategory } from './category.service';


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

    public loaded: Promise<any>;

    constructor(
        private settingsService: SettingsService,
        private storageService: StorageService,
        private categoryService: CategoryService
    ) {
        this.rules$ = signal([]);
        this.loaded = this.storageService.retrieve("category-rules.json").then(data => {
            if (data && Array.isArray(data)) {
                data.forEach((z: CategoryRule) => this._addRule(z));
            }
        });
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

    addRules(rules: CategoryRule[]): Promise<any> {
        rules.forEach(z => this._addRule(z));
        this.rules$.set([...this.rules$()]);
        return this.storageService.store("category-rules.json", this.rules$());
    }

    replaceRules(rules: CategoryRule[]): Promise<any> {
        this.categoryService.clearFromCategoryRules();
        this.rules$.set([]);
        return this.addRules(rules);
    }

    renameCats(exisingCatname: string, newCatName: string): Promise<any> {
        var allRules = this.rules$();
        var rulesToEdit = allRules.filter(z => z.catName == exisingCatname);
        rulesToEdit.forEach(z => z.catName = newCatName);
        return this.replaceRules(allRules);
    }

    renameSubcats(existingSubcat: Subcategory, newSubcat: Subcategory): Promise<any> {
        var allRules = this.rules$();
        var rulesToEdit = allRules.filter(z => z.catName == existingSubcat.catName && z.subcatName == existingSubcat.subcatName);
        rulesToEdit.forEach(z => {
            z.catName = newSubcat.catName,
            z.subcatName = newSubcat.subcatName
        });
        return this.replaceRules(allRules);
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
