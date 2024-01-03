import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Papa from 'papaparse';
import { FileDropComponent } from '../file-drop/file-drop.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CategoryRule, CategoryRuleService } from '@services/category-rule.service';
import {
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  standalone: true,
  imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, FormsModule, MatSlideToggleModule, MatDialogClose,MatButtonModule, FileDropComponent],
  templateUrl: './import-rules.component.html'
})
export class ImportRulesComponent {
  parsedRules: ParsedRule[] | null = null;
  invalidCount: number = 0;
  duplicateCount: number = 0;
  importCount: number = 0;
  replace: boolean = false;
  anyExistingRules: boolean = false;
  constructor(
    private categoryRuleService: CategoryRuleService,  
    private dialogRef: MatDialogRef<ImportRulesComponent>,
    private snackBar: MatSnackBar) { 
    if (categoryRuleService.getRules().length){
      this.anyExistingRules = true;
    }
  }

  processFiles(files: File[]) {
    var file = files[0];//since multiple is false, there will always be just 1
    var config: Papa.ParseConfig = {
      complete: (results, file) => {
        var headers: string[] = results.data[0];
        var errorMessage: string | null = null;
        if (results.errors.length) {
          errorMessage = `Error CSV Parsing file`
        }
        else if (!headers || headers.length < 2) {
          errorMessage = `CSV had no data`
        }
        else if (!["category", "categories"].includes(headers[0].toLowerCase())) {
          errorMessage = `1st column's header must be "category"`
        }
        else if (!["subcategory", "subcategories"].includes(headers[1].toLowerCase())) {
          errorMessage = `2nd column's header must be "subcategory"`
        } 
        else if (!results.data.some(z => z.length > 2)){
          errorMessage = `must have 3 columns for category, subcategory, and matching text`
        }
        if (errorMessage){
          alert(errorMessage);
        } else {
          this.parseRules(results.data);
        }
      }
    };
    setTimeout(() => Papa.parse(<any>file, config), 100);
  }

  backToStart(){
    this.parsedRules = null;
  }

  replaceChanged(){
    this.importCount = this.parsedRules!.filter(z => !z.invalidIndexes.length && (this.replace || !z.isDuplicate)).length;
    this.duplicateCount = this.parsedRules!.filter(z => !this.replace && z.isDuplicate).length;
  }

  import(){
    var rulesToAdd = this.parsedRules!.filter(z => !z.invalidIndexes.length && (this.replace || !z.isDuplicate))
      .map(z => <CategoryRule>{
        catName: z.catName,
        subcatName: z.subcatName,
        text: z.text
      });
    if (this.replace){
      if (!confirm("Are you sure you want to delete all existing category rules?")){
        return;
      }
      this.categoryRuleService.replaceRules(rulesToAdd);
      this.snackBar.open("replace all existing category rules with " + rulesToAdd.length + " new rules", "", { duration: 3000 });
    } else {
      this.categoryRuleService.addRules(rulesToAdd);
      this.snackBar.open("imported  " + rulesToAdd.length + " category rules", "", { duration: 3000 });
    }
    this.dialogRef.close();
  }

  parseRules(data: string[][]) {
    var rows = data.slice(1);//since the 1st row must be headers
    this.parsedRules = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.length < 3) {
        continue; //not even 3 columns?
      }
      for (var j = 0; j < 3; j++){
        row[j] = row[j] ? row[j].trim() : "";
      }
      var parsedRule: ParsedRule = {
        catName: row[0],
        subcatName: row[1],
        text: row[2],
        invalidIndexes: [],
        isDuplicate: false
      }
      for (var j = 0; j < 3; j++){
        if (!row[j])  {
          parsedRule.invalidIndexes.push(j);
        }
      }
      if (this.categoryRuleService.isDuplicate(parsedRule.text)){
        parsedRule.isDuplicate = true;
      }
      this.parsedRules.push(parsedRule);
    }
    this.invalidCount = this.parsedRules.filter(z => z.invalidIndexes.length).length;
    this.duplicateCount = this.parsedRules.filter(z => z.isDuplicate).length;
    this.importCount = this.parsedRules.filter(z => !z.invalidIndexes.length && !z.isDuplicate).length;
  }
}

type ParsedRule = {
  catName: string,
  subcatName: string,
  text: string,
  invalidIndexes: number[]
  isDuplicate: boolean;
}