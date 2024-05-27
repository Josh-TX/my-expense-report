import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subcategory, CategoryService } from '@services/category.service';
import { MatInputModule } from '@angular/material/input'
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { areValuesSame, getDistinct } from '@services/helpers';

@Component({
    selector: "mer-subcategory-quickselect",
    standalone: true,
    imports: [CommonModule, FormsModule, MatInputModule, MatButtonModule, MatAutocompleteModule, MatIconModule],
    templateUrl: './subcategory-quickselect.component.html'
})
export class SubcategoryQuickselectComponent {
    @Input("catName") catNameBinding: string | undefined;
    @Output("catNameChange") catNameEmitter = new EventEmitter<string>()

    @Input("subcatName") subcatNameBinding: string | undefined;
    @Output("subcatNameChange") subcatNameEmitter = new EventEmitter<string>()

    catNameInput: string = "";
    subcatNameInput: string = "";


    filteredCatNames: string[] = [];
    filteredSubcats: Subcategory[] = [];
    showSubcatButtons: boolean = false;

    constructor(
        private categoryService: CategoryService) {
    }

    ngOnChanges(simpleChanges: SimpleChanges){
        if (this.catNameBinding != this.catNameInput){
            this.catNameInput = this.catNameBinding || "";
        }
        if (this.subcatNameBinding != this.subcatNameInput){
            this.subcatNameInput = this.subcatNameBinding || "";
        }
        this.updateCategoryButtons();
    }

    updateCategoryButtons(){
        this.showSubcatButtons = false;
        var subcats = this.categoryService.getSubcategories();
        var catNames = getDistinct(subcats.map(z => z.catName));
        var catNameFilter = this.catNameBinding || "";
        var subcatNameFilter = this.subcatNameBinding || "";
        this.filteredCatNames = getDistinct(subcats.map(z => z.catName));
        this.filteredSubcats = subcats.filter(z => z.subcatName != "uncategorized")
        if (this.catNameBinding){
            this.filteredCatNames = catNames.filter(z => z.toLowerCase().includes(catNameFilter.toLowerCase()));
            this.filteredSubcats = subcats.filter(z => z.catName.toLowerCase() == catNameFilter.toLowerCase());
            if (this.filteredSubcats.length){
                this.showSubcatButtons = true;
                this.filteredSubcats = this.filteredSubcats.filter(z => z.subcatName != "uncategorized")
                if (subcatNameFilter){
                    this.filteredSubcats = this.filteredSubcats.filter(z => z.subcatName.toLowerCase().includes(subcatNameFilter.toLowerCase()))
                }
            }
        }
    }

    clickCatName(catName: string){
        this.catNameEmitter.emit(catName);
    }

    clickSubcat(subcatName: string){
        this.subcatNameEmitter.emit(subcatName);
    }
}