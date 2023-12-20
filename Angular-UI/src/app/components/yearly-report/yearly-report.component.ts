import { Component } from '@angular/core';
import { ReportComponent } from '@components/report/report.component';

@Component({
  standalone: true,
  imports: [ ReportComponent ],
  template: '<mer-report [isYearly]="true"></mer-report>'
})
export class YearlyReportComponent {
  constructor(
    ){
  }
}
