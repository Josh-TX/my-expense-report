import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    MatDialogRef,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FileDropComponent } from '../file-drop/file-drop.component';
import { MatTableModule } from '@angular/material/table';
import Papa from 'papaparse';
import { ParsedTransactionGrid, ParsedTransactionRow, parseTransactions } from './transaction-parser';
import { TransactionService, TransactionToAdd } from '@services/transaction.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SelectionModel } from '@angular/cdk/collections';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, 
        MatButtonModule, FileDropComponent, MatTableModule, MatSlideToggleModule, MatIconModule, MatCheckboxModule],
    templateUrl: './import-transactions.component.html'
})
export class ImportTransactionsComponent {
    files: File[] = [];
    private importedFiles: File[] = [];
    fileColumns = ['file name', 'file type', 'file size'];
    fileIndex: number | undefined;
    selection = new SelectionModel<ParsedTransactionRow>(true, []);

    grid: ParsedTransactionGrid | undefined;
    currentFile: File | undefined;
    duplicateRowIndexes: number[] = [];
    invalidCount: number = 0;
    duplicateCount: number = 0;
    importCount: number = 0;
    incomeCount: number = 0;
    expensesAreNegative: boolean = false;
    constructor(
        private transactionService: TransactionService,
        private dialogRef: MatDialogRef<ImportTransactionsComponent>,
        private snackBar: MatSnackBar
    ) {

    }

    addFiles(files: File[]) {
        this.files.push(...files);
    }
    formatBytes(bytes: number, decimals: number) {
        if (bytes == 0) return '0 Bytes';
        var k = 1024,
            dm = decimals || 2,
            sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    beginImport(file: File){
        this.currentFile = file;
        var config: Papa.ParseConfig = {
            complete: (results, f) => {
                if (results.errors.length) {
                    alert(`Error CSV Parsing ${file.name}`)
                    return;
                }
                var parsedGrid = parseTransactions(results.data, file.name);
                if (!parsedGrid) {
                    return;
                }
                this.showParsedGrid(parsedGrid);
            }
        };
        Papa.parse(<any>file, config)
    }


    back() {
        this.grid = undefined;
        this.currentFile = undefined;
        this.invalidCount = 0;
        this.duplicateCount = 0;
        this.importCount = 0;
        this.incomeCount = 0;
        this.selection.clear();
    }

    isImported(file: File): boolean{
        return this.importedFiles.includes(file);
    }

    removeFile(file: File){
        this.files = this.files!.filter(z => z != file);
    }

    getClass(row: ParsedTransactionRow, index: number, cell: any): string{
        if (row.invalidIndexes.length){
            return "text muted"
        } else if (this.duplicateRowIndexes.includes(index)){
            return "warning-cell";
        } else if (typeof cell == "number"){
            if ((this.expensesAreNegative && cell > 0) || (!this.expensesAreNegative && cell < 0)){
                return "success-cell";
            }
        }
        return "";
    }

    showParsedGrid(grid: ParsedTransactionGrid) {
        this.grid = grid;
        this.duplicateRowIndexes = [];
        this.invalidCount = 0;
        for (var i = 0; i < grid.rows.length; i++) {
            var row = grid.rows[i];
            if (row.invalidIndexes.length) {
                this.invalidCount++;
                continue;
            }
            var date = <Date>row.cells[grid.dateColumnIndex];
            var amount = <number>row.cells[grid.amountColumnIndex];
            var name = <string>row.cells[grid.nameColumnIndex];
            if (this.transactionService.isDuplicate(date, name, amount)) {
                this.duplicateRowIndexes.push(i);
            } else {
                this.selection.select(row);
            }
        }
        this.duplicateCount = this.duplicateRowIndexes.length;
        var rowsToImport = grid.rows.filter((row, i) => !row.invalidIndexes.length && !this.duplicateRowIndexes.includes(i));
        this.importCount = rowsToImport.length;
        var negativeAmountCount = rowsToImport.filter(z => <any>z.cells[grid!.amountColumnIndex] < 0).length;
        if (negativeAmountCount > this.importCount / 2) {
            this.expensesAreNegative = true; //since a majority of amounts are negative, auto-set this to true; 
        }
        this.incomeCount = this.expensesAreNegative ? (this.importCount - negativeAmountCount) : negativeAmountCount;
    }

    expensesAreNegativeChanged() {
        var rowsToImport = this.grid!.rows.filter((row, i) => !row.invalidIndexes.length && !this.duplicateRowIndexes.includes(i));
        var negativeAmountCount = rowsToImport.filter(z => <any>z.cells[this.grid!.amountColumnIndex] < 0).length;
        this.incomeCount = this.expensesAreNegative ? (this.importCount - negativeAmountCount) : negativeAmountCount;
    }

    importTransactions() {
        var sign = this.expensesAreNegative ? -1 : 1;
        var trxnsToAdd: TransactionToAdd[] = this.selection.selected.map(z => {
            var trxnToAdd: TransactionToAdd = {
                name: <string>z.cells[this.grid!.nameColumnIndex],
                amount: <number>z.cells[this.grid!.amountColumnIndex] * sign,
                date: <Date>z.cells[this.grid!.dateColumnIndex],
            }
            if (this.grid!.catNameColumnIndex != undefined && this.grid!.subcatNameColumnIndex != undefined){
                var manualSubcategory = {
                    catName: <string>z.cells[this.grid!.catNameColumnIndex],
                    subcatName: <string>z.cells[this.grid!.subcatNameColumnIndex],
                }
                if (manualSubcategory.catName && manualSubcategory.subcatName){
                    trxnToAdd.manualSubcategory = manualSubcategory;
                }
            }
            return trxnToAdd;
        });
        this.transactionService.addTransactions(trxnsToAdd, this.grid!.filename).then(() => {
            this.snackBar.open("Imported " + trxnsToAdd.length + " Transactions", "", { duration: 3000 });
            this.importedFiles.push(this.currentFile!);
            this.back();
        })
    }

    isNumber(value: any): value is number {
        return typeof value == "number";
    }
    isDate(value: any): value is Date {
        return typeof value == "object";
    }
}
