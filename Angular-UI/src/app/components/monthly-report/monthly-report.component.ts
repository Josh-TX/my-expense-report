import { Component } from '@angular/core';
import { ReportComponent } from '@components/report/report.component';

@Component({
  standalone: true,
  imports: [ ReportComponent ],
  template: '<mer-report [isYearly]="false"></mer-report>'
})
export class MonthlyReportComponent {
  constructor(
    ){
  }
}
