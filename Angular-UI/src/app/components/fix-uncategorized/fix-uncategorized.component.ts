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
import { CategoryRuleService } from '@services/category-rule.service';
import { MatInputModule } from '@angular/material/input'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubcategorySelectComponent } from '@components/subcategory-select/subcategory-select.component';
import { Subcategory } from '@services/category.service';

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, 
        MatButtonModule, MatInputModule, SubcategorySelectComponent, MatSlideToggleModule],
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
    isManual: boolean = false;

    selectedSubcategory: Subcategory | undefined;
    isNewSubcategory: boolean | undefined;

    constructor(
        private transactionService: TransactionService,
        private categoryRuleService: CategoryRuleService,
        private snackBar: MatSnackBar) {
    }
    ngOnInit() {
        this.update();
    }

    private update() {
        this.ruleTextInput = "";
        this.selectedSubcategory = undefined;
        var allTransactions = this.transactionService.getTransactions();
        this.catTransactions = allTransactions.filter(z => !this.isUncategorized(z));
        this.uncatTransactions = allTransactions.filter(z => this.isUncategorized(z)).slice(this.skipCount);
        this.currentUncatTransaction = this.uncatTransactions[0];
        if (this.currentUncatTransaction) {
            var suggestionStrings = getSuggestionStrings(this.currentUncatTransaction.name);
            this.suggestionInfos = [];
            for (var suggestionString of suggestionStrings) {
                var info: SuggestionInfo = {
                    text: suggestionString,
                    conflicts: this.catTransactions.filter(trxn => this.categoryRuleService.doesRuleTextMatch(trxn, suggestionString)),
                    matches: this.uncatTransactions.filter(trxn => this.categoryRuleService.doesRuleTextMatch(trxn, suggestionString)),
                };
                this.suggestionInfos.push(info);
            }
            this.selectBestSuggestion();
        }
    }


    private selectBestSuggestion(){
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

    isManualChange(){
        if (this.isManual){
            this.currentSuggestionInfo = undefined;
            this.ruleTextInput = "";
        } else {
            this.selectBestSuggestion();
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
                conflicts: this.catTransactions.filter(trxn => this.categoryRuleService.doesRuleTextMatch(trxn, this.ruleTextInput)),
                matches: this.uncatTransactions.filter(trxn => this.categoryRuleService.doesRuleTextMatch(trxn, this.ruleTextInput)),
            };
        }
    }

    skip() {
        this.skipCount++;
        this.update();
    }

    submit() {
        var error = "";
        if (!this.isManual && !this.ruleTextInput) {
            error = "rule text required"
        }
        else if (!this.selectedSubcategory || !this.selectedSubcategory.catName) {
            error = "category required"
        }
        else if (!this.selectedSubcategory.subcatName) {
            error = "subcategory required"
        }
        else if (!this.isManual && !this.categoryRuleService.doesRuleTextMatch(this.currentUncatTransaction!, this.ruleTextInput)) {
            error = "rule text doesn't match current transaction"
        }
        if (error){
            this.snackBar.open(error, "", { panelClass: "snackbar-error", duration: 3000 });
            return
        }
        if (this.isManual){
            this.transactionService.assignManualCats([this.currentUncatTransaction!], this.selectedSubcategory!)
        } else {
            this.categoryRuleService.addRules([{
                catName: this.selectedSubcategory!.catName,
                subcatName: this.selectedSubcategory!.subcatName,
                text: this.ruleTextInput
            }]);
        }
        this.update();
    }

    isAddingNewSubcategory(){
        if (!this.selectedSubcategory || !this.selectedSubcategory.catName || !this.selectedSubcategory.subcatName){
            return false;
        }
        return this.isNewSubcategory
    }

    private isUncategorized(subcategory: Subcategory): boolean{
        return subcategory.catName == "other" && subcategory.subcatName == "uncategorized"
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