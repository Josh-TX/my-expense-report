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
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubcategorySelectComponent } from '@components/subcategory-select/subcategory-select.component';
import { CategoryService, Subcategory } from '@services/category.service';
import { getDistinct, getDistinctBy, getSum, sortBy } from '@services/helpers';

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, 
        MatButtonModule, MatInputModule, SubcategorySelectComponent, MatSlideToggleModule],
    templateUrl: './fix-uncategorized.component.html'
})
export class FixUncategorizedComponent {
    private catTransactions: Transaction[] = [];
    private uncatTransactions: Transaction[] = [];
    skippedTransactions: Transaction[] = [];
    currentUncatTransaction: Transaction | undefined;
    suggestionInfos: SuggestionInfo[] = [];
    currentSuggestionInfo: SuggestionInfo | undefined;
    ruleTextInput: string = "";
    isManual: boolean = false;
    finished: boolean = false;
    catNames: string[] = [];
    subcats: Subcategory[] = [];
    filteredSubcats: Subcategory[] = [];
    forExistingCatName: string | undefined;

    selectedSubcategory: Subcategory | undefined;
    isNewSubcategory: boolean | undefined;

    constructor(
        private transactionService: TransactionService,
        private categoryService: CategoryService,
        private categoryRuleService: CategoryRuleService,
        private snackBar: MatSnackBar) {
    }
    ngOnInit() {
        this.update();
    }

    private update() {
        this.ruleTextInput = "";
        this.currentUncatTransaction = undefined;
        this.selectedSubcategory = undefined;
        this.subcats = this.categoryService.getSubcategories();
        this.filteredSubcats = this.subcats;
        this.catNames = getDistinct(this.subcats.map(z => z.catName));
        var allTransactions = this.transactionService.getTransactions();
        this.catTransactions = allTransactions.filter(z => !this.isUncategorized(z));
        this.uncatTransactions = allTransactions.filter(z => this.isUncategorized(z) && !this.skippedTransactions.some(zz => zz.name == z.name));
        if (!this.uncatTransactions.length){
            this.finished = true;
            return;
        }
        this.currentUncatTransaction = this.uncatTransactions[0];
        var maxAmount = 0;
        //sort the uncategorized transactions based on the total amount that the suggested rule would match.
        for (var uncatTransaction of this.uncatTransactions){
            var bestSuggestion = this.getBestSuggestion(this.getSuggestions(uncatTransaction.name));
            var amount = getSum(bestSuggestion.matches.map(z => z.amount));
            if (amount > maxAmount){
                maxAmount = amount; 
                this.currentUncatTransaction = uncatTransaction;
            }
        }
        this.suggestionInfos = this.getSuggestions(this.currentUncatTransaction.name);
        this.selectSuggestion(this.getBestSuggestion(this.suggestionInfos));
    }

    private getSuggestions(trxnName: string): SuggestionInfo[]{
        trxnName = trxnName.replace(/^[Ss][Qq] *\* */,"")
        var suggestionStrings = getSuggestionStrings(trxnName);
        var suggestionInfos = [];
        for (var suggestionString of suggestionStrings) {
            var info: SuggestionInfo = {
                text: suggestionString,
                conflicts: this.catTransactions.filter(trxn => this.categoryRuleService.doesRuleTextMatch(trxn, suggestionString)),
                matches: this.uncatTransactions.filter(trxn => this.categoryRuleService.doesRuleTextMatch(trxn, suggestionString)),
            };
            suggestionInfos.push(info);
        }
        return suggestionInfos;
    }

    private getBestSuggestion(suggestionInfos: SuggestionInfo[]){
        var bestSuggestion = suggestionInfos[0];
        for (var i = 1; i < Math.min(3, suggestionInfos.length); i++){
            var addedText = suggestionInfos[i].text.slice(suggestionInfos[i-1].text.length);
            if (/^[A-Za-z\- ']+$/.test(addedText)){
                bestSuggestion = suggestionInfos[i];
            } else {
                break;
            }
        }
        return bestSuggestion;
    }

    isManualChange(){
        if (this.isManual){
            this.currentSuggestionInfo = undefined;
            this.ruleTextInput = "";
        } else {
            this.selectSuggestion(this.getBestSuggestion(this.suggestionInfos));
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

    back() {
        this.skippedTransactions.pop();
        this.update();
    }

    skip() {
        if (this.currentUncatTransaction){
            this.skippedTransactions.push(this.currentUncatTransaction!);
            this.update();
        }
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

    selectedSubcategoryChange(){
        this.filteredSubcats = this.subcats
        this.forExistingCatName = undefined;
        if (this.selectedSubcategory && this.selectedSubcategory.catName){
            this.filteredSubcats = this.subcats.filter(z => z.catName.toLowerCase() == this.selectedSubcategory!.catName.toLowerCase());
            if (this.filteredSubcats.length){
                this.forExistingCatName = this.selectedSubcategory.catName;
            } else {
                this.filteredSubcats = this.subcats.filter(z => z.catName.toLowerCase().includes(this.selectedSubcategory!.catName.toLowerCase()));
            }
        }
    }

    selectCatName(catName: string){
        this.selectedSubcategory = {
            catName: catName,
            subcatName: ""
        };
        this.selectedSubcategoryChange();
    }

    selectSubcat(subcat: Subcategory){
        this.selectedSubcategory = subcat;
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