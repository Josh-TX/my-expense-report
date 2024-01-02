# my-expense-report
 a free, open-source, local web-app for tracking your personal expenses.

 ## How it works
Rather than integrating with financial institutions directly, you instead export your transactions to a CSV file,
and inport the file within the web app. You can then set up category-rules to automatically assign categories and subcategories to each transaction.

There are 2 versions of the web-app: The browser-only version, and a hosted version. These versions only differ in how the data (transactions and category-rules) is stored. With the browser-only version, the data is stored via localStorage, and the data never leaves your browser. The hosted version stores the json strings on the server rather than localStorage. I don't have a hosted version publically available, and if you find one online you probably shouldn't trust it. More info about the hosted version [here](./hosted-version.md).



# Usage Guides

Regardless of what version you use, you may want a more detailed, precise explanation of how things work

# Importing Transactions

There are 3 ways to add transactions. Import from file (csv), manually add, and auto-generated transactions

## Import from file (csv) 
This is the most common and quick way to add transactions. Most credit card providers have a way to "export" transactions to a spreadsheet file such as xlsx, ods, or csv. Ideally you can export to csv, but if not you can export it to some other format, open it in Excel, and then save as a csv. Either way, once you have a csv file, you can import it. The import process will then auto-detect which columns are the name, date, and amount column respectively. If the auto-detected columns are wrong, try changing the header (the first row of the CSV) to "name", "date", or "amount" to help it auto-detect correctly. The import process allows "duplicates" within the same file, but will identify & de-select any duplicates transactions whose name, amount, and date matches any existing transation. This allows you to export & import a complete year of transactions even if you already imported some of those same transactions earlier. 

## manually add transactions
instead of importing from file, you can manually add a transaction via a form. This is slow, but can be useful if you have a single cash purchase you want to enter. If you have many transactions to manually import, it might be easier to manually enter them into a spreadsheet, export as CSV, and then import from file. 

## auto-generate transactions
Feature in-progress

# Categories

## Assigning Categories
There are 3 ways to assign categories: category-rules, manual categories
* A category-rule defines how transactions can be automatically assigned transactions. We don't actually store the assigned category alongside the transactions. Instead, we store the category-rule, and use the category-rule to compute the transaction's category each time we load the app (or after changes are made).
* A manual category just means that we store the category alongside the transaction. Manual categories will have higher priority than category-rules.

During the import-transactions-from-file process, the column auto-detection also looks for columns with the headers "category" or "subcategory". When these columns are provided, it can assign a transaction a manual category. This might not be desired if you're primarily using category-rules. Therefore, the the column auto-detection also supports a "IsManualCategory" header. When this column exists, it causes transactions to NOT be assigned a manual category UNLESS the IsManualCategory cell is truthy ("true", "yes", or 1). 

## Special Categories
There are 3 category names which have special behavior
### Other
- The "other" category will always be last in reports & visualizations
- uncategorized transactions will have a category of "other" and subcategory of "uncategorized"
- if the number of categories exceeds the category limit, those excess categories will be a subcategory of "other"

### hidden
- Transactions in the "hidden" category will be excluded from reports & visualizations
- The transactions page will exclude such transactions unless you toggle "show hidden transactions"
- You can basically auto-delete transactions that you import by having a category-rule with a category of "hidden" (subcategory could be anything).

### income
- The income category gets treated slightly differently on reports and visualizations. The donut chart excludes income, and the bar chart displays a line showing the net expenses.
- all transactions with a negative amount will be automatically categorized as "income" with a subcategory of "income". Think of it as a built-in category-rule. 
- A category-rule for "hidden" or "income" can supercede the automatic "income" categorization, but normal category rules will have lower precedence and can't apply
- You can manually create a category-rule for the "income" category, and this has 2 potential purposes
  - It can provide a different subcategory name besides "income"
  - It can cause transactions with a positive amount (expenses) to be categorized as income. This can be useful if there are work-related expenses that really just offset income and shouldn't show up among the normal expense categories. 