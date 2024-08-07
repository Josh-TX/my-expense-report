export type ParsedTransactionGrid = {
    filename: string,
    headers: string[] | null,
    rows: ParsedTransactionRow[],
    nameColumnIndex: number,
    amountColumnIndex: number,
    dateColumnIndex: number,
    catNameColumnIndex: number | undefined,
    subcatNameColumnIndex: number | undefined,
}

export type ParsedTransactionRow = {
    invalidIndexes: number[],
    cells: Array<string | Date | number>
}

export function parseTransactions(rows: string[][], filename: string): ParsedTransactionGrid | void {
    if (!rows.length) {
        return;
    }
    //we don't know if all the rows are the same length
    //so when creating dataGrid, I'll force them to be the same length
    var dataGrid: DataCell[][] = [];
    var longestRow = rows.reduce((prev, currentRow) => Math.max(prev, currentRow.length), 0);
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var dataRow: DataCell[] = [];
        dataGrid.push(dataRow);
        for (var j = 0; j < longestRow; j++) {
            dataRow.push(new DataCell(row[j]));//row could be shorter than longestRow, but it still works
        }
    }
    var headers = dataGrid[0].every(z => !z.date && !z.money) ? dataGrid[0].map(z => <string>z.text) : null;
    var dataGrid = headers ? dataGrid.slice(1) : dataGrid;
    if (dataGrid[dataGrid.length - 1].every(z => !z.date && !z.money) && dataGrid.length > 3){
        dataGrid = dataGrid.slice(0, dataGrid.length - 1);
    }
    var metrics = getColumnMetrics(dataGrid);
    var colIndexes = getColumnIndexes(dataGrid.length, metrics, headers);
    var parsedRows = dataGrid.map(row => {
        var invalidIndexes: number[] = [];
        if (!row[colIndexes.name].text.length){
            invalidIndexes.push(colIndexes.name);
        }
        if (!row[colIndexes.amount].money){
            invalidIndexes.push(colIndexes.amount);
        }
        if (row[colIndexes.date].date == null){
            invalidIndexes.push(colIndexes.date);
        }
        return <ParsedTransactionRow>{
            invalidIndexes: invalidIndexes,
            cells: row.map((datacell, i) => {
                if (colIndexes.amount == i && datacell.money != null){
                    return datacell.money;
                } 
                if (colIndexes.date == i && datacell.date){
                    return datacell.date;
                }
                return datacell.text;
            })
        }
    });
    var parsedGrid = <ParsedTransactionGrid>{
        filename: filename,
        headers: headers,
        nameColumnIndex: colIndexes.name,
        dateColumnIndex: colIndexes.date,
        amountColumnIndex: colIndexes.amount,
        catNameColumnIndex: colIndexes.catName,
        subcatNameColumnIndex: colIndexes.subcatName,
        rows: parsedRows
    };
    return parsedGrid;
}

function getColumnIndexes(rowCount: number, metrics: ColumnMetric[], headers: string[] | null = null): ColumnIndexes {
    var amountScores = [];
    var dateScores = [];
    var nameScores = [];
    var catNameIndex: number | undefined;
    var subcatNameIndex: number | undefined;
    //to decide which column is the amount, date, or date, I'll use a scoring system
    //this way I can still utilize the headers to help infer which columns to use
    //but I'm not dependant on headers (some banks export files with no headers)
    for (var i = 0; i < metrics.length; i++) {
        amountScores.push(0);
        dateScores.push(0);
        nameScores.push(0);
        if (headers != null && headers[i]) {
            //date headers
            if (headers[i].toLowerCase() == "date") {
                dateScores[i] += 10;
            }
            else if (headers[i].toLowerCase().includes("date")) {
                dateScores[i] += 5;
            }
            //amount headers
            if (headers[i].toLowerCase() == "amount") {
                amountScores[i] += 10
            }
            else if (headers[i].toLowerCase().includes("amount")) {
                amountScores[i] += 5;
            } else if (headers[i].toLowerCase() == "debit") {
                amountScores[i] += 2;
            }
            else if (headers[i].toLowerCase() == "balance") {
                amountScores[i] -= 2;
            }
            //name headers
            if (headers[i].toLowerCase().includes("description")) {
                nameScores[i] += 8;
            }
            else if (headers[i].toLowerCase().includes("name")) {
                nameScores[i] += 5;
            }
            if (headers[i].toLowerCase() == "category"){
                catNameIndex = i;
            }
            if (headers[i].toLowerCase() == "subcategory"){
                subcatNameIndex = i;
            }
        }
        var metric = metrics[i];
        amountScores[i] += 6 * (metric.moneyCount / rowCount);
        dateScores[i] += 6 * (metric.dateCount / rowCount);
        //the name score is somewhat complicated, and consists of 4 factors
        var textCountFactor = (metric.textCount / rowCount);
        var letterPercentFactor = metric.textLetterPercent > 0 ? (metric.textLetterPercent / 100) : 0;
        var distinctFactor = metric.textCount > 0 ? Math.pow(metric.textDistinctCount / metric.textCount, 1.5) : 0;
        var charLengthFactor =  metric.textAvgCharCount > 30 ? 1.5 : (metric.textAvgCharCount > 20 ? 1 : (metric.textAvgCharCount > 10 ? 0.67 : 0.34));
        var addedNameScore = 20 * textCountFactor * distinctFactor * letterPercentFactor * charLengthFactor * charLengthFactor
        nameScores[i] += addedNameScore;
    }
    var colIndexes: ColumnIndexes = {
        date: dateScores.indexOf(Math.max(...dateScores)),
        amount: amountScores.indexOf(Math.max(...amountScores)),
        name: nameScores.indexOf(Math.max(...nameScores)),
        catName: subcatNameIndex != null ? catNameIndex : undefined, //don't catName without a subcatName or visa versa
        subcatName: catNameIndex != null ? subcatNameIndex : undefined,
    }
    if (colIndexes.date == colIndexes.amount
        || colIndexes.date == colIndexes.name || colIndexes.amount == colIndexes.name) {
        var err = "error parsing data... error identifying which column is which field";
        alert(err);
        throw err;
    }
    return colIndexes;
}

