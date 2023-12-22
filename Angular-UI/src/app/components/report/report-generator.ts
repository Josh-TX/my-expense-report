import { Settings } from "@services/settings.service";
import { Transaction } from "@services/transaction.service";

export type Report = {
    headerRows: ReportHeader[][]
    rows: ReportRow[]
    columns: ReportColumn[]
    averages: number[];
    totalAverage: number;
}

export type ReportHeader = {
    width: number;
    name: string;
}

export type ReportColumn = {
    category: string;
    subcategory?: string | undefined;
}

export type ReportRow = {
    date: Date;
    cells: ReportCell[];
    totalCell: ReportCell;
    extrapolated: number | null;
}

export type ReportCell = {
    amount: number;
    deviation: number;
    percent: number;
}

type SubcategoryContainer = {
    category: string,
    subcategories: string[]
}

export class ReportGenerator {

    private allTransactions: Transaction[] = [];
    private recentTransactions: Transaction[] = [];

    constructor(transactions: Transaction[], private settings: Settings) {
        this.setupAllAndRecentTransactions(transactions);
    }


    getMonthlyCategoryReport() {
        var categories = this.getCategories();
        categories.sort((z1, z2) => this.getCategoryScore(z1) - this.getCategoryScore(z2));
        var headerRows: ReportHeader[][] = [categories.map(z => ({ width: 1, name: z }))];
        var columns: ReportColumn[] = categories.map(z => ({ category: z }))
        var avgSDs = this.getColumnMonthlyAvgSDs(columns);
        var rows = this.getMonthlyRows(columns, avgSDs);
        var totalAverage = rows.reduce((a, b) => a + b.totalCell.amount, 0) / rows.length;
        if (columns.length == 1) {
            headerRows.forEach(z => z.splice(0, z.length));
            columns = [];
            avgSDs = [];
            rows.forEach(z => z.cells = []);
        }
        var report: Report = {
            headerRows: headerRows,
            rows: rows,
            columns: columns,
            averages: avgSDs.map(z => z.avg),
            totalAverage: totalAverage
        };
        return report;
    }

    getYearlyCategoryReport() {
        var categories = this.getCategories();
        categories.sort((z1, z2) => this.getCategoryScore(z1) - this.getCategoryScore(z2));
        var headerRows: ReportHeader[][] = [categories.map(z => ({ width: 1, name: z }))];
        var columns: ReportColumn[] = categories.map(z => ({ category: z }))
        var avgSDs = this.getColumnYearlyAvgSDs(columns);
        var rows = this.getYearlyRows(columns, avgSDs);
        var totalAverage = rows.reduce((a, b) => a + b.totalCell.amount, 0) / rows.length;
        if (columns.length == 1) {
            headerRows.forEach(z => z.splice(0, z.length));
            columns = [];
            avgSDs = [];
            rows.forEach(z => z.cells = []);
        }
        var report: Report = {
            headerRows: headerRows,
            rows: rows,
            columns: columns,
            averages: avgSDs.map(z => z.avg),
            totalAverage: totalAverage
        };
        return report;
    }

    getMonthlySubcategoryReport() {
        var containers = this.getSubcategoryContainers();
        containers.sort((z1, z2) => this.getCategoryScore(z1.category) - this.getCategoryScore(z2.category));
        var columns: ReportColumn[] = [];
        containers.forEach(container => {
            container.subcategories.forEach(subcategory => columns.push({
                category: container.category,
                subcategory: subcategory
            }));
        });
        var headerRows: ReportHeader[][] = [
            containers.map(z => ({ width: z.subcategories.length, name: z.category })),
            columns.map(z => ({ width: 1, name: z.subcategory! })),
        ];
        var avgSDs = this.getColumnMonthlyAvgSDs(columns);
        var rows = this.getMonthlyRows(columns, avgSDs);
        var totalAverage = rows.reduce((a, b) => a + b.totalCell.amount, 0) / rows.length;
        if (columns.length == 1) {
            headerRows.forEach(z => z.splice(0, z.length));
            columns = [];
            avgSDs = [];
            rows.forEach(z => z.cells = []);
        }
        var report: Report = {
            headerRows: headerRows,
            rows: rows,
            columns: columns,
            averages: avgSDs.map(z => z.avg),
            totalAverage: totalAverage
        };
        return report;
    }

