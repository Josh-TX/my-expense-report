import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TransactionService, Transaction } from '@services/transaction.service';
import { CategoryDonutComponent, DonutChartType, DonutClickData } from '@components/category-donut/category-donut.component';
import {
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,

} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CategoryColorService } from '@services/category-color.service';
import { LocalSettingsService } from '@services/local-settings.service';

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, 
        MatButtonModule, MatSlideToggleModule, CategoryDonutComponent],
    templateUrl: './report-row.component.html'
})
export class ReportRowComponent {
    transactions: Transaction[] = [];
    filteredTransactions: Transaction[] = [];
    filterCat: string = "";
    filterSubcat: string = "";
    date: Date | undefined;
    largeGraph: boolean = false;
    isSubcategory: boolean = false;
    isYearly: boolean = false;
    title: string = "";
    constructor(
        private transactionService: TransactionService,
        private localSettingsService: LocalSettingsService,
        private categoryColorService: CategoryColorService
    ) {
        this.largeGraph = this.localSettingsService.getValue("largeGraph") ?? false;
    }

    init(date: Date, isSubcategory: boolean, isYearly: boolean) {
        this.title = isYearly ? date.getFullYear().toString() : new DatePipe('en-US').transform(date, 'MMM y')!;
        this.date = date;
        this.isSubcategory = isSubcategory
        this.isYearly = isYearly
        var endDate = new Date(date.getTime());
        if (isYearly) {
            endDate.setFullYear(date.getFullYear() + 1);
        } else {
            endDate.setMonth(date.getMonth() + 1);
        }
        this.transactions = this.transactionService.getTransactions().filter(trxn => {
            if (trxn.date < date || trxn.date >= endDate) {
                return false;
            }
            return true;
        })
        this.filteredTransactions = this.transactions;
    }

    getColorStyles(){
        var colorSet = this.categoryColorService.getColorSet(this.filterCat!);
        return `background: ${colorSet.background}; border: 1px solid ${colorSet.border}`
    }

    donutClicked(event: DonutClickData | null){
        this.resetFilter();
        if (event){
            var catNames = [...event.movedToOtherCatNames, event.catName]
            this.filteredTransactions = this.transactions.filter(z => catNames.includes(z.catName));
            if (event.movedToOtherCatNames){
                this.filterCat = catNames.join(", ")
            } else {
                this.filterCat = event.catName
            }
            if (event.subcatName != null){
                this.filteredTransactions = this.transactions.filter(z => z.catName == event.catName && z.subcatName == event.subcatName)
                this.filterSubcat = event.subcatName
            }
        }
    }

    getChartType(): DonutChartType{
        if (this.largeGraph){
            return "both"
        } else if (this.isSubcategory){
            return "subcategory"
        }
        return "category";
    }

    isSubcategoryChanged(){
        this.resetFilter();
    }

    largeGraphChanged() {
        this.localSettingsService.setValue("largeGraph", this.largeGraph);
        this.resetFilter();
    }

    private resetFilter(){
        this.filteredTransactions = this.transactions;
        this.filterCat = "";
        this.filterSubcat = "";
    }
}
