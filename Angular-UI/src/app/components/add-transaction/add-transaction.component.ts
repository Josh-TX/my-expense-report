import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService, Transaction, TransactionToAdd } from '@services/transaction.service';
import { FormsModule } from '@angular/forms'
import {MatInputModule} from '@angular/material/input';

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
import { Subcategory } from '@services/category.service';
import { SubcategorySelectComponent } from '@components/subcategory-select/subcategory-select.component';
import { ImportTransactionsComponent } from '@components/import-transactions/import-transactions.component';

@Component({
    standalone: true,
    
    imports: [CommonModule, MatCardModule, FormsModule, MatInputModule, MatDialogTitle, MatDialogContent, MatDialogActions,
         MatDialogClose, MatButtonModule, SubcategorySelectComponent],
    templateUrl: './add-transaction.component.html'
})
export class AddTransactionComponent {
    name: string = "";
    amount: number | undefined;
    date: Date | undefined;
    isNew: boolean | undefined;
    catName: string = "";
    subcatName: string = ""

    constructor(
        private transactionService: TransactionService,
        private dialogRef: MatDialogRef<AddTransactionComponent>,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) {
    }

    importFromFile(){
        this.dialogRef.close();
        this.dialog.open(ImportTransactionsComponent, { panelClass: "dialog-xl", autoFocus: false })
    }

    submit() {
        var now = new Date();
        var tooEarly = new Date(2000,1,1);
        var date = this.date instanceof Date ? this.date : new Date(<any>this.date)
        var subcategory: Subcategory | undefined;
        var error = "";
        if (!this.name) {
            error = "name required"
        }
        else if (!this.amount) {
            error = "amount required"
        }
        else if (!date) {
            error = "date required"
        }
        else if (date!.getTime() > now.getTime() || date.getTime() < new Date(2000,1,1).getTime()) {
            error = "invalid date"
        }
        else if (this.catName || this.subcatName) {
            if (this.catName && !this.subcatName){
                error = "must provide subcategory when category is provided"
            } else if (!this.catName && this.subcatName){
                error = "must provide category when subcategory is provided"
            }
            subcategory = {
                catName: this.catName,
                subcatName: this.subcatName,
            }
        }
        if (error){
            this.snackBar.open(error, "", { panelClass: "snackbar-error", duration: 3000 });
            return
        }
        var transactionToAdd: TransactionToAdd = {
            amount: this.amount!,
            date: date,
            name: this.name,
            manualSubcategory: subcategory
        }
        this.transactionService.addTransactions([transactionToAdd], "manually added").then(() => {
            this.snackBar.open("Transaction manually added", "", { duration: 3000 });
            this.dialogRef.close();
        });
    }
}
