import { Injectable } from '@angular/core';
import { CategoryRule } from './category-rule.service';


export type Subcategory = {
    catName: string,
    subcatName: string
}

//the purpose of this service is to combine the ManualCategories and CategoryRules, 
//such that we have a single place to get the complete list of categories and subcategories
@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    ruleSubcategories: Subcategory[];
    manualSubcategories: Subcategory[];
    subcategories: Subcategory[];
    timeoutId: any;

    constructor(
    ) {
        this.ruleSubcategories = this.getDefaults();
        this.manualSubcategories = this.getDefaults();
        this.subcategories = this.getDefaults();
    }

    private getDefaults(): Subcategory[]{
        return [
            {catName: "other", subcatName: "uncategorized"},
            {catName: "income", subcatName: "income"},
            {catName: "hidden", subcatName: "hidden"},
        ];
    }

    getSubcategories(): Subcategory[] {
        return this.subcategories;
    }

    registerManualCategory(manualSubcategory: Subcategory): Subcategory {
        this.register(manualSubcategory.catName, manualSubcategory.subcatName, this.manualSubcategories);
        return this.register(manualSubcategory.catName, manualSubcategory.subcatName, this.subcategories);
    }

    registerCategoryRule(rule: CategoryRule): Subcategory {
        this.register(rule.catName, rule.subcatName, this.ruleSubcategories);
        return this.register(rule.catName, rule.subcatName, this.subcategories);
    }

    clearFromCategoryRules(){
        this.ruleSubcategories = this.getDefaults();
        this.subcategories = [...this.manualSubcategories];
    }
    clearFromManualCategories(){
        this.manualSubcategories = this.getDefaults();
        this.subcategories = [...this.ruleSubcategories];
    }

    private register(catName: string, subcatName: string, subcatList: Subcategory[]){
        var lowerCat = catName.toLowerCase();
        var lowerSubcat = subcatName.toLowerCase();
        var found = subcatList.find(z => z.catName.toLowerCase() == lowerCat && z.subcatName.toLowerCase() == lowerSubcat);
        if (found){
            return found;
        } else {
            var newSubcat = {
                catName: catName,
                subcatName: subcatName
            }
            subcatList.push(newSubcat);
            return newSubcat;
        }
    }
}
