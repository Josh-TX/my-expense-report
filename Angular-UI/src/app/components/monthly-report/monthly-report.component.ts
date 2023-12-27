import { Component } from '@angular/core';
import { ReportComponent } from '@components/report/report.component';

@Component({
  selector: "mer-monthly-report",
  standalone: true,
  imports: [ ReportComponent ],
  template: '<mer-report [isYearly]="false"></mer-report>'
})
export class MonthlyReportComponent {
  constructor(
    ){
  }
}
