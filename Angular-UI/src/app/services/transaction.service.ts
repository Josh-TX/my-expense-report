import { Injectable } from '@angular/core';
import { CategoryService } from './category.service';
import { StorageService } from './storage.service';
import { SettingsService } from './settings.service';

export type Transaction = {
  importDate: Date,
  importFile: string,

  trxnDate: Date,
  name: string,
  amount: number,

  category: string,
  subcategory: string,

  isNameModified: boolean,
  isAmountModified: boolean,
  isCategoryModified: boolean,
  isSubcategoryModified: boolean,
}

export type TransactionToAdd = {
  trxnDate: Date,
  name: string,
  amount: number,
}

type Filter = (trxn: Transaction) => boolean;

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private storedTransactions: StoredTransaction[] = [];
  constructor(
    private categoryService: CategoryService,
    private storageService: StorageService,
    private settingsService: SettingsService
    ) {
    var data = this.storageService.retrieve("transactions.json");
    if (data && Array.isArray(data)){
      this.storedTransactions = data
    }
  }

  addTransactions(trxns: TransactionToAdd[], filename: string) {
    var importDate = new Date();
    for (var trxn of trxns) {
      var storedTrxn = <StoredTransaction>{
        ...trxn,
        importDate: importDate,
        importFile: filename
      };
      this.storedTransactions.push(storedTrxn);
    }
    this.storageService.store("transactions.json", this.storedTransactions);
  }

  isDuplicate(date: Date, name: string, amount: number) {
    return this.storedTransactions.some(z => z.trxnDate.getTime() == date.getTime() && z.amount == amount && z.name.toLowerCase() == name.toLowerCase());
  }

  getTransactions(filter: Filter | null = null): Transaction[] {
    var output: Transaction[] = [];
    var settings = this.settingsService.getSettings();
    for (var storedTrxn of this.storedTransactions) {
      var catInfo = this.categoryService.getTrxnCategoryInfo(storedTrxn, settings.useIncomeCategory);
      var outputTrxn = <Transaction>{
        importDate: storedTrxn.importDate,
        importFile: storedTrxn.importFile,

        trxnDate: storedTrxn.trxnDate,
        name: storedTrxn.modifiedName || storedTrxn.name,
        amount: storedTrxn.modifiedAmount || storedTrxn.amount,

        category: storedTrxn.modifiedCategory || catInfo.category,
        subcategory: storedTrxn.modifiedSubcategory || catInfo.subcategory,

        isNameModified: !!storedTrxn.modifiedName,
        isAmountModified: !!storedTrxn.modifiedAmount,
        isCategoryModified: !!storedTrxn.modifiedCategory,
        isSubcategoryModified: !!storedTrxn.modifiedSubcategory,
      };
      if (!filter || filter(outputTrxn)){
        output.push(outputTrxn);
      }
    }
    output.sort((z1, z2) => z2.trxnDate.getTime() - z1.trxnDate.getTime());
    return output;
  }


}

type StoredTransaction = {
  importDate: Date,
  importFile: string,
  trxnDate: Date,
  name: string,
  amount: number,
  modifiedName: string | undefined,
  modifiedAmount: number | undefined,
  modifiedCategory: string | undefined,
  modifiedSubcategory: string | undefined
}