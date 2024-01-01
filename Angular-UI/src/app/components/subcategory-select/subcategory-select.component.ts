import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subcategory, CategoryService } from '@services/category.service';
import { MatInputModule } from '@angular/material/input'
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';

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
    ngOnInit() {
        this.allSubcategories = this.categoryService.getSubcategories().filter(z => !(z.catName == "other" && z.subcatName == "uncategorized"));
        this.allCatNames = [...new Set(this.allSubcategories.map(z => z.catName))];
        this.filteredCatNames = this.allCatNames;
        this.filteredSubcategories = this.allSubcategories;
    }

    subcategoryInputChange(event: string | Subcategory) {
        if (typeof event == "string") {
            var filter = event;
            this.filteredSubcategories = this.allSubcategories;
            if (this.catNameInput) {
                this.filteredSubcategories = this.allSubcategories.filter(info => info.catName.toLowerCase() == this.catNameInput!.toLowerCase())
            }
            if (filter && !(typeof this.subcategoryInput == "object")) {
                this.filteredSubcategories = this.filteredSubcategories.filter(info => this.filterMatchesTarget(filter, [info.catName, info.subcatName]));
            }
        } else { //event is Subcategory
            this.catNameInput = event.catName;
            this.filteredSubcategories = [event];
            this.subcategoryInput = event;
        }
        this.update();
    }

    catNameInputChange(filter: string) {
        this.filteredCatNames = this.allCatNames.filter(z => z.toLowerCase().startsWith(filter.toLowerCase()));
        if (this.subcategoryInput && typeof this.subcategoryInput == "object" && filter.toLowerCase() != this.subcategoryInput.catName.toLowerCase()) {
            this.subcategoryInput = null;
            this.subcategoryInput = "";
        }
        if (filter) {
            this.filteredSubcategories = this.allSubcategories.filter(info => info.catName.toLowerCase() == filter.toLowerCase());
        } else {
            this.filteredSubcategories = this.allSubcategories;
        }
        this.update();
    }

    displayFn(info: Subcategory): string {
        return info ? info.subcatName : "";
    }

    quickSelectSubcategory(subcategory: Subcategory) {
        this.subcategoryInput = subcategory;
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
        this.subcategoryBinding = { catName: this.catNameInput || "", subcatName: this.getSubcatName() };
        this.subcategoryChange.emit(this.subcategoryBinding);
        var isNew = !this.allSubcategories.find(z => z.catName.toLowerCase() == this.subcategoryBinding!.catName.toLowerCase() 
            && z.subcatName.toLowerCase() == this.subcategoryBinding!.subcatName.toLowerCase());
        if (isNew != this.isNewBinding){
            this.isNewBinding = isNew;
            this.isNewChange.emit(this.isNewBinding);
        }
    }
}