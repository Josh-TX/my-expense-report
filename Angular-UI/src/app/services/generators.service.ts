import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { areValuesSame, getNextMonth } from './helpers';
import { TransactionService, TransactionToAdd } from './transaction.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export type StoredGenerator = {
    startMonth: Date,
    nextMonth: Date | null,
    endMonth: Date | null,
    dayOfMonth: number,
    name: string,
    amount: number,
    catName: string,
    subcatName: string
}

export type GenerationResult = {
    transactions: TransactionToAdd[];
    nextMonth: Date | null,
}

@Injectable({
    providedIn: 'root'
})
export class GeneratorsService {
    public loaded: Promise<any>;
    private _filename = "generators.json";
    private _storedGenerators:  StoredGenerator[] = [];

    constructor(
        private storageService: StorageService,
        private transactionService: TransactionService,
        private snackBar: MatSnackBar
    ) {
        this.loaded = this.storageService.retrieve(this._filename).then(data => {
            this._storedGenerators = data && Array.isArray(data) ? data : [];
            var promise = this.applyAllGenerators(true);
            if (promise){
                promise.then(trxnCount =>{
                    this.snackBar.open(`Generated and saved ${trxnCount} transaction${trxnCount == 1 ? '' : 's'}`, "", { duration: 5000 });
                })
            }
        });
    }

    getGenerators(): StoredGenerator[]{
        return this._storedGenerators.map(z => ({...z}));
    }

    addGenerator(generator: StoredGenerator): Promise<number>{
        //set the hours to 8 to reduce the chance of timezone changes causing the date to change. 
        generator.startMonth.setHours(0,0,0,0);
        if (generator.nextMonth){
            generator.nextMonth.setHours(0,0,0,0);
        }
        if (generator.endMonth){
            generator.endMonth.setHours(0,0,0,0);
        }
        this._storedGenerators.push(generator);
        var promise = this.applyAllGenerators(false);
        if (promise){ //this should always be non-null, unless the added generator doesn't produce transactions (shouldn't be possible).
            return promise;
        }
        return this.storageService.store(this._filename, this._storedGenerators).then(z => 0);
    }

    editAmount(generator: StoredGenerator, newAmount: number): Promise<any>{
        var generatorsToEdit = this._storedGenerators.filter(z => !areValuesSame(generator, z));
        generatorsToEdit.forEach(z => z.amount = newAmount);
        return this.storageService.store(this._filename, this._storedGenerators);
    }

    deleteGenerator(generator: StoredGenerator): Promise<any>{
        this._storedGenerators = this._storedGenerators.filter(z => !areValuesSame(generator, z));
        return this.storageService.store(this._filename, this._storedGenerators);
    }

    private applyAllGenerators(ignore401: boolean): Promise<number> | null{
        var generatedTrxns: TransactionToAdd[] = [];
        for(var gen of this._storedGenerators.filter(z => z.nextMonth != null)){
            var res = this.generateTransactions(gen.nextMonth!, gen.endMonth, gen.dayOfMonth, gen.name, gen.amount, gen.catName, gen.subcatName);
            if (res.transactions.length){
                generatedTrxns.push(...res.transactions);
                gen.nextMonth = res.nextMonth;
            }
        }
        if (generatedTrxns.length){
            if (ignore401){
                //if it's the hosted version that enforces a WRITE_TOKEN, and a viewer without the token loads the app
                //They could get annoying prompts talking about how it failed to save, despite the user not doing anything
                //We want to suppress these prompts for the next 5 seconds so that this doesn't happen
                this.storageService.setIgnore401(3000);
            }
            var promise1 = this.transactionService.addTransactions(generatedTrxns, "transaction generator");
            var promise2 = this.storageService.store(this._filename, this._storedGenerators);
            return Promise.all([promise1, promise2]).then(() => generatedTrxns.length);
        }
        return null;
    }


    generateTransactions(startDate: Date, endDate: Date | null, dayOfMonth: number, name: string, amount: number, catName: string, subcatName: string): GenerationResult{
        var transactions: TransactionToAdd[] = [];
        var attempts = 0;
        var now = new Date();
        endDate = endDate || now;
        //for (var curr = startDate; curr < endDate && curr < now; curr = getNextMonth(curr, dayOfMonth)){
        for (var curr = startDate; curr <= now; curr = getNextMonth(curr, dayOfMonth)){
            if (curr > endDate){
                return {
                    transactions: transactions,
                    nextMonth: null
                };
            }
            if (attempts >= 10000){
                console.error("The transaction generator would've generatored over 10000 transactions")
                transactions = [];
                break;
            }
            transactions.push({
                name: name,
                amount: amount,
                manualSubcategory: {
                    catName: catName,
                    subcatName: subcatName,
                },
                date: curr,
            })
            attempts++;
        }
        return {
            transactions: transactions,
            nextMonth: curr
        };
    }
}