    getYearlySubcategoryReport() {
        var containers = this.getSubcategoryContainers();
        containers.sort((z1, z2) => this.getCategoryScore(z1.category) - this.getCategoryScore(z2.category));
        var columns: ReportColumn[] = [];
        containers.forEach(container => {
            container.subcategories.forEach(subcategory => columns.push({
                category: container.category,
                subcategory: subcategory
            }));
        });
        var headerRows: ReportHeader[][] = [
            containers.map(z => ({ width: z.subcategories.length, name: z.category })),
            columns.map(z => ({ width: 1, name: z.subcategory! })),
        ];
        var avgSDs = this.getColumnYearlyAvgSDs(columns);
        var rows = this.getYearlyRows(columns, avgSDs);
        var totalAverage = rows.reduce((a, b) => a + b.totalCell.amount, 0) / rows.length;
        if (columns.length == 1) {
            headerRows.forEach(z => z.splice(0, z.length));
            columns = [];
            avgSDs = [];
            rows.forEach(z => z.cells = []);
        }
        var report: Report = {
            headerRows: headerRows,
            rows: rows,
            columns: columns,
            averages: avgSDs.map(z => z.avg),
            totalAverage: totalAverage
        };
        return report;
    }

    getCategoryScore(category: string) {
        if (!category) {
            return 0.5;
        }
        return 0;
    }

    private getMonthlyRows(columns: ReportColumn[], avgSDs: AvgSD[]): ReportRow[] {
        if (columns.length != avgSDs.length) {
            throw 'column length must match avgSDs length'
        }
        var monthYears = getMonthYearsInRange(this.allTransactions[0].trxnDate, this.allTransactions[this.allTransactions.length - 1].trxnDate);
        var monthGroups = getTransactionMonthYearGroups(monthYears, this.allTransactions);
        var monthAmounts = monthGroups.map(monthGroup => monthGroup.transactions.reduce((a, b) => a + b.amount, 0));
        var totalAvgSD = getAvgSD(monthAmounts);
        var rows = monthGroups.map(monthGroup => {
            var rowDate = new Date(monthGroup.monthYear.year, monthGroup.monthYear.month, 1);
            var rowSumAmount = monthGroup.transactions.reduce((a, b) => a + b.amount, 0);
            var columnGroups = getTransactionColumnGroups(columns, monthGroup.transactions);
            var cells: ReportCell[] = [];
            for (var i = 0; i < columns.length; i++) {
                var cellAmount = columnGroups[i].transactions.reduce((a, b) => a + b.amount, 0);
                var cell = this.getCell(cellAmount, avgSDs[i], rowSumAmount);
                cells.push(cell);
            }
            var totalCell = this.getCell(rowSumAmount, totalAvgSD, rowSumAmount);
            totalCell.percent = 0; //don't want this colored weird
            var row: ReportRow = {
                date: rowDate,
                cells: cells,
                totalCell: totalCell,
                extrapolated: null,
            };
            return row;
        })
        return rows;
    }

    private getYearlyRows(columns: ReportColumn[], avgSDs: AvgSD[]): ReportRow[] {
        if (columns.length != avgSDs.length) {
            throw 'column length must match avgSDs length'
        }
        var years = getYearsInRange(this.allTransactions[0].trxnDate, this.allTransactions[this.allTransactions.length - 1].trxnDate);
        var yearGroups = getTransactionYearGroups(years, this.allTransactions);
        var yearAmounts = yearGroups.map(yearGroup => yearGroup.transactions.reduce((prev, trxn) => prev + trxn.amount * 12 / yearGroup.monthCount, 0));
        var totalAvgSD = getAvgSD(yearAmounts);
        var rows = yearGroups.map(yearGroup => {
            var rowDate = new Date(yearGroup.year, 0, 1);
            var rowSumAmount = yearGroup.transactions.reduce((prev, trxn) => prev + trxn.amount * 12 / yearGroup.monthCount, 0);
            var columnGroups = getTransactionColumnGroups(columns, yearGroup.transactions);
            var cells: ReportCell[] = [];
            for (var i = 0; i < columns.length; i++) {
                var cellAmount = columnGroups[i].transactions.reduce((prev, trxn) => prev + trxn.amount * 12 / yearGroup.monthCount, 0);
                var cell = this.getCell(cellAmount, avgSDs[i], rowSumAmount);
                cells.push(cell); 
            }
            var totalCell = this.getCell(rowSumAmount, totalAvgSD, rowSumAmount);
            totalCell.percent = 0; //don't want this colored weird
            var row: ReportRow = {
                date: rowDate,
                cells: cells,
                totalCell: totalCell,
                extrapolated: yearGroup.monthCount == 12 ? null : yearGroup.monthCount,
            };
            return row;
        })
        return rows;
    }

