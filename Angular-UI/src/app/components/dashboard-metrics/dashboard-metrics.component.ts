import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { CategoryDonutComponent } from '@components/category-donut/category-donut.component';
import { ReportGenerator, Report, ReportCell, ReportRow } from '@components/report/report-generator';
import { TransactionService } from '@services/transaction.service';
import { SettingsService } from '@services/settings.service';
import { DonutData, DonutSubcategoryItem, DonutCategoryItem} from "@components/category-donut/category-donut.component";

@Component({
  selector: 'mer-dashboard-metrics',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, CategoryDonutComponent],
  templateUrl: './dashboard-metrics.component.html'
})
export class DashboardMetricsComponent {
  donutData: DonutData | null = null;
  constructor(
    private transactionService: TransactionService,
    private settingsService: SettingsService
    ){

  }
  ngOnInit() {
    var transactions = this.transactionService.getTransactions();
    var settings = this.settingsService.getSettings();
    var generator = new ReportGenerator(transactions, settings);
    var report = generator.getMonthlySubcategoryReport();
    if (report.rows.length){
      var rowIndex = 0;
      var row = report.rows[rowIndex];
      var categoryItems: DonutCategoryItem[] = [];
      var sumWidth = 0;
      for (var catIndex = 0; catIndex < report.headerRows[0].length; catIndex++){
        var colIndexes: number[] = [];
        for (var colIndex = sumWidth; colIndex < sumWidth + report.headerRows[0][catIndex].width; colIndex++){
          colIndexes.push(colIndex);
        }
        var subcategoryNames = report.headerRows[1].filter((z,i) => colIndexes.includes(i)).map(z => z.name);
        var subcategoryAmounts = row.cells.filter((z,i) => colIndexes.includes(i)).map(z => z.amount);
        var subcategoryAverageAmounts = report.averages.filter((z,i) => colIndexes.includes(i));
        var subcategoryItems = row.cells.filter((z,i) => colIndexes.includes(i)).map((z,i) => <DonutSubcategoryItem>{
          subcategory: subcategoryNames[i],
          amount: subcategoryAmounts[i],
          averageAmount: subcategoryAverageAmounts[i]
        });
        var categoryAmount = subcategoryAmounts.reduce((a, b) => a + b, 0);
        var categoryAverageAmount = subcategoryAverageAmounts.reduce((a, b) => a + b, 0);

        categoryItems.push({
          category:  report.headerRows[0][catIndex].name,
          amount: categoryAmount,
          averageAmount: categoryAverageAmount,
          items: subcategoryItems
        });
        sumWidth += report.headerRows[0][catIndex].width;

      }
      this.donutData = {
        isYearly: false,
        date: row.date,
        items: categoryItems
      };
      // for (var i = 0; i < row.cells.length; i++){
      //   donutItems.push({
      //     category: report.headerRows[1][i].name,
      //     amount: row.cells[i].amount,
      //     averageAmount: report.averages[i]
      //   });
      // }
      // this.donutData = {
      //   isYearly: false,
      //   date: row.date,
      //   items: donutItems
      // };
    }
  }
}