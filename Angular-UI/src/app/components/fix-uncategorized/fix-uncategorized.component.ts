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
import {MatInputModule} from '@angular/material/input'
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatSnackBar} from '@angular/material/snack-bar';

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
  
  allCategories: string[] = [];
  filteredCategories: string[] = [];
  category: string | null = "";

  allCategoryInfos: Subcategory[] = [];
  filteredCategoryInfos: Subcategory[] = [];
  subcategoryText: string | null = "";
  selectedInfo: Subcategory | null = null;

  constructor(
    private transactionService: TransactionService, 
    private categoryService: CategoryService,
    private snackBar: MatSnackBar) {
  }
  ngOnInit() {
    this.update();
  }

  private update() {
    //this.isUpdating = true;
    //setTimeout(() => this.isUpdating = false);
    this.ruleTextInput = "";
    this.category = null;
    this.selectedInfo = null;
    this.subcategoryText = null;
    var allTransactions = this.transactionService.getTransactions();
    this.catTransactions = allTransactions.filter(z => z.catName != "");
    this.uncatTransactions = allTransactions.slice(this.skipCount).filter(z => z.catName == "");
    this.currentUncatTransaction = this.uncatTransactions[0];
    if (this.currentUncatTransaction) {
      var suggestionStrings = getSuggestionStrings(this.currentUncatTransaction.name);
      this.suggestionInfos = [];
      for (var suggestionString of suggestionStrings){
        var info: SuggestionInfo = {
          text: suggestionString,
          conflicts: this.catTransactions.filter(trxn => this.categoryService.doesRuleTextMatch(trxn, suggestionString)),
          matches: this.uncatTransactions.filter(trxn => this.categoryService.doesRuleTextMatch(trxn, suggestionString)),
        };
        this.suggestionInfos.push(info);
      }
      this.selectSuggestion(this.suggestionInfos[0]);
    }
    this.allCategoryInfos = this.categoryService.getSubcategories();
    this.allCategories = [...new Set(this.allCategoryInfos .map(z => z.catName).filter(z => z))];
    this.filteredCategories = this.allCategories;
    this.filteredCategoryInfos = this.allCategoryInfos;
  }

  selectSuggestion(suggestion: SuggestionInfo){
    this.currentSuggestionInfo = suggestion;
    this.ruleTextInput = suggestion.text;
  }

  ruleTextChanged(){
    this.currentSuggestionInfo = this.suggestionInfos.find(z => z.text.toLowerCase() == this.ruleTextInput.toLowerCase());
    if (!this.currentSuggestionInfo){
      this.currentSuggestionInfo = {
        text: this.ruleTextInput,
        conflicts: this.catTransactions.filter(trxn => this.categoryService.doesRuleTextMatch(trxn, this.ruleTextInput)),
        matches: this.uncatTransactions.filter(trxn => this.categoryService.doesRuleTextMatch(trxn, this.ruleTextInput)),
      };
    }
  }

  skip(){
    this.skipCount++;
    this.update();
  }

  submit() {
    if (!this.category){
      this.snackBar.open("no category defined", "", { panelClass: "snackbar-error", duration: 3000});
      return;
    }
    if (!this.categoryService.doesRuleTextMatch(this.currentUncatTransaction!, this.ruleTextInput)){
      this.snackBar.open("proposed rule doesn't match current transaction", "", { panelClass: "snackbar-error", duration: 3000 });
      return;
    }
    var subcategory = this.selectedInfo ? this.selectedInfo.subcatName : (this.subcategoryText ?? "");
    this.categoryService.addRules([{
      catName: this.category,
      subcatName: subcategory,
      text: this.ruleTextInput
    }]);
    this.update();
  }


  subcategoryChange(event: string | Subcategory){
    if (typeof event == "string"){
      var filter = event;
      this.filteredCategoryInfos = this.allCategoryInfos;
      if (this.category){
        this.filteredCategoryInfos = this.allCategoryInfos.filter(info => info.catName.toLowerCase() == this.category!.toLowerCase())
      }
      if (filter){
        this.filteredCategoryInfos = this.filteredCategoryInfos.filter(info => filterMatchesTarget(filter, [info.catName, info.subcatName]));
      }
    } else { //event is CategoryInfo
      this.category = event.catName;
      this.filteredCategoryInfos = [event];
      this.selectedInfo = event;
    }
  }

  categoryChange(filter: string){
    this.filteredCategories = this.allCategories.filter(z => z.toLowerCase().startsWith(filter.toLowerCase()));
    if (this.selectedInfo && filter.toLowerCase() != this.selectedInfo.catName.toLowerCase()){
      this.selectedInfo = null;
      this.subcategoryText = "";
    }
    if (filter){
      this.filteredCategoryInfos = this.allCategoryInfos.filter(info => info.catName.toLowerCase() == filter.toLowerCase());
    }
  }
  
  displayFn(info: Subcategory): string {
    return info ? info.subcatName : "";
  }
}

type SuggestionInfo = {
  text: string,
  matches: Transaction[],
  conflicts: Transaction[],
}

type StringValidator = (str: string | null) => boolean;

function getSuggestionStrings(str: string): string[]{
  var suggestions = [];
  var index = 0;
  while (true){
    var regex = new RegExp(`.{${index}}.*?\\S{2,}`);
    var result = regex.exec(str);
    if (result && result[0].length > index){
      suggestions.push(result[0]);
      index = result[0].length;
    } else {
      break;
    }
  }
  return suggestions.slice(0, 4);
}

function filterMatchesTarget(filter: string, targets: string[]): boolean{
  var filterParts = filter.split(" ");
  for(var filterPart of filterParts){
    if (!targets.some(target => target.toLowerCase().startsWith(filterPart.toLowerCase()))){
      return false;
    }
  }
  return true;
}