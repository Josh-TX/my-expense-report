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

@Component({
    standalone: true,
    imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
    templateUrl: './edit-transactions.component.html'
})
export class EditTransactionsComponent {
    transactions: Transaction[] = [];
    anyManualCats: boolean = false;
    title: string = "";
    constructor(
        private transactionService: TransactionService,
        private dialogRef: MatDialogRef<EditTransactionsComponent>,
        private snackBar: MatSnackBar
    ) {
    }

    init(transactions: Transaction[]) {
        this.transactions = transactions;
        this.anyManualCats = this.transactions.some(z => z.catSource == "manual category")
    }

    negateAmounts() {
        if (this.transactions.some(z => z.tempId == -1)){
            alert("cannot edit sample data");
            return;
        }
        if (this.transactions.length == 1 || confirm(`are you sure you want to flip income/expenses for all ${this.transactions.length} transactions?`)) {
            this.transactionService.negateAmounts(this.transactions);
            this.snackBar.open("flipped income/expenses for " + this.transactions.length + " transactions", "", { duration: 3000 });
            this.dialogRef.close();
        }
    }

    hideTransactions() {
        if (this.transactions.some(z => z.tempId == -1)){
            alert("cannot edit sample data");
            return;
        }
        if (this.transactions.length == 1 || confirm(`are you sure you want to hide all ${this.transactions.length} transactions?`)) {
            this.transactionService.editSubcategories(this.transactions, { catName: "hidden", subcatName: "hidden" });
            this.snackBar.open("hid " + this.transactions.length + " transactions", "", { duration: 3000 });
            this.dialogRef.close();
        }
    }

    deleteTransactions() {
        if (this.transactions.some(z => z.tempId == -1)){
            alert("cannot edit sample data");
            return;
        }
        if (this.transactions.length == 1 || confirm(`are you sure you want to delete all ${this.transactions.length} transactions?`)) {
            this.transactionService.deleteTrxns(this.transactions);
            this.snackBar.open("deleted " + this.transactions.length + " Transactions", "", { duration: 3000 });
            this.dialogRef.close();
        }
    }

    removeManualCats(){
        if (this.transactions.some(z => z.tempId == -1)){
            alert("cannot edit sample data");
            return;
        }
        if (this.transactions.length == 1 || confirm(`are you sure you want to remove the manual categorization for all ${this.transactions.length} transactions?`)) {
            this.transactionService.removeManualCats(this.transactions);
            this.snackBar.open("removed manual categorization for " + this.transactions.length + " Transactions", "", { duration: 3000 });
            this.dialogRef.close();
        }
    }
}
