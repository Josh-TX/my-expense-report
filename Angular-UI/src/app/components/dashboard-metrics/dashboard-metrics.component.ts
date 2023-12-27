import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { CategoryDonutComponent } from '@components/category-donut/category-donut.component';
import { ReportService, Report, ReportCell, ReportRow } from '@services/report.service';
import { TransactionService } from '@services/transaction.service';
import { SettingsService } from '@services/settings.service';
import { CategoryBarComponent } from "@components/category-bar/category-bar.component";
import { StatService } from '@services/stat.service';
import { groupBy } from '@services/helpers';

@Component({
    selector: 'mer-dashboard-metrics',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatTableModule, CategoryDonutComponent, CategoryBarComponent],
    templateUrl: './dashboard-metrics.component.html'
})
export class DashboardMetricsComponent {
    constructor(
        private reportService: ReportService,
        private statService: StatService,
    ) {

    }
    ngOnInit() {

    }

}