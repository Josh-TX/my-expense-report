import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '@services/settings.service';
import { TransactionService } from '@services/transaction.service';
import { ReportGenerator, Report, ReportCell, ReportRow } from './report-generator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ReportCellComponent } from '@components/report-cell/report-cell.component';
import { MatDialog } from '@angular/material/dialog';


@Component({
  selector: 'mer-report',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSlideToggleModule],
  templateUrl: './report.component.html'
})
export class ReportComponent {
  @Input() isYearly: boolean = false;
  report: Report | null = null;
  subcategories: boolean = false;
  selectedCell: ReportCell | null = null;

  constructor(
    private transactionService: TransactionService,
    private settingsService: SettingsService,
    private dialog: MatDialog
    ){
  }

  

  ngOnInit(){
    this.updateReport();
  }

  subcategoriesChanged(){
    this.updateReport();
  }

  cellClicked(cell: ReportCell, row: ReportRow, index: number | null){
    this.selectedCell = cell;
    var ref = this.dialog.open(ReportCellComponent);
    var column = index != null ? this.report!.columns[index] : null;
    ref.componentInstance.init(row.date, column, this.isYearly);
    ref.afterClosed().subscribe(() => {
      setTimeout(() => {
        this.selectedCell = null;
      }, 50);
    })
  }


  updateReport(){
    var transactions = this.transactionService.getTransactions();
    var settings = this.settingsService.getSettings();
    var generator = new ReportGenerator(transactions, settings);
    if (this.isYearly){
      if (this.subcategories){
        this.report = generator.getYearlySubcategoryReport();
      } else {
        this.report = generator.getYearlyCategoryReport();
      }
    } else {
      if (this.subcategories){
        this.report = generator.getMonthlySubcategoryReport();
      } else {
        this.report = generator.getMonthlyCategoryReport();
      }
    }
  }


  getColorOpacity(cell: ReportCell): string{
    return "--report-cell-opacity: " + Math.abs(cell.deviation);
  }

  getMaxWidth(){
    return (this.report!.columns.length + 2) * 300;
  }
}
