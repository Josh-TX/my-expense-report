import { Component } from '@angular/core';
import { Transaction, TransactionService } from '@services/transaction.service';
import { CommonModule } from '@angular/common'
import { SettingsService } from '@services/settings.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './transactions.component.html'
})
export class TransactionsComponent {
  filteredTransactions: Transaction[] = [];
  allTransactions: Transaction[] = [];
  pageSize: number = 1000;

  constructor(
    private transactionService: TransactionService,
    private settingsService: SettingsService,

  ) { }
  ngOnInit() {
    var d1 = new Date();
    this.pageSize = this.settingsService.getSettings().maxRenderTransactionRows;
    this.allTransactions = this.transactionService.getTransactions();
    this.filteredTransactions = this.allTransactions.slice(0,this.pageSize);
    var d2 = new Date();
    console.log(d2.getTime() - d1.getTime());
  }

  renderAll(){
    this.filteredTransactions = this.allTransactions;
  }
}
