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
    title: string = "";
    constructor(
        private transactionService: TransactionService,
        private dialogRef: MatDialogRef<EditTransactionsComponent>,
        private snackBar: MatSnackBar
    ) {
    }

    init(transactions: Transaction[]) {
        this.transactions = transactions;
    }

    negateAmounts() {
        if (confirm("are you sure you want to flip income/expenses for all the transactions?")) {
            this.transactionService.negateAmounts(this.transactions);
            this.snackBar.open("flipped income/expenses for " + this.transactions.length + " transactions", "", { duration: 3000 });
            this.dialogRef.close();
        }
    }

    hideTransactions() {
        if (confirm("are you sure you want to hide the transactions?")) {
            this.transactionService.editSubcategories(this.transactions, { catName: "hidden", subcatName: "hidden" });
            this.snackBar.open("hid " + this.transactions.length + " transactions", "", { duration: 3000 });
            this.dialogRef.close();
        }
    }

    deleteTransactions() {
        if (confirm("are you sure you want to delete the transactions?")) {
            this.transactionService.deleteTrxns(this.transactions);
            this.snackBar.open("deleted " + this.transactions.length + " Transactions", "", { duration: 3000 });
            this.dialogRef.close();
        }
    }
}
