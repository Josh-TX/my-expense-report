import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { TransactionService, Transaction } from '@services/transaction.service';
import { FormsModule } from '@angular/forms'
import {MatInputModule} from '@angular/material/input';
import {MatDatepickerModule,} from '@angular/material/datepicker';

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
import { MatNativeDateModule } from '@angular/material/core';

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, MatInputModule, MatDialogTitle, MatDialogContent, MatDialogActions,
         MatDialogClose, MatButtonModule, MatDatepickerModule, MatNativeDateModule],
    providers: [
        MatDatepickerModule //this is broken ATM
    ],
    templateUrl: './add-transaction.component.html'
})
export class AddTransactionComponent {
    name: string = "";
    amount: number | undefined;
    date: Date | undefined;

    constructor(
        private transactionService: TransactionService,
        private dialogRef: MatDialogRef<AddTransactionComponent>,
        private snackBar: MatSnackBar
    ) {
    }

    submit() {
        console.log(this.name, this.amount, this.date);
        this.snackBar.open("test", "", { duration: 3000 });
        this.dialogRef.close();
    }
}
