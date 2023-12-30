import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ReportCellComponent } from '@components/report-cell/report-cell.component';
import { MatDialog } from '@angular/material/dialog';
import { ReportService, Report, ReportCell, ReportRow } from '@services/report.service';


@Component({
  selector: 'mer-report',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSlideToggleModule],
  templateUrl: './report.component.html'
})
export class ReportComponent {
  @Input() isYearly: boolean = false;
  report: Report | null = null;
  showSubcategories: boolean = false;
  selectedCell: ReportCell | null = null;

  constructor(
    private reportService: ReportService,
    private dialog: MatDialog
    ){
  }

  

  ngOnInit(){
    this.updateReport();
  }

  showSubcategoriesChanged(){
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
    if (this.isYearly){
      if (this.showSubcategories){
        this.report = this.reportService.getYearlySubcategoryReport();
      } else {
        this.report = this.reportService.getYearlyCategoryReport();
      }
    } else {
      if (this.showSubcategories){
        this.report = this.reportService.getMonthlySubcategoryReport();
      } else {
        this.report = this.reportService.getMonthlyCategoryReport();
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