function getColumnMetrics(dataGrid: DataCell[][]): ColumnMetric[] {
    var metrics: ColumnMetric[] = [];
    for (var colIndex = 0; colIndex < dataGrid[0].length; colIndex++) {
        var metric: ColumnMetric = {
            dateCount: 0,
            moneyCount: 0,
            textCount: 0,
            textDistinctCount: 0,
            textAvgCharCount: 0,
            textLetterPercent: 0,//will fix after for loop
        };
        var foundText: { [text: string]: boolean } = {};
        var sumTextCharCount = 0;
        var sumTextLetterCount = 0;
        for (var rowIndex = 0; rowIndex < dataGrid.length; rowIndex++) {
            var cell = dataGrid[rowIndex][colIndex];
            metric.dateCount += cell.val instanceof Date ? 1 : 0;
            metric.moneyCount += typeof cell.val == "number" ? 1 : 0;
            if (typeof cell.val == "string" && cell.text.length) {
                metric.textCount++;
                if (!foundText[cell.text]) {
                    metric.textDistinctCount += 1;
                    foundText[cell.text] = true;
                }
                sumTextCharCount += cell.text.length;
                sumTextLetterCount += cell.letterCount!;
            }
        }
        metric.textAvgCharCount = sumTextCharCount / dataGrid.length;
        metric.textLetterPercent = sumTextLetterCount / sumTextCharCount * 100;
        metrics.push(metric);
    }
    return metrics;
}

type ColumnIndexes = {
    date: number,
    amount: number,
    name: number,
    catName: number | undefined,
    subcatName: number | undefined
}

type ColumnMetric = {
    dateCount: number,
    moneyCount: number,
    textCount: number,
    textAvgCharCount: number,
    textDistinctCount: number,
    textLetterPercent: number
}

class DataCell {
    val: Date | number | string;
    text: string;
    date: Date | undefined;
    money: number | undefined;
    letterCount: number | undefined;
    constructor(str: string | undefined) {
        this.text = "";
        this.val = "";
        if (!str || !str.trim()) {
            return;
        }
        str = str.trim();
        //string that should be money can rarely be parsed as a date (such as 681.01 gets parsed as Jan 01 0681)
        //but values that should be dates can never by parsed as money
        //therefore, by setting this.val to money after parsing dates, such overlap will be interpreted as money
        var date = new Date(str);
        if (!isNaN(<any>date)) {
            //we only display the date component, not the time component. However, we use midnight for 2 purposes
            //For duplicate-transaction detection, we assume both dates are midnight
            //when saving to storage, we check if the date is midnight, and if it is we stringify just the date portion
            date.setHours(0,0,0,0);
            this.date = date;
            this.val = date;
        }
        var isMoney = /^\$?[+-]?\$?[0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{1,2})?$/.test(str);
        if (isMoney) {
            var money = parseFloat(str.replace(/\$|,/g, ""));//remove dollars signs & commas
            if (!isNaN(money)) {
                this.money = money;
                this.val = money;
            }
        }
        this.text = str;
        this.letterCount = str.replace(/[^A-Za-z]/, "").length;
        if (!this.money && !this.date){
            this.val = str;
        }
    }
}