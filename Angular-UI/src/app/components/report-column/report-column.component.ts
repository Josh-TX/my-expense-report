import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TransactionService, Transaction } from '@services/transaction.service';
import { CategoryBarComponent } from '@components/category-bar/category-bar.component';
import {
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,

} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { getStartOfMonth, getStartOfYear } from '@services/helpers';

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, 
        MatButtonModule, MatSlideToggleModule, CategoryBarComponent],
    templateUrl: './report-column.component.html'
})
export class ReportColumnComponent {
    transactions: Transaction[] = [];
    filteredTransactions: Transaction[] = [];
    catName: string = "";
    subcatName: string | undefined = "";
    showSubcategories: boolean = true;
    
    filteredDate: Date | undefined;
    
    isSubcategory: boolean = false;
    isYearly: boolean = false;
    dateFormat: string = 'MMM y'
    title: string = "";
    constructor(
        private transactionService: TransactionService
    ) {
    }

    init(catName: string, subcatName: string | undefined, isYearly: boolean) {
        this.catName = catName;
        this.subcatName = subcatName;
        this.isYearly = isYearly
        this.title = catName
        this.transactions = this.transactionService.getTransactions().filter(trxn => trxn.catName == catName);
        if (subcatName){
            this.title += " - " + subcatName;
            this.transactions = this.transactions.filter(trxn => trxn.subcatName == subcatName);
        }
        this.filteredTransactions = this.transactions;
        if (isYearly){
            this.dateFormat = 'y';
        }
    }
    barClicked(date: Date | undefined){
        this.filteredDate = date;
        if (date){
            if (this.isYearly){
                this.filteredTransactions = this.transactions.filter(z => getStartOfYear(z.date).getTime() == date.getTime());
            } else {
                this.filteredTransactions = this.transactions.filter(z => getStartOfMonth(z.date).getTime() == date.getTime());
            }
        } else {
            this.filteredTransactions = this.transactions
        }
    }
}
