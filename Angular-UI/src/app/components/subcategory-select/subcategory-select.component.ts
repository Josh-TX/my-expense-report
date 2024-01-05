import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subcategory, CategoryService } from '@services/category.service';
import { MatInputModule } from '@angular/material/input'
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { areValuesSame } from '@services/helpers';

@Component({
    selector: "mer-subcategory-select",
    standalone: true,
    imports: [CommonModule, FormsModule, MatInputModule, MatButtonModule, MatAutocompleteModule],
    templateUrl: './subcategory-select.component.html'
})
export class SubcategorySelectComponent {
    @Input("subcategory") subcategoryBinding: Subcategory | undefined;
    @Output("subcategoryChange") subcategoryChange = new EventEmitter<Subcategory | undefined>()

    @Input("isNew") isNewBinding: boolean | undefined;
    @Output("isNewChange") isNewChange = new EventEmitter<boolean | undefined>()

    allCatNames: string[] = [];
    filteredCatNames: string[] = [];
    catNameInput: string | null = "";

    allSubcategories: Subcategory[] = [];
    filteredSubcategories: Subcategory[] = [];
    subcategoryInput: string | Subcategory | null = "";

    constructor(
        private categoryService: CategoryService) {
    }

    ngOnChanges(changes: SimpleChanges){
        if (changes['subcategoryBinding']){
            if (this.subcategoryBinding && this.subcategoryBinding.catName == this.catNameInput && this.subcategoryBinding.subcatName == this.getSubcatName() ){
                return;
            }
            this.catNameInput = this.subcategoryBinding ? this.subcategoryBinding.catName : null;
            this.subcategoryInput = this.subcategoryBinding ? this.subcategoryBinding : null;
            this.updateFilters();
            setTimeout(() => {
                this.update();
            })
        }
    }

    ngOnInit() {
        this.allSubcategories = this.categoryService.getSubcategories().filter(z => !(z.catName == "other" && z.subcatName == "uncategorized"));
        this.allCatNames = [...new Set(this.allSubcategories.map(z => z.catName))];
        if (!this.allCatNames.includes("other")){
            this.allCatNames.push("other");
        }
        this.filteredCatNames = this.allCatNames;
        this.filteredSubcategories = this.allSubcategories;
    }

    updateFilters(){
        this.filteredCatNames = this.allCatNames;
        this.filteredSubcategories = this.allSubcategories;
        if (this.catNameInput){
            this.filteredCatNames = this.allCatNames.filter(z => z.toLowerCase().startsWith(this.catNameInput!.toLowerCase()));
            this.filteredSubcategories = this.allSubcategories.filter(z => z.catName.toLowerCase() == this.catNameInput!.toLowerCase())
        }
        if (this.subcategoryInput){
            if (this.catNameInput){
                this.filteredSubcategories = this.filteredSubcategories.filter(z => z.subcatName.toLowerCase() == this.getSubcatName().toLowerCase())
            } else if (typeof this.subcategoryInput == "string"){
                this.filteredSubcategories = this.filteredSubcategories.filter(info => this.filterMatchesTarget(<any>this.subcategoryInput, [info.catName, info.subcatName]));
            }
        }
    }


    subcategoryInputChange(event: string | Subcategory) {
        this.updateFilters();
        this.update();
    }

    catNameInputChange(filter: string) {
        this.updateFilters();
        this.update();
    }

    displayFn(data: Subcategory | string): string {
        if (typeof data == "string"){
            return data;
        }
        return data?.subcatName || "";
    }

    quickSelectSubcategory(subcategory: Subcategory) {
        this.catNameInput = subcategory.catName;
        this.subcategoryInput = subcategory.subcatName;
        this.update();
    }

    getSubcategoriesFromCatName(catName: string) {
        return this.allSubcategories.filter(z => z.catName == catName);
    }
    private getSubcatName(): string {
        if (!this.subcategoryInput) {
            return "";
        }
        if (typeof this.subcategoryInput == "object") {
            return this.subcategoryInput.subcatName
        }
        return this.subcategoryInput;
    }

    private filterMatchesTarget(filter: string, targets: string[]): boolean {
        var filterParts = filter.split(" ");
        for (var filterPart of filterParts) {
            if (!targets.some(target => target.toLowerCase().startsWith(filterPart.toLowerCase()))) {
                return false;
            }
        }
        return true;
    }

    private update() {
        var newSubcategoryBinding = { catName: this.catNameInput || "", subcatName: this.getSubcatName() };
        if (!areValuesSame(this.subcategoryBinding, newSubcategoryBinding)){
            this.subcategoryBinding = newSubcategoryBinding;
            this.subcategoryChange.emit(this.subcategoryBinding);
        }
        var isNew = !this.allSubcategories.find(z => z.catName.toLowerCase() == this.subcategoryBinding!.catName.toLowerCase() 
            && z.subcatName.toLowerCase() == this.subcategoryBinding!.subcatName.toLowerCase());
        if (isNew != this.isNewBinding){
            this.isNewBinding = isNew;
            this.isNewChange.emit(this.isNewBinding);
        }
    }
}