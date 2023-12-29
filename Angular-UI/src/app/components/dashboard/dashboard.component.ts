import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ImportTransactionsComponent } from '@components/import-transactions/import-transactions.component';
import { FixUncategorizedComponent } from '@components/fix-uncategorized/fix-uncategorized.component';
import { ImportRulesComponent } from '@components/import-rules/import-rules.component';
import { ExportDataComponent } from '@components/export-data/export-data.component';
import { CategoryDonutComponent } from '@components/category-donut/category-donut.component';
import { CategoryBarComponent } from "@components/category-bar/category-bar.component";

@Component({
  standalone: true,
  imports: [MatCardModule, MatButtonModule, CategoryDonutComponent, CategoryBarComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  donutCurrentDate: Date | undefined;
  constructor(private dialog: MatDialog){

  }

  barClicked(event: Date){
    this.donutCurrentDate = event;
  }

  importTransactions(){
    var dialogRef = this.dialog.open(ImportTransactionsComponent, { panelClass: "dialog-xl", autoFocus: false })
  }

  fixUncategorized(){
    this.dialog.open(FixUncategorizedComponent, { panelClass: "dialog-xl", autoFocus: false })
  }

  importRules(){
    this.dialog.open(ImportRulesComponent, { panelClass: "dialog-xl", autoFocus: false })
  }

  exportData(){
    this.dialog.open(ExportDataComponent, { panelClass: "dialog-xl", autoFocus: false })
  }
}
