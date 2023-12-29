import { Component, ViewChild, effect } from '@angular/core';
import { Transaction, TransactionService } from '@services/transaction.service';
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { SettingsService } from '@services/settings.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatDialog } from '@angular/material/dialog';
import { EditTransactionsComponent } from '@components/edit-transactions/edit-transactions.component';
import { getSum } from '@services/helpers';


@Component({
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatInputModule, FormsModule,
        MatTableModule, MatSortModule, MatPaginatorModule, MatMenuModule, MatSelectModule],
    templateUrl: './transactions.component.html'
})
export class TransactionsComponent {
    displayedColumns = ['select', 'date', 'name', 'amount', 'category', 'subcategory', 'importedFrom', 'importedOn'] as const;
    filterTypes = ["default", "starts with", "does not contain", "greater or equal", "less or equal"] as const;
    filterableColumns = ["any", "Date", "Name", "Amount", "Category / Subcategory", "Imported From", "Imported On"] as const;
    filteredTransactions: Transaction[] = [];
    allTransactions: Transaction[] = [];
    filterText: string = "";
    selectedFilterColumn: typeof this.filterableColumns[number] = "any";
    selectedFilterType: typeof this.filterTypes[number] = "default";
    private debounceTimeoutId: any;
    debounceActive: boolean = false;
    dataSource = new MatTableDataSource<Transaction>();
    @ViewChild(MatSort, {static: true}) sort: MatSort | undefined;
    @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator | undefined;
    selection = new SelectionModel<Transaction>(true, []);

    constructor(
        private transactionService: TransactionService,
        private settingsService: SettingsService,
        private dialog: MatDialog,
    ) {
        effect(() => this.updateData(this.transactionService.getTransactions()));
     }
    ngOnInit() {
        this.dataSource.data = this.transactionService.getTransactions();
        this.dataSource.paginator = this.paginator!;
        this.dataSource.paginator.pageSize = 100;
        this.dataSource.filterPredicate = this.filterTransactions.bind(this);

        this.dataSource.sort = this.sort!;
        this.sort?.sort({ id: "date", start: "desc", disableClear: false })
        this.dataSource.sortingDataAccessor = this.sortTransaction;
    }

    private updateData(transactions: Transaction[]){
        this.dataSource.data = transactions;
        this.selection.clear();
    }

    editSelected(){
        var ref = this.dialog.open(EditTransactionsComponent, {autoFocus: false});
        ref.componentInstance.init(this.selection.selected);
    }

    onPaste(){
        //if they triple-click and paste, it often has whitespace on the end, which this removes
        setTimeout(() => {
            this.filterText = this.filterText.trim();
        })
    }

    clearFilters(){
        this.filterText = "";
        this.selectedFilterColumn = "any";
        this.selectedFilterType = "default";
        this.dataSource.filter = this.filterText;
    }
    

    filterTextChanged(){
        //this timeout operates as a debounceTime
        clearTimeout(this.debounceTimeoutId);
        this.debounceActive = true;
        this.debounceTimeoutId = setTimeout(() => {
            this.filterChanged();
        }, 500);
    }

    filterChanged(){
        clearTimeout(this.debounceTimeoutId);
        this.debounceActive = false;
        this.dataSource.filter = this.filterText.toLowerCase();
        this.selection.clear();
    }


    isAllSelected() {
        return this.dataSource.filteredData.length === this.selection.selected.length;
    }

    /** Selects all rows if they are not all selected; otherwise clear selection. */
    toggleAllRows() {
        if (this.isAllSelected()) {
            this.selection.clear();
            return;
        }

        this.selection.select(...this.dataSource.filteredData);
    }

    getTotalAmount(){
        return getSum(this.dataSource.filteredData.map(z => z.amount));
    }

    private sortTransaction(trxn: Transaction, prop: string){
        switch (prop) {
            case 'date': return trxn.date.getTime();
            case 'importedOn': return trxn.date.getTime();
            case 'amount': return trxn.amount;
            case 'category': return trxn.catName.toLowerCase();
            case 'subcategory': return trxn.subcatName.toLowerCase();
            case 'importedFrom': return trxn.importFile.toLowerCase();
            case 'name': return trxn.name.toLowerCase();
            default: return 0;
        }
    }

