import { Component, Signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CategoryRule, CategoryRuleService } from '@services/category-rule.service';
import {
    MatDialogRef,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatDialog,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImportRulesComponent } from '@components/import-rules/import-rules.component';
import {MatMenuModule} from '@angular/material/menu';
import { ExportService } from '@services/export.service';
import { TransactionService } from '@services/transaction.service';
import { FixUncategorizedComponent } from '@components/fix-uncategorized/fix-uncategorized.component';
import { Subcategory } from '@services/category.service';


@Component({
    standalone: true,
    imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, FormsModule, MatInputModule,
         MatDialogClose, MatButtonModule, MatMenuModule, MatIconModule],
    templateUrl: './manage-rules.component.html'
})
export class ManageRulesComponent {
    rules: CategoryRule[] = [];
    filteredRules: CategoryRule[] = [];
    filterText: string = "";
    selectedSubcategory: Subcategory | undefined;
    isNew: boolean | undefined;
    ruleTextInput: string = "";
    uncategorizedCount$: Signal<number>;

    constructor(
        private transactionService: TransactionService,
        private categoryRuleService: CategoryRuleService,
        private exportService: ExportService,
        private dialog: MatDialog,
        private dialogRef: MatDialogRef<ManageRulesComponent>,
        private snackBar: MatSnackBar
        ) {
        this.rules = this.categoryRuleService.getRules();
        this.filteredRules = this.rules;
        this.uncategorizedCount$ = computed(() => this.transactionService.getTransactions().filter(z => z.catName == "other" && z.subcatName == "uncategorized").length)

    }

    ruleTextChanged(){

    }

    filterTextChanged(){
        this.filteredRules = this.rules;
        if (this.filterText){
            var lower = this.filterText.toLowerCase();
            this.filteredRules = this.rules.filter(z => z.text.includes(lower) || lower.includes(z.text) || z.catName.startsWith(lower) || z.subcatName.startsWith(lower));
        }
    }

    clearFilters(){
        this.filterText = "";
        this.filterTextChanged();
    }

    startAdd(){
        this.dialogRef.close();
        var ref = this.dialog.open(FixUncategorizedComponent, { panelClass: "dialog-xl", autoFocus: false })
        ref.componentInstance.isFixingUncat = false;
    }


    isAddingNewSubcategory(){
        if (!this.selectedSubcategory || !this.selectedSubcategory.catName || !this.selectedSubcategory.subcatName){
            return false;
        }
        return this.isNew
    }

    import(){
        this.dialogRef.close();
        this.dialog.open(ImportRulesComponent, { panelClass: "dialog-xl", autoFocus: false })
    }

    fixUncategorized(){
        this.dialogRef.close();
        this.dialog.open(FixUncategorizedComponent, { panelClass: "dialog-xl", autoFocus: false })
    }

    export(){
        var rules = this.categoryRuleService.getRules();
        var headers = ["Category", "Subcategory", "Match Text"];
        var rows = rules.map(z => [z.catName, z.subcatName, z.text]);
        this.exportService.exportData([headers, ...rows],"category-rules.csv");
      }
    

    editText(rule: CategoryRule){
        var originalRuleText = rule.text;
        var result = prompt(`enter new match text that resolves to ${rule.catName} - ${rule.subcatName}`, rule.text);
        if (result == null || result.toLowerCase() == originalRuleText){
            return;
        }
        if (!result){
            this.snackBar.open("entered text was blank", "", { panelClass: "snackbar-error", duration: 3000 });
            return;
        }
        rule.text = result.toLowerCase();
        this.categoryRuleService.replaceRules(this.rules).then(() => {
            this.snackBar.open(`rule with text "${originalRuleText}" changed to "${rule.text}"`, "", {duration: 3000})
        })
    }

    moveToTop(rule: CategoryRule){
        this.rules = this.rules.filter(z => z != rule);
        this.rules.unshift(rule);
        this.categoryRuleService.replaceRules(this.rules).then(() => {
            this.snackBar.open(`rule with text "${rule.text}" moved to top`, "", {duration: 3000});
            this.filterTextChanged();
        });
    }

    moveToBottom(rule: CategoryRule){
        this.rules = this.rules.filter(z => z != rule);
        this.rules.push(rule);
        this.categoryRuleService.replaceRules(this.rules).then(() => {
            this.snackBar.open(`rule with text "${rule.text}" moved to bottom`, "", {duration: 3000});
            this.filterTextChanged();
        })
    }

    delete(rule: CategoryRule){
        this.rules = this.rules.filter(z => z != rule);
        this.categoryRuleService.replaceRules(this.rules).then(() => {
            this.snackBar.open(`rule with text "${rule.text}" deleted`, "", {duration: 3000});
            this.filterTextChanged();
        })
    }
}