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
import { FileDropComponent } from '../file-drop/file-drop.component';
import { MatTableModule } from '@angular/material/table';
import Papa from 'papaparse';
import { ParsedTransactionGrid, parseTransactions } from './transaction-parser';
import { TransactionService, TransactionToAdd } from '@services/transaction.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule, FileDropComponent, MatTableModule, MatSlideToggleModule],
    templateUrl: './import-transactions.component.html'
})
export class ImportTransactionsComponent {
    files: File[] | undefined;
    fileColumns = ['file name', 'file type', 'file size'];
    fileIndex: number | undefined;

    currentGridIndex: number = 0;
    currentGrid: ParsedTransactionGrid | undefined;
    grids: ParsedTransactionGrid[] | undefined;
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

    processFiles(files: File[]) {
        this.files = files;
    }
    formatBytes(bytes: number, decimals: number) {
        if (bytes == 0) return '0 Bytes';
        var k = 1024,
            dm = decimals || 2,
            sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    next() {
        var parsedGrids: ParsedTransactionGrid[] = [];
        var index = 0;
        if (!this.files || !this.files.length) {
            return;
        }
        var config: Papa.ParseConfig = {
            complete: (results, f) => {
                var file = this.files![index];
                if (results.errors.length) {
                    alert(`Error CSV Parsing ${file.name}`)
                    return;
                }
                var parsedGrid = parseTransactions(results.data, file.name);
                if (!parsedGrid) {
                    return;
                }
                parsedGrids.push(parsedGrid);
                index++;
                if (index == this.files!.length) {
                    this.showParsedGrids(parsedGrids);
                } else {
                    Papa.parse(<any>this.files![index], config)
                }
            }
        };
        Papa.parse(<any>this.files[0], config)
    }

    backToStart() {
        this.files = undefined;
        this.currentGrid = undefined;
        this.grids = undefined;
    }

    showParsedGrids(grids: ParsedTransactionGrid[]) {
        this.currentGrid = grids[0];
        this.currentGridIndex = 0;
        this.grids = grids;
        this.duplicateRowIndexes = [];
        this.invalidCount = 0;
        for (var i = 0; i < this.currentGrid.rows.length; i++) {
            var row = this.currentGrid.rows[i];
            if (row.invalidIndexes.length) {
                this.invalidCount++;
                continue;
            }
            var date = <Date>row.cells[this.currentGrid.dateColumnIndex];
            var amount = <number>row.cells[this.currentGrid.amountColumnIndex];
            var name = <string>row.cells[this.currentGrid.nameColumnIndex];
            if (this.transactionService.isDuplicate(date, name, amount)) {
                this.duplicateRowIndexes.push(i);
            }
        }
        this.duplicateCount = this.duplicateRowIndexes.length;
        var rowsToImport = this.currentGrid.rows.filter((row, i) => !row.invalidIndexes.length && !this.duplicateRowIndexes.includes(i));
        this.importCount = rowsToImport.length;
        var negativeAmountCount = rowsToImport.filter(z => <any>z.cells[this.currentGrid!.amountColumnIndex] < 0).length;
        if (negativeAmountCount > this.importCount / 2) {
            this.expensesAreNegative = true; //since a majority of amounts are negative, auto-set this to true; 
        }
        this.incomeCount = this.expensesAreNegative ? (this.importCount - negativeAmountCount) : negativeAmountCount;
    }

    expensesAreNegativeChanged() {
        var rowsToImport = this.currentGrid!.rows.filter((row, i) => !row.invalidIndexes.length && !this.duplicateRowIndexes.includes(i));
        var negativeAmountCount = rowsToImport.filter(z => <any>z.cells[this.currentGrid!.amountColumnIndex] < 0).length;
        this.incomeCount = this.expensesAreNegative ? (this.importCount - negativeAmountCount) : negativeAmountCount;
    }

    importTransactions() {
        var sign = this.expensesAreNegative ? -1 : 1;
        var trxnsToAdd: TransactionToAdd[] = this.currentGrid!.rows.filter((z, i) => !z.invalidIndexes.length && !this.duplicateRowIndexes.includes(i)).map(z => {
            var trxnToAdd: TransactionToAdd = {
                name: <string>z.cells[this.currentGrid!.nameColumnIndex],
                amount: <number>z.cells[this.currentGrid!.amountColumnIndex] * sign,
                date: <Date>z.cells[this.currentGrid!.dateColumnIndex],
            }
            if (this.currentGrid!.catNameColumnIndex != undefined && this.currentGrid!.subcatNameColumnIndex != undefined){
                var manualSubcategory = {
                    catName: <string>z.cells[this.currentGrid!.catNameColumnIndex],
                    subcatName: <string>z.cells[this.currentGrid!.subcatNameColumnIndex],
                }
                if (manualSubcategory.catName && manualSubcategory.subcatName){
                    trxnToAdd.manualSubcategory = manualSubcategory;
                }
            }
            return trxnToAdd;
        });
        this.transactionService.addTransactions(trxnsToAdd, this.currentGrid!.filename)
        this.snackBar.open("Imported " + trxnsToAdd.length + " Transactions", "", { duration: 3000 });
        if (this.currentGridIndex == this.grids!.length - 1) {
            this.dialogRef.close();
        } else {
            this.currentGridIndex++;
            this.currentGrid = this.grids![this.currentGridIndex];
        }
    }

    isNumber(value: any): value is number {
        return typeof value == "number";
    }
    isDate(value: any): value is Date {
        return typeof value == "object";
    }
}