    private getColumnMonthlyAvgSDs(columns: ReportColumn[]): AvgSD[] {
        var columnGroups = getTransactionColumnGroups(columns, this.recentTransactions);
        var monthYears = getMonthYearsInRange(this.allTransactions[0].trxnDate, this.allTransactions[this.allTransactions.length - 1].trxnDate);
        //I could've used this.recentTransactions, but my approach handles a gaps (months with zero transactions) better
        var recentMonthYears = monthYears.slice(0, this.settings.recentMonthCount);
        var avgSDs = columnGroups.map(columnGroup => {
            //columnGroup.transactions.sort((z1, z2) => z2.trxnDate.getTime() - z1.trxnDate.getTime());
            var monthGroups = getTransactionMonthYearGroups(recentMonthYears, columnGroup.transactions);
            var monthAmounts = monthGroups.map(monthGroup => monthGroup.transactions.reduce((a, b) => a + b.amount, 0));
            monthAmounts = monthAmounts.map(roundToCent);
            return getAvgSD(monthAmounts);
        });
        return avgSDs;
    }

    private getColumnYearlyAvgSDs(columns: ReportColumn[]): AvgSD[] {
        var columnGroups = getTransactionColumnGroups(columns, this.allTransactions);
        var years = getYearsInRange(this.allTransactions[0].trxnDate, this.allTransactions[this.allTransactions.length - 1].trxnDate);
        var avgSDs = columnGroups.map(columnGroup => {
            //columnGroup.transactions.sort((z1, z2) => z2.trxnDate.getTime() - z1.trxnDate.getTime());
            var yearGroups = getTransactionYearGroups(years, columnGroup.transactions);
            var yearAmounts = yearGroups.map(yearGroup => yearGroup.transactions.reduce((prev, trxn) => prev + trxn.amount * 12 / yearGroup.monthCount, 0));
            yearAmounts = yearAmounts.map(roundToCent);
            return getAvgSD(yearAmounts);
        });
        return avgSDs;
    }

    private getCategories(): string[] {
        var categoryMap: { [key: string]: boolean } = {};
        this.recentTransactions.forEach(z => categoryMap[z.category.toLowerCase()] = true);
        return Object.keys(categoryMap);
    }


    private getSubcategoryContainers(): SubcategoryContainer[] {
        var containers: SubcategoryContainer[] = [];
        this.recentTransactions.forEach(trxn => {
            var foundContainer = containers.find(z => z.category.toLowerCase() == trxn.category.toLowerCase());
            if (!foundContainer) {
                containers.push({
                    category: trxn.category,
                    subcategories: [trxn.subcategory]
                });
            }
            else if (!foundContainer.subcategories.some(subcat => subcat.toLowerCase() == trxn.subcategory.toLowerCase())) {
                foundContainer.subcategories.push(trxn.subcategory);
            }
        });
        return containers;
    }

    private setupAllAndRecentTransactions(transactions: Transaction[]) {
        //transactions are already sorted from recent to oldest
        if (!transactions.length) {
            return;
        }

        if (transactions[0].trxnDate.getDate() < this.settings.requiredDaysForLatestMonth) {
            var tooNewcutoff = new Date(transactions[0].trxnDate.getTime());
            //set cutoff to the 12am on the 1st of the month 
            tooNewcutoff.setHours(0, 0, 0, 0)
            tooNewcutoff.setDate(1);
            transactions = transactions.filter(z => z.trxnDate.getTime() < tooNewcutoff.getTime());
        }
        if (!transactions.length) {
            return;
        }
        this.allTransactions = transactions;
        var notRecentCutoff = new Date(transactions[0].trxnDate.getTime());
        notRecentCutoff.setHours(0, 0, 0, 0);
        notRecentCutoff.setDate(1);
        notRecentCutoff.setMonth(notRecentCutoff.getMonth() - this.settings.recentMonthCount + 1);
        this.recentTransactions = transactions.filter(z => z.trxnDate.getTime() > notRecentCutoff.getTime());
    }

    private getCell(amount: number, avgSD: AvgSD, rowSumAmount: number): ReportCell {
        if (avgSD.sd == null) {
            var severity = 0;//there was only 1 item
        } else {
            var diff = amount - avgSD.avg;
            var sign = diff > 0 ? 1 : -1;
            diff = Math.abs(diff);
            diff = Math.max(0, diff - this.settings.reportColorDeadZone);
            if (diff > this.settings.reportColorHalfDeadZone){
                diff = diff - (this.settings.reportColorHalfDeadZone / 2);
            } else {
                diff = diff / 2;
            }
            var zScore = diff / avgSD.sd;
            var severity = zScore / this.settings.reportColorSevereZScore;
            severity = Math.min(1, severity);
            severity = severity * sign;
        }
        var cell: ReportCell = {
            amount: roundToCent(amount),
            percent: amount / rowSumAmount,
            deviation: severity
        }
        return cell
    }
}

