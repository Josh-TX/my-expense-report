import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import Papa from 'papaparse';
import { MatButtonModule } from '@angular/material/button';
import { CategoryService } from '@services/category.service';
import { DatePipe, CurrencyPipe } from '@angular/common';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { TransactionService } from '@services/transaction.service';

@Component({
  standalone: true,
  imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
  templateUrl: './export-data.component.html'
})
export class ExportDataComponent {
  constructor(
    private categoryService: CategoryService,
    private transactionService: TransactionService
    ) { 
  }

  exportTransactions(){
    var transactions = this.transactionService.getTransactions();
    var datePipe = new DatePipe('en-US');
    var currencyPipe = new CurrencyPipe('en-US');
    var headers = ["Date", "Description", "Amount", "Category", "Subcategory"];
    var transactionRows = transactions.map(z => [datePipe.transform(z.trxnDate, 'M/d/yy'), z.name, currencyPipe.transform(z.amount), z.category, z.subcategory]);
    var transactionCSV = Papa.unparse( [headers, ...transactionRows]);
    this.exportToFile("transactions.csv", transactionCSV);
  }

  exportRules(){
    var rules = this.categoryService.getRules();
    var headers = ["Category", "Subcategory", "Match Text"];
    var rows = rules.map(z => [z.category, z.subcategory, z.text]);
    var ruleCSV = Papa.unparse( [headers, ...rows]);
    this.exportToFile("category-rules.csv", ruleCSV);
  }

  private exportToFile(filename: string, text: string) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}
