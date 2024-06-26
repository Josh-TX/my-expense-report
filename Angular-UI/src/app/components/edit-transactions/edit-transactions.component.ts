import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { TransactionService, Transaction } from '@services/transaction.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import { ReportColumn } from '@services/report.service';
import {
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatDialogRef,

} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { SubcategorySelectComponent } from '@components/subcategory-select/subcategory-select.component';
import { SubcategoryQuickselectComponent } from '@components/subcategory-select/subcategory-quickselect.component';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { roundToCent } from '@services/helpers';

@Component({
    standalone: true,
    imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, FormsModule, MatInputModule, MatDialogClose, MatButtonModule, SubcategorySelectComponent, SubcategoryQuickselectComponent],
    templateUrl: './edit-transactions.component.html'
})
export class EditTransactionsComponent {
    transactions: Transaction[] = [];
    anyManualCats: boolean = false;
    title: string = "";
    mode: string = "";
    eachTransaction: string = "";

    isNew: boolean | undefined;
    catName: string = "";
    subcatName: string = ""

    editedAmount: number | undefined;
    constructor(
        private transactionService: TransactionService,
        private dialogRef: MatDialogRef<EditTransactionsComponent>,
        private snackBar: MatSnackBar
    ) {
    }

    init(transactions: Transaction[]) {
        this.transactions = transactions;
        this.eachTransaction = this.transactions.length == 1 ? "The transaction" : `Each of the ${this.transactions.length} transactions`
        this.anyManualCats = this.transactions.some(z => z.catSource == "manual category")
    }

    submitReady(): boolean{
        if (!this.mode){
            return false;
        }
        switch (this.mode){
            case "assign-cat":
                return !!this.catName && !!this.subcatName && this.subcatName != "uncategorized";
            case "amount":
                return !!this.editedAmount;
            default:
                return true;
        }
    }

    submit(){
        if (this.transactions.some(z => z.tempId == -1)){
            alert("cannot edit sample data");
            return;
        }
        if (this.mode == "flip"){
            if (this.transactions.length == 1 || confirm(`are you sure you want to flip income/expenses for all ${this.transactions.length} transactions?`)) {
                this.transactionService.negateAmounts(this.transactions).then(() => {
                    this.snackBar.open("flipped income/expenses for " + this.transactions.length + " transactions", "", { duration: 3000 });
                    this.dialogRef.close();
                })
            }
        }
        if (this.mode == "amount"){
            var amount = roundToCent(this.editedAmount!);
            if (this.transactions.length == 1 || confirm(`are you sure you want to set the amount to ${amount} for all ${this.transactions.length} transactions?`)) {
                this.transactionService.editAmounts(this.transactions, amount).then(() => {
                    this.snackBar.open("edited amount for " + this.transactions.length + " transactions", "", { duration: 3000 });
                    this.dialogRef.close();
                })
            }
        }
        if (this.mode == "delete"){
            if (this.transactions.length == 1 || confirm(`are you sure you want to delete all ${this.transactions.length} transactions?`)) {
                this.transactionService.deleteTrxns(this.transactions).then(() => {                    
                    this.snackBar.open("deleted " + this.transactions.length + " Transactions", "", { duration: 3000 });
                    this.dialogRef.close();
                });
            }
        }
        if (this.mode == "hide"){
            if (this.transactions.length == 1 || confirm(`are you sure you want to hide all ${this.transactions.length} transactions?`)) {
                this.transactionService.assignManualCats(this.transactions, { catName: "hidden", subcatName: "hidden" }).then(() => {
                    this.snackBar.open("hid " + this.transactions.length + " transactions", "", { duration: 3000 });
                    this.dialogRef.close();
                });
            }
        }
        if (this.mode == "assign-cat"){
            if (this.transactions.length == 1 || confirm(`are you sure you want to assign a manual category to all ${this.transactions.length} transactions?`)) {
                this.transactionService.assignManualCats(this.transactions, { catName: this.catName, subcatName: this.subcatName }).then(() => {
                    this.snackBar.open("assigned mannual category to " + this.transactions.length + " transactions", "", { duration: 3000 });
                    this.dialogRef.close();
                })
            }
        }

        if (this.mode == "remove-cat"){
            if (this.transactions.length == 1 || confirm(`are you sure you want to assign a manual category to all ${this.transactions.length} transactions?`)) {
                this.transactionService.assignManualCats(this.transactions, undefined).then(() => {
                    this.snackBar.open("assigned mannual category to " + this.transactions.length + " transactions", "", { duration: 3000 });
                    this.dialogRef.close();
                })
            }
        }
    }
}
