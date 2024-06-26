import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { TransactionService, Transaction } from '@services/transaction.service';
import { ReportColumn } from '@services/report.service';
import {
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,

} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { getSum } from '@services/helpers';

@Component({
    standalone: true,
    imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
    templateUrl: './report-cell.component.html'
})
export class ReportCellComponent {
    transactions: Transaction[] = [];
    title: string = "";
    sum: number = 0;
    avg: number = 0;
    constructor(
        private transactionService: TransactionService
    ) {
    }

    init(date: Date, column: ReportColumn | null, isYearly: boolean, avg: number) {
        var dateStr = isYearly ? date.getFullYear() : new DatePipe('en-US').transform(date, 'MMM y');
        this.title = dateStr + this.getCategoryString(column);
        var endDate = new Date(date.getTime());
        if (isYearly) {
            endDate.setFullYear(date.getFullYear() + 1);
        } else {
            endDate.setMonth(date.getMonth() + 1);
        }
        this.transactions = this.transactionService.getTransactions().filter(trxn => {
            if (trxn.date < date || trxn.date >= endDate) {
                return false;
            }
            if (column) {
                if (column.special == "Total"){
                    return true;
                }
                if (column.special == "Expenses"){
                    return trxn.catName != "income";
                }
                if (trxn.catName != column.catName) {
                    return false
                }
                return column.subcatName == null || column.subcatName == trxn.subcatName;
            }
            return true;
        });
        this.avg = avg;
        this.sum = getSum(this.transactions.map(z => z.amount));
    }

    getDiff(){
        return Math.abs(this.avg - this.sum);
    }

    private getCategoryString(column: ReportColumn | null): string {
        if (!column || column.special == "Total") {
            return "";
        }
        if (column.special == "Expenses"){
            return ` - All Expenses`
        }
        if (!column.subcatName) {
            return ` - ${column.catName}`;
        }
        return ` - ${column.catName} - ${column.subcatName}`;
    }
}
