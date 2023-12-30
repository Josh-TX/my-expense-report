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

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule, MatInputModule, MatAutocompleteModule],
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

    allCatNames: string[] = [];
    filteredCatNames: string[] = [];
    catNameInput: string | null = "";

    allSubcategories: Subcategory[] = [];
    filteredSubcategories: Subcategory[] = [];
    subcategoryInput: string | Subcategory | null = "";

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
        this.catNameInput = null;
        this.subcategoryInput = null;
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
        this.allSubcategories = this.categoryService.getSubcategories().filter(z => z.catName);
        this.allCatNames = [...new Set(this.allSubcategories.map(z => z.catName))];
        this.filteredCatNames = this.allCatNames;
        this.filteredSubcategories = this.allSubcategories;
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
        if (!this.catNameInput) {
            error = "category required"
        }
        if (!this.getSubcatName()) {
            error = "subcategory required"
        }
        if (!this.categoryService.doesRuleTextMatch(this.currentUncatTransaction!, this.ruleTextInput)) {
            error = "rule text doesn't match current transaction"
        }
        if (error){
            this.snackBar.open(error, "", { panelClass: "snackbar-error", duration: 3000 });
            return
        }
        this.categoryService.addRules([{
            catName: this.catNameInput!,
            subcatName: this.getSubcatName(),
            text: this.ruleTextInput
        }]);
        this.update();
    }


    subcategoryInputChange(event: string | Subcategory) {
        if (typeof event == "string") {
            var filter = event;
            this.filteredSubcategories = this.allSubcategories;
            if (this.catNameInput) {
                this.filteredSubcategories = this.allSubcategories.filter(info => info.catName.toLowerCase() == this.catNameInput!.toLowerCase())
            }
            if (filter && !(typeof this.subcategoryInput == "object")) {
                this.filteredSubcategories = this.filteredSubcategories.filter(info => filterMatchesTarget(filter, [info.catName, info.subcatName]));
            }
        } else { //event is CategoryInfo
            this.catNameInput = event.catName;
            this.filteredSubcategories = [event];
            this.subcategoryInput = event;
        }
    }

    catNameInputChange(filter: string) {
        this.filteredCatNames = this.allCatNames.filter(z => z.toLowerCase().startsWith(filter.toLowerCase()));
        if (this.subcategoryInput && typeof this.subcategoryInput == "object" && filter.toLowerCase() != this.subcategoryInput.catName.toLowerCase()) {
            this.subcategoryInput = null;
            this.subcategoryInput = "";
        }
        if (filter) {
            this.filteredSubcategories = this.allSubcategories.filter(info => info.catName.toLowerCase() == filter.toLowerCase());
        } else {
            this.filteredSubcategories = this.allSubcategories;
        }
    }

    displayFn(info: Subcategory): string {
        return info ? info.subcatName : "";
    }

    quickSelectSubcategory(subcategory: Subcategory){
        this.subcategoryInput = subcategory;
    }

    getSubcategoriesFromCatName(catName: string){
        return this.allSubcategories.filter(z => z.catName == catName);
    }

    isAddingNewSubcategory(){
        var subcatName = this.getSubcatName().toLowerCase();
        if (!subcatName || !this.catNameInput){
            return false;
        }
        return !this.allSubcategories.find(z => z.catName == this.catNameInput?.toLowerCase() && z.subcatName.toLowerCase() == subcatName);
    }

    private getSubcatName(): string {
        if (!this.subcategoryInput) {
            return "";
        }
        if (typeof this.subcategoryInput == "object") {
            return this.subcategoryInput.subcatName
        }
        return this.subcategoryInput;
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

function filterMatchesTarget(filter: string, targets: string[]): boolean {
    var filterParts = filter.split(" ");
    for (var filterPart of filterParts) {
        if (!targets.some(target => target.toLowerCase().startsWith(filterPart.toLowerCase()))) {
            return false;
        }
    }
    return true;
}