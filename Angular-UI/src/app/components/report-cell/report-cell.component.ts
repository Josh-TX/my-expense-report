import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { TransactionService, Transaction} from '@services/transaction.service';
import { ReportColumn } from '@services/report.service';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
  
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
  templateUrl: './report-cell.component.html'
})
export class ReportCellComponent {
  transactions: Transaction[] = [];
  title: string = "";
  constructor(
    private transactionService: TransactionService
    ){
  }

  init(date: Date, column: ReportColumn | null, isYearly: boolean){
    var dateStr = isYearly ? date.getFullYear() : new DatePipe('en-US').transform(date, 'MMM y');
    this.title = dateStr + this.getCategoryString(column);
    var endDate = new Date(date.getTime());
    if (isYearly){
      endDate.setFullYear(date.getFullYear() + 1);
    } else {
      endDate.setMonth(date.getMonth() + 1);
    }
    this.transactions = this.transactionService.getTransactions().filter(trxn => {
      if (trxn.date < date || trxn.date >= endDate){
        return false;
      }
      if (column){
        if (trxn.catName != column.catName){
          return false
        }
        return column.subcatName == null || column.subcatName == trxn.subcatName;
      }
      return true;
    })
  }

  private getCategoryString(column: ReportColumn | null): string{
    if (!column){
      return "";
    }
    if (column.catName === ""){
      return " - (uncategorized)"
    }
    if (!column.subcatName){
      return " - " + column.catName
    }
    return " - " + column.catName + " - " + column.subcatName;
  }
}
