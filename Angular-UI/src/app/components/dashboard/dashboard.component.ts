import { Component, Signal, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ImportTransactionsComponent } from '@components/import-transactions/import-transactions.component';
import { FixUncategorizedComponent } from '@components/fix-uncategorized/fix-uncategorized.component';
import { CategoryDonutComponent } from '@components/category-donut/category-donut.component';
import { CategoryBarComponent } from "@components/category-bar/category-bar.component";
import { ManageRulesComponent } from '@components/manage-rules/manage-rules.component';
import { TransactionService } from '@services/transaction.service';
import { environment } from '../../../environments/environment';

@Component({
    standalone: true,
    imports: [MatCardModule, MatButtonModule, CategoryDonutComponent, CategoryBarComponent],
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
    donutCurrentDate: Date | undefined;
    uncategorizedCount$: Signal<number>;
    trxnCount$: Signal<number>;
    isSample$: Signal<boolean>;
    isHosted: boolean = environment.storageUrl != null;

    constructor(
        private dialog: MatDialog,
        private transactionService: TransactionService
        ) {
        this.trxnCount$ = computed(() => this.transactionService.getTransactions().length);
        this.isSample$ = computed(() => this.transactionService.isSampleData());
        this.uncategorizedCount$ = computed(() => this.transactionService.getTransactions().filter(z => z.catName == "other" && z.subcatName == "uncategorized").length);
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
}