type AvgSD = {
    avg: number,
    sd: number | null
}

type TransactionColumnGroup = {
    transactions: Transaction[],
    column: ReportColumn,
}

type TransactionMonthYearGroup = {
    transactions: Transaction[],
    monthYear: MonthYear,
}

type TransactionYearGroup = {
    transactions: Transaction[],
    monthCount: number,
    year: number,
}

type MonthYear = {
    month: number,
    year: number
}

type PartialYear = {
    year: number
    monthCount: number,
}

function getTransactionColumnGroups(columns: ReportColumn[], transactions: Transaction[]): TransactionColumnGroup[] {
    var groups = columns.map(z => (<TransactionColumnGroup>{ column: z, transactions: [] }));
    transactions.forEach(transaction => {
        var group = groups.find(z => z.column.category == transaction.category && (z.column.subcategory == null || z.column.subcategory == transaction.subcategory));
        if (!group) {
            throw "transaction did not match any ReportColumns";
        }
        group.transactions.push(transaction);
    });
    return groups;
}

function getTransactionMonthYearGroups(monthYears: MonthYear[], transactions: Transaction[]): TransactionMonthYearGroup[] {
    var groups = monthYears.map(z => (<TransactionMonthYearGroup>{ monthYear: z, transactions: [] }));
    transactions.forEach(transaction => {
        var trxnMY = getMonthYear(transaction.trxnDate);
        var group = groups.find(group => group.monthYear.month == trxnMY.month && group.monthYear.year == trxnMY.year);
        if (!group) {
            throw "transaction did not match any MonthYears";
        }
        group.transactions.push(transaction);
    });
    return groups;
}

function getTransactionYearGroups(partialYears: PartialYear[], transactions: Transaction[]): TransactionYearGroup[] {
    var groups = partialYears.map(z => (<TransactionYearGroup>{
        year: z.year,
        transactions: [],
        monthCount: z.monthCount
    }));
    transactions.forEach(transaction => {
        var trxnYear = transaction.trxnDate.getFullYear();
        var group = groups.find(group => group.year == trxnYear);
        if (!group) {
            throw "transaction did not match any years";
        }
        group.transactions.push(transaction);
    });
    return groups;
}

function getAvgSD(nums: number[]): AvgSD {
    if (!nums.length) {
        return { avg: 0, sd: 100 };
    }
    var n = nums.length
    var mean = nums.reduce((a, b) => a + b, 0) / n
    if (nums.length == 1) {
        return { avg: mean, sd: null };
    }
    var sd = Math.sqrt(nums.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
    return { avg: mean, sd: sd };
}


function getYearsInRange(newestDate: Date, oldestDate: Date): PartialYear[] {
    var monthYears = getMonthYearsInRange(newestDate, oldestDate);
    if (oldestDate.getDate() <= 5 || (oldestDate.getMonth() == 0 && oldestDate.getDate() <= 15)) {
        //the oldest monthYears is complete enough... or it's january. Either way don't remove the oldest
    } else {
        //the oldest monthYears is a partial month, so to make extrapolations more accurate we remove that month
        monthYears.pop();
    }
    //there's probably a smarter way to do this, but I'm lazy
    var partialYears: PartialYear[] = [];
    for (var monthYear of monthYears) {
        var partialYear = partialYears.find(z => z.year == monthYear.year);
        if (partialYear) {
            partialYear.monthCount++;
        } else {
            partialYears.push({
                year: monthYear.year,
                monthCount: 1
            })
        }
    }
    return partialYears;
}


function getMonthYearsInRange(newestDate: Date, oldestDate: Date): MonthYear[] {
    var newest = getMonthYear(newestDate);
    var oldest = getMonthYear(oldestDate);
    var output: MonthYear[] = [];
    var current = newest;
    while (true) {
        output.push({ ...current });
        current.month--;
        if (current.month < 0) {
            current.year--;
            current.month = 11;
        }
        if (current.year < oldest.year || (current.year == oldest.year && current.month < oldest.month)) {
            break;
        }
    }
    return output;
}

function getMonthYear(date: Date): MonthYear {
    return {
        month: date.getMonth(),
        year: date.getFullYear()
    };
}

function roundToCent(num: number): number{
    return Math.round(num * 100) / 100;
}