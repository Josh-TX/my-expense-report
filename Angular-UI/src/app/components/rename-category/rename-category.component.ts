import { Component, Input, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService, Transaction, TransactionToAdd } from '@services/transaction.service';
import { FormsModule } from '@angular/forms'
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';

import {MatSnackBar} from '@angular/material/snack-bar';
import {
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatDialogRef,
    MatDialog
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CategoryService, Subcategory } from '@services/category.service';
import { SubcategorySelectComponent } from '@components/subcategory-select/subcategory-select.component';
import { ImportTransactionsComponent } from '@components/import-transactions/import-transactions.component';
import { getDistinct } from '@services/helpers';
import { CategoryRuleService } from '@services/category-rule.service';

@Component({
    standalone: true,
    
    imports: [CommonModule, FormsModule, MatInputModule, MatDialogTitle, MatDialogContent, MatDialogActions,
         MatDialogClose, MatButtonModule, SubcategorySelectComponent, MatIconModule],
    templateUrl: './rename-category.component.html'
})
export class RenameCategoryComponent {

    private existingSubcats: Subcategory[] = [];
    existingCatNames: string[] = [];
    selectedCatName: string = "";
    newCatName: string = "";
    selectedSubcatName: string = "";
    newSubcatName: string = "";
    showExistingSubcatButtons: boolean = false;
    filteredExistingSubcats: Subcategory[] = [];
    isNew: boolean | undefined;

    constructor(
        private categoryService: CategoryService,
        private categoryRuleService: CategoryRuleService,
        private transactionService: TransactionService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) {
        this.reset();
    } 

    private reset(){
        this.existingSubcats = this.categoryService.getSubcategories()
            .filter(z => z.catName != "income" && z.catName != "hidden" && !(z.catName == "other" && z.subcatName == "uncategorized"));
        this.existingCatNames = getDistinct(this.existingSubcats.map(z => z.catName));
    }

    clickExistingCatName(catName: string){
        this.selectedCatName = catName;
        this.filteredExistingSubcats = this.existingSubcats.filter(z => z.catName == catName);
        if (!this.newCatName){
            this.newCatName = catName;
        }
    }

    clickExistingSubcat(subcat: Subcategory){
        this.selectedSubcatName = subcat.subcatName;
        // if (!this.newSubcatName){
        //     this.newSubcatName = this.selectedSubcatName;
        // }
    }

    clearExistingCat(){
        this.selectedCatName = "";
    }

    clearExistingSubcat(){
        this.selectedSubcatName = "";
    }

    isCatNameNew(): boolean{
        return !!this.newCatName && !this.existingCatNames.some(z => z.toLowerCase() == this.newCatName.toLowerCase());
    }

    clearCat(){
        this.newCatName = "";
    }

    submit(){
        if (!this.newCatName){
            this.snackBar.open("new category name required", "", { panelClass: "snackbar-error", duration: 3000 });
            return;
        }
        if (!this.selectedSubcatName){
            //just renaming category
            this.categoryRuleService.renameCats(this.selectedCatName, this.newCatName);
            this.transactionService.renameCats(this.selectedCatName, this.newCatName);
        } else {
            if (!this.newSubcatName){
                this.snackBar.open("new subcategory name required", "", { panelClass: "snackbar-error", duration: 3000 });
                return;
            }
            //renaming the subcategory
            var selectedSubcat = {catName: this.selectedCatName, subcatName: this.selectedSubcatName};
            var newSubcat = {catName: this.newCatName, subcatName: this.newSubcatName};
            this.categoryRuleService.renameSubcats(selectedSubcat, newSubcat);
            this.transactionService.renameSubcats(selectedSubcat, newSubcat);
        }
    }
}
