import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subcategory, CategoryService } from '@services/category.service';
import { MatInputModule } from '@angular/material/input'
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { areValuesSame } from '@services/helpers';

@Component({
    selector: "mer-subcategory-select",
    standalone: true,
    imports: [CommonModule, FormsModule, MatInputModule, MatButtonModule, MatAutocompleteModule, MatIconModule],
    templateUrl: './subcategory-select.component.html'
})
export class SubcategorySelectComponent {
    @Input("catName") catNameBinding: string | undefined;
    @Output("catNameChange") catNameEmitter = new EventEmitter<string>()

    @Input("subcatName") subcatNameBinding: string | undefined;
    @Output("subcatNameChange") subcatNameEmitter = new EventEmitter<string>()

    @Input("isNew") isNewBinding: boolean | undefined;
    @Output("isNewChange") isNewEmitter = new EventEmitter<boolean | undefined>()

    catNameInput: string = "";
    subcatNameInput: string = "";


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
        setTimeout(() => this.updateIsNew())
    }

    catNameInputChange(){
        if (this.catNameBinding != this.catNameInput){
            this.catNameBinding = this.catNameInput;
            this.catNameEmitter.emit(this.catNameInput);
        }
        this.updateIsNew();
    }

    subcatNameInputChange(){
        if (this.subcatNameBinding != this.subcatNameInput){
            this.subcatNameBinding = this.subcatNameInput;
            this.subcatNameEmitter.emit(this.subcatNameInput);
        }
        this.updateIsNew();
    }

    isCatNameNew(): boolean{
        if (!this.catNameInput){
            return false;
        }
        return !this.categoryService.getSubcategories().some(z => z.catName.toLowerCase() == this.catNameInput.toLowerCase());
    }

    isSubcatNameNew(): boolean{
        if (!this.catNameInput || !this.subcatNameInput){
            return false;
        }
        return !this.categoryService.getSubcategories().some(z => z.catName.toLowerCase() == this.catNameInput.toLowerCase() 
            && z.subcatName.toLowerCase() == this.subcatNameInput.toLowerCase());
    }

    clearCat() {
        this.clearSubcat();
        this.catNameInput = "";
        this.catNameInputChange();
    }

    clearSubcat() {
        this.subcatNameInput = "";
        this.subcatNameInputChange();
    }

    private updateIsNew(){
        var isNew = this.isSubcatNameNew();
        if (this.isNewBinding != isNew){
            this.isNewBinding = isNew;
            this.isNewEmitter.emit(isNew);
        }
    }
}