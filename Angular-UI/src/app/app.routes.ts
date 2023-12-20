import { Routes } from '@angular/router';
import { DashboardComponent } from "./components/dashboard/dashboard.component"
import { TransactionsComponent } from './components/transactions/transactions.component';
import { MonthlyReportComponent } from './components/monthly-report/monthly-report.component';
import { YearlyReportComponent } from './components/yearly-report/yearly-report.component';
export const routes: Routes = [
    {path: '', component: DashboardComponent},
    {path: 'transactions', component: TransactionsComponent},
    {path: 'monthly', component: MonthlyReportComponent},
    {path: 'yearly', component: YearlyReportComponent},

];