    private filterTransactions(trxn: Transaction, filter: string){
        filter = filter.trim();
        if (!filter){
            return true;
        }
        if (this.selectedFilterColumn == "any"){
            if (this.selectedFilterType == "does not contain"){
                return this.matchesEveryColumn(trxn, filter); 
            }
            if (this.selectedFilterType == "default"){
                var words = filter.split(/(?<!\d,) (?!\d\d?:|[ap]m)/);//don't split ImportedOn dates
                return words.every(word => this.matchesAnyColumn(trxn, word))
            }
            return this.matchesAnyColumn(trxn, filter); 
        }
        if (this.selectedFilterColumn == "Category / Subcategory"){
            if (this.selectedFilterType == "default"){
                var words = filter.split(" ");
                return words.every(word => this.stringMatches(trxn.catName.toLowerCase(), word) || this.stringMatches(trxn.subcatName.toLowerCase(), word))
            }
            if (this.selectedFilterType == "does not contain"){
                return this.stringMatches(trxn.catName.toLowerCase(), filter) && this.stringMatches(trxn.subcatName.toLowerCase(), filter)
            }
            return this.stringMatches(trxn.catName.toLowerCase(), filter) || this.stringMatches(trxn.subcatName.toLowerCase(), filter)
        }
        if (this.selectedFilterColumn == "Amount"){
            return this.amountMatches(trxn.amount, filter);
        }
        if (this.selectedFilterColumn == "Imported From"){
            return this.stringMatches(trxn.catName.toLowerCase(), filter);
        }
        if (this.selectedFilterColumn == "Date"){
            var date = new Date(filter);
            return this.dateMatches(trxn.date, date);
        }
        if (this.selectedFilterColumn == "Imported On"){
            var date = new Date(filter);
            return this.dateMatches(trxn.importDate, date);
        }
        return true;
    }

    private matchesAnyColumn(trxn: Transaction, filter: string){
        if (this.stringMatches(trxn.name.toLowerCase(), filter)
            || this.stringMatches(trxn.catName.toLowerCase(), filter)
            || this.stringMatches(trxn.subcatName.toLowerCase(), filter)
            || this.amountMatches(trxn.amount, filter)
        ){
            return true;
        }
        if (/^[$\d,]+$/.test(filter)){
            return false; //numbers can be parsed into dates, but we don't want that if it looks like an amount
        }
        var date = new Date(filter);

        if (this.dateMatches(trxn.date, date)
            || this.dateMatches(trxn.importDate, date)){
            return true
        }
        return false;
    }

    private matchesEveryColumn(trxn: Transaction, filter: string){
        if (!this.stringMatches(trxn.name.toLowerCase(), filter)
            || !this.stringMatches(trxn.catName.toLowerCase(), filter)
            || !this.stringMatches(trxn.subcatName.toLowerCase(), filter)
            || !this.amountMatches(trxn.amount, filter)
        ){
            return false;
        }
        var date = new Date(filter);
        if (!this.dateMatches(trxn.date, date)
            || !this.dateMatches(trxn.importDate, date)){
            return false
        }
        return true;
    }

    private stringMatches(trxnStr: string, filter: string): boolean{
        switch (this.selectedFilterType){
            case "default": return trxnStr.includes(filter)
            case "starts with": return trxnStr.startsWith(filter);
            case "does not contain": return !trxnStr.includes(filter)
            case "greater or equal":
            case "less or equal": return trxnStr == filter;
        }
    }

    private dateMatches(trxnDate: Date, filterDate: Date): boolean{
        if (isNaN(<any>filterDate)){
            return this.selectedFilterType == "does not contain";
        }
        switch (this.selectedFilterType){
            case "default": 
            case "starts with": return trxnDate.getTime() == filterDate.getTime();
            case "does not contain": return trxnDate.getTime() != filterDate.getTime();
            case "greater or equal": return trxnDate.getTime() <= filterDate.getTime();
            case "less or equal": return trxnDate.getTime() >= filterDate.getTime();
        }
    }

    private amountMatches(trxnAmount: number, filter: string): boolean{
        filter = filter.replace(/\$|,/, "");
        if (!/^-?\d*\.?\d{0,2}$/.test(filter)){
            return this.selectedFilterType == "does not contain";
        }
        var money = parseFloat(filter.replace(/\$|,/, ""));
        if (!money){
            return this.selectedFilterType == "does not contain";
        }
        switch (this.selectedFilterType){
            case "default": return money == trxnAmount;
            case "starts with": return trxnAmount.toString().startsWith(money.toString());
            case "does not contain": return money != trxnAmount;
            case "greater or equal": return trxnAmount >= money;
            case "less or equal": return trxnAmount <= money;
        }
    }
}
