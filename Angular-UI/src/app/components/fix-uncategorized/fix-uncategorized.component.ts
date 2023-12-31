import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,

} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TransactionService, Transaction } from '@services/transaction.service';
import { Subcategory, CategoryService } from '@services/category.service';
import { MatInputModule } from '@angular/material/input'
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubcategorySelectComponent } from '@components/subcategory-select/subcategory-select.component';

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, 
        MatButtonModule, MatInputModule, SubcategorySelectComponent],
    templateUrl: './fix-uncategorized.component.html'
})
export class FixUncategorizedComponent {
    private skipCount: number = 0;
    private catTransactions: Transaction[] = [];
    private uncatTransactions: Transaction[] = [];
    currentUncatTransaction: Transaction | undefined;
    suggestionInfos: SuggestionInfo[] = [];
    currentSuggestionInfo: SuggestionInfo | undefined;
    ruleTextInput: string = "";
    isUpdating: boolean = false;

    selectedSubcategory: Subcategory | undefined;
    isNewSubcategory: boolean | undefined;

    constructor(
        private transactionService: TransactionService,
        private categoryService: CategoryService,
        private snackBar: MatSnackBar) {
    }
    ngOnInit() {
        this.update();
    }

    private update() {
        this.ruleTextInput = "";
        this.selectedSubcategory = undefined;
        var allTransactions = this.transactionService.getTransactions();
        this.catTransactions = allTransactions.filter(z => !this.categoryService.isUncategorized(z));
        this.uncatTransactions = allTransactions.filter(z => this.categoryService.isUncategorized(z)).slice(this.skipCount);
        this.currentUncatTransaction = this.uncatTransactions[0];
        if (this.currentUncatTransaction) {
            var suggestionStrings = getSuggestionStrings(this.currentUncatTransaction.name);
            this.suggestionInfos = [];
            for (var suggestionString of suggestionStrings) {
                var info: SuggestionInfo = {
                    text: suggestionString,
                    conflicts: this.catTransactions.filter(trxn => this.categoryService.doesRuleTextMatch(trxn, suggestionString)),
                    matches: this.uncatTransactions.filter(trxn => this.categoryService.doesRuleTextMatch(trxn, suggestionString)),
                };
                this.suggestionInfos.push(info);
            }
            this.selectSuggestion(this.suggestionInfos[0]);
            for (var i = 1; i < this.suggestionInfos.length; i++){
                var addedText = this.suggestionInfos[i].text.slice(this.suggestionInfos[i-1].text.length);
                if (/^[A-Za-z\- ']+$/.test(addedText)){
                    this.selectSuggestion(this.suggestionInfos[i]);
                } else {
                    break;
                }
            }
        }
    }

    selectSuggestion(suggestion: SuggestionInfo) {
        this.currentSuggestionInfo = suggestion;
        this.ruleTextInput = suggestion.text;
    }

    ruleTextChanged() {
        this.currentSuggestionInfo = this.suggestionInfos.find(z => z.text.toLowerCase() == this.ruleTextInput.toLowerCase());
        if (!this.currentSuggestionInfo) {
            this.currentSuggestionInfo = {
                text: this.ruleTextInput,
                conflicts: this.catTransactions.filter(trxn => this.categoryService.doesRuleTextMatch(trxn, this.ruleTextInput)),
                matches: this.uncatTransactions.filter(trxn => this.categoryService.doesRuleTextMatch(trxn, this.ruleTextInput)),
            };
        }
    }

    skip() {
        this.skipCount++;
        this.update();
    }

    submit() {
        var error = "";
        if (!this.ruleTextInput) {
            error = "rule text required"
        }
        else if (!this.selectedSubcategory || !this.selectedSubcategory.catName) {
            error = "category required"
        }
        else if (!this.selectedSubcategory.subcatName) {
            error = "subcategory required"
        }
        else if (!this.categoryService.doesRuleTextMatch(this.currentUncatTransaction!, this.ruleTextInput)) {
            error = "rule text doesn't match current transaction"
        }
        if (error){
            this.snackBar.open(error, "", { panelClass: "snackbar-error", duration: 3000 });
            return
        }
        this.categoryService.addRules([{
            catName: this.selectedSubcategory!.catName,
            subcatName: this.selectedSubcategory!.subcatName,
            text: this.ruleTextInput
        }]);
        this.update();
    }

    isAddingNewSubcategory(){
        if (!this.selectedSubcategory || !this.selectedSubcategory.catName || !this.selectedSubcategory.subcatName){
            return false;
        }
        return this.isNewSubcategory
    }
}

type SuggestionInfo = {
    text: string,
    matches: Transaction[],
    conflicts: Transaction[],
}

function getSuggestionStrings(str: string): string[] {
    var suggestions = [];
    var index = 0;
    while (true) {
        var regex = new RegExp(`.{${index}}.*?\\S{2,}`);
        var result = regex.exec(str);
        if (result && result[0].length > index) {
            suggestions.push(result[0]);
            index = result[0].length;
        } else {
            break;
        }
    }
    return suggestions.slice(0, 4);
}