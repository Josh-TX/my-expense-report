import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
    MatDialogRef,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatDialog,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { getDaysInMonth, getStartOfMonth } from '@services/helpers';
import { GeneratorsService, StoredGenerator } from '@services/generators.service';
import { SubcategorySelectComponent } from '@components/subcategory-select/subcategory-select.component';
import { SubcategoryQuickselectComponent } from '@components/subcategory-select/subcategory-quickselect.component';
import { TransactionToAdd } from '@services/transaction.service';


export type GeneratorToAdd = {
    startMonth?: string | undefined,
    dayOfMonth: number,
    endMonth?: string | undefined,
    name?: string | undefined,
    amount?: number | undefined,
    catName?: string | undefined,
    subcatName?: string | undefined,
}

// type PreviewTransaction = {
//     date: Date,
//     name: string,
//     amount: number,
//     catName: string,
//     subcatName: string
// }

@Component({
    standalone: true,
    imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, FormsModule, MatInputModule,
        MatDialogClose, MatButtonModule, MatMenuModule, MatIconModule, SubcategorySelectComponent, SubcategoryQuickselectComponent],
    templateUrl: './manage-generators.component.html'
})
export class ManageGeneratorsComponent {
    isNew: boolean = false;
    generators: StoredGenerator[] = [];
    generatorToAdd?: GeneratorToAdd;

    previewTransactions: TransactionToAdd[] | null = null;
    previewMessage: string = "";

    constructor(
        private generatorService: GeneratorsService,
        private dialog: MatDialog,
        private dialogRef: MatDialogRef<ManageGeneratorsComponent>,
        private snackBar: MatSnackBar
    ) {
        this.generators = generatorService.getGenerators();
    }

    startAdd() {
        this.generatorToAdd = {
            dayOfMonth: 1
        };
        this.updatePreview();
    }

    cancelAdd(){
        this.generatorToAdd = undefined;
    }

    updatePreview() {
        this.previewTransactions = null;
        if (!this.generatorToAdd) {
            return;
        }
        if (!this.generatorToAdd.amount
            || !this.generatorToAdd.catName
            || !this.generatorToAdd.subcatName
            || !this.generatorToAdd.name
            || !this.generatorToAdd.startMonth
            || !this.generatorToAdd.dayOfMonth) {
            this.previewMessage = "Fill in all required form fields to see preview";
            return;
        }
        var now = new Date();
        var startDate = stringToDate(this.generatorToAdd.startMonth, this.generatorToAdd.dayOfMonth);
        var endDate = this.generatorToAdd.endMonth  ? stringToDate(this.generatorToAdd.endMonth, this.generatorToAdd.dayOfMonth) : null;
        if (stringToDate(this.generatorToAdd.startMonth, this.generatorToAdd.dayOfMonth!).getTime() > now.getTime()) {
            this.previewMessage = "Start Date cannot be in the future";
            return;
        }
        if (this.generatorToAdd.startMonth < '2000') {
            this.previewMessage = "Start Date must be this century";
            return;
        }
        if (this.generatorToAdd.endMonth && this.generatorToAdd.startMonth > this.generatorToAdd.endMonth) {
            this.previewMessage = "Start Date must be before end Date";
            return;
        }
        var res = this.generatorService.generateTransactions(startDate, endDate, this.generatorToAdd.dayOfMonth, this.generatorToAdd.name, 
            this.generatorToAdd.amount, this.generatorToAdd.catName, this.generatorToAdd.subcatName);
        this.previewTransactions = res.transactions;
    }

    getEndDate() {
        return stringToDate(this.generatorToAdd!.endMonth!, this.generatorToAdd!.dayOfMonth);
    }

    submitAdd() {
        if (this.previewTransactions == null || !this.generatorToAdd) {
            this.snackBar.open(`Invalid Form`, "", { panelClass: "snackbar-error", duration: 3000 });
            return;
        }
        var startDate = stringToDate(this.generatorToAdd.startMonth!, this.generatorToAdd.dayOfMonth);
        var endDate = this.generatorToAdd.endMonth  ? stringToDate(this.generatorToAdd.endMonth, this.generatorToAdd.dayOfMonth) : null;
        this.generatorService.addGenerator({
            startMonth: startDate,
            nextMonth: startDate,
            endMonth: endDate,
            dayOfMonth: this.generatorToAdd.dayOfMonth,
            name: this.generatorToAdd.name!,
            amount: this.generatorToAdd.amount!,
            catName: this.generatorToAdd.catName!,
            subcatName: this.generatorToAdd.subcatName!,
        }).then(trxnCount => {
            this.snackBar.open(`Saved new Generator along with ${trxnCount} new transactions`, "", { duration: 3000 });
        });
        this.generatorToAdd = undefined;
        this.generators = this.generatorService.getGenerators();
    }

    editAmount(generator: StoredGenerator){
        var amountStr = prompt("Enter a new Amount (this will only affect future transactions, not existing transactions)")
        if (amountStr){
            var amount = parseFloat(amountStr);
            if (amount){
                this.generatorService.editAmount(generator, amount);
                this.generators = this.generatorService.getGenerators();
            } else {
                this.snackBar.open(`invalid amount`, "", { panelClass: "snackbar-error", duration: 3000 });
            }
        }
    }

    delete(generator: StoredGenerator){
        if (confirm("delete Generator?")){            
            this.generatorService.deleteGenerator(generator);
            this.generators = this.generatorService.getGenerators();
        }
    }
}

function stringToDate(str: string, dayOfMonth: number): Date {
    var d = new Date(`${str}-01T10:00`);
    d.setDate(Math.min(getDaysInMonth(d), dayOfMonth));
    return d;
}
