# My Expense Report
 a free, open-source, local web-app for tracking your personal expenses.

 ## How it works
Rather than integrating with financial institutions directly, you instead export your transactions to a CSV file,
and inport the file within the web app. You can then set up category-rules to automatically assign categories and subcategories to each transaction.

There are 2 versions of the web-app: The browser-only version, and a hosted version. These versions only differ in how the data (transactions and category-rules) is stored. With the browser-only version, the data is stored via localStorage, and the data never leaves your browser. 

### Hosted Version

The hosted version stores the json strings on a server rather than localStorage. I don't have a hosted version publically available (I don't want your data), and if you find one online you probably shouldn't trust it.

(in progress)
~~To host your own instance of the web-app, the easiest method is to use the docker image. There isn't any security / authentication on it, so only host it in a private network that only you have access to. If you don't want to use docker, then you'll have to implement your own hosting solution. To do this, you'll want to update `environment.hosted.ts` to point to your server, and build the angular project with the `--configuration=hosted` flag.~~

# Usage Guide

More details about how the web-app works.

## Importing Transactions

There are 3 ways to add transactions. Import from file (csv), manually add, and auto-generated transactions

### Import from file (csv) 
This is the most common and quick way to add transactions. Most credit card providers have a way to "export" transactions to a spreadsheet file such as xlsx, ods, or csv. Ideally you can export to csv, but if not you can export it to some other format, open it in Excel, and then save as a csv. Either way, once you have a csv file, you can import it. The import process will then auto-detect which columns are the name, date, and amount column respectively. If the auto-detected columns are wrong, try changing the header (the first row of the CSV) to "name", "date", or "amount" to help it auto-detect correctly. The import process allows "duplicates" within the same file, but will identify & de-select any duplicates transactions whose name, amount, and date matches any existing transation. This allows you to export & import a complete year of transactions even if you already imported some of those same transactions earlier. 

### manually add transactions
instead of importing from file, you can manually add a transaction via a form. This is slow, but can be useful if you have a single cash purchase you want to enter. If you have many transactions to manually import, it might be easier to manually enter them into a spreadsheet, export as CSV, and then import from file. 

### auto-generate transactions
(in progress, not finished yet)

## Categories

Rather than have a pre-defined list of categories, you decide the different categories to use. The upside is that you have complete flexibility what the categories are and how transactions are assigned to it. The downside is that it takes a bit of time to get things set up. If you have any uncategorized transactions, the dashboard will have a "Fixed Uncategorized" button that makes helps assign category-rules quickly.

Note that if you assign a category, you also must assign a subcategory. 

### Assigning Categories

There are 2 ways to assign categories & subcategories: category-rules or manual categories
* A category-rule defines how transactions can automatically be assigned a category. The way it works is simple: If the transaction's name starts with or includes the test (case-insensitive), it'll assign the transaction the rule's category & subcategory. It doesn't actually store the assigned category alongside the transactions. Instead, it stores the category-rule, and the category-rule is used to compute the transaction's category each time the web-app is loaded (or after changes are made).
* A manual category just means that the category is stored alongside the transaction. Manual categories will have higher precendence than category-rules.

### Special Categories

There are 3 category names which have special behavior. Note that the category has to have this special name, not the subcategory.

#### Other

The "other" category will always be last in reports & visualizations. Uncategorized transactions will have a category of "other" and subcategory of "uncategorized". So by assigning a transaction to a category of "other", the transaction will be grouped with uncategorized transactions (unless the graph/report is grouped by subcategory, in which case they'll be separate).

There's also a limit (adjustable in the settings) for how many different categories to display within a visualization. If that limit is exceeded, those excess categories will be displayed as a subcategory of "other".

#### hidden

Transactions in the "hidden" category will be excluded from reports & visualizations. You'll still be able to view them on transactions if you toggle "show hidden transactions". This can be useful to do instead of deleting them, since the import transactions process will still warn of duplicates if a matching transaction is already hidden. 

Another advantage to the "hidden" category is that you can set up a category-rule that assigns the hidden category. This has the effect of essentially auto-deleting transactions that you import. 

#### income

All transactions with a negative amount will be automatically assigned the income category (unless they're assigned "hidden"). Think of it as a built-in category-rule with special precedence. If you have a category-rule for the "income" category, this can take precedence over the autoomatica behavior, allowing an alternate subcategory name. 

It's permissible to assign transactions with a positive amount to the "income" category, and this might be desired for work-related expenses that offset income.