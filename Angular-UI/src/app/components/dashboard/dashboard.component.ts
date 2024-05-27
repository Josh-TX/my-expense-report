import { Component, Signal, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { ImportTransactionsComponent } from '@components/import-transactions/import-transactions.component';
import { FixUncategorizedComponent } from '@components/fix-uncategorized/fix-uncategorized.component';
import { CategoryDonutComponent } from '@components/category-donut/category-donut.component';
import { CategoryBarComponent } from "@components/category-bar/category-bar.component";
import { ManageRulesComponent } from '@components/manage-rules/manage-rules.component';
import { RenameCategoryComponent } from '@components/rename-category/rename-category.component';
import { TransactionService } from '@services/transaction.service';
import { environment } from '../../../environments/environment';
import { StatService } from '@services/stat.service';
import { CategoryService } from '@services/category.service';

@Component({
    standalone: true,
    imports: [MatCardModule, MatButtonModule, CategoryDonutComponent, CategoryBarComponent, MatMenuModule, MatIconModule],
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
    donutCurrentDate: Date | undefined;
    uncategorizedCount$: Signal<number>;
    trxnCount$: Signal<number>;
    anyStats$: Signal<boolean>;
    isSample$: Signal<boolean>;
    anyCategories$: Signal<boolean>;
    envName: string = environment.envName;

    constructor(
        private dialog: MatDialog,
        private transactionService: TransactionService,
        private statService: StatService,
        private categoryService: CategoryService,
        ) {
        this.trxnCount$ = computed(() => this.transactionService.getTransactions().length);
        this.isSample$ = computed(() => this.transactionService.isSampleData());
        this.anyStats$ = computed(() => !!this.statService.getCatMonthStats().length);
        this.anyCategories$ = computed(() => this.categoryService.getSubcategories().length > 3);//other,hidden 
        this.uncategorizedCount$ = computed(() => this.transactionService.getTransactions().filter(z => z.subcatName == "uncategorized" && (z.catName == "other" || z.catName == "income")).length);
    }

    barClicked(event: Date | undefined) {
        this.donutCurrentDate = event;
    }

    importTransactions() {
        var dialogRef = this.dialog.open(ImportTransactionsComponent, { panelClass: "dialog-xl", autoFocus: false })
    }

    fixUncategorized() {
        this.dialog.open(FixUncategorizedComponent, { panelClass: "dialog-xl", autoFocus: false })
    }

    manageRules(){
        this.dialog.open(ManageRulesComponent, { panelClass: "dialog-xl", autoFocus: false })

    }

    renameCategories(){
        this.dialog.open(RenameCategoryComponent, { panelClass: "dialog-xl", autoFocus: false })

    }
}
