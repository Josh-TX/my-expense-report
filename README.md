# My Expense Report

An offline web app for tracking and analyzing your personal expenses. There's no login system, and all data is stored in the browser's LocalStorage. Currently hosted by github pages and available at

[https://josh-tx.github.io/my-expense-report](https://josh-tx.github.io/my-expense-report)

## How it works

Although an internet connection is needed to load the web app once, you could then disconnect your internet connection and the wep app would still function normally. The technical term for this is "Progressive Web App". Most websites can't work without internet because login information and user data is stored on one (or multiple) servers. But this app has no login information, and all data is stored in the browser's LocalStorage. Using LocalStorage to store data is some pros and cons

#### LocalStorage Pros
* Data is available without an internet connection
* Data is not residing on a server where the data can be sold or hacked
* I don't have to pay for server hosting

#### LocalStorage Cons
* Data is only accessible on a single browser
* Anyone with phsyical access to the browser (i.e. shared computer) can access the data. 
* Data is lost if the browser is uninstalled or removed
* (very unlikely) The browser could delete LocalStorage to clear up disk space.

## Hosted Version

Everything described above is talking specifically about the "Browser-Only" version of the web app. If you want the web app to be accessible from multiple devices, you can host a docker container that serves a "Hosted" version of the web app. The hosted version still doesn't have a login system, but the data will be stored in the docker container rather than in LocalStorage. Because there's no login system, you should only host this version on a private LAN that only you or your family has access to. Obviously, the Hosted version requires a network connection to the docker container to function correctly. 

## Where does the data come from?

This web app doesn't have any way to integrate with financial institutions directly (like Mint), so all data has to be provided by the user. That might sound tedious, however, most financial institutions have a way to export transactions to a file. If so, that file can probably be imported into the web app without any modifications. More info in the Usage Guide below

The way transactions are categorized is also a manual process. There are very few built-in categories, and there's no Merchent Category Codes. What it does have though, is what's called a "Category-Rule", wherein transactions are automatically assigned a category of your choice based on a text match. These category-rules can take time to set up, but once finished it'll be 95% automatic (depending on spending habbits). More info in the Usage Guide below

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

Subcategories are required. They will always be contextually alongside their corresponding category, so you don't have to repeat the category name within the subcategory name. For example, the "car" category might have a subcategory of "gas" or "Insurance". Even though you might have a "health" > "insurance" or "utilities" > "gas" subcategories, it's ok since you'll never see the "gas" subcategory in isolation.

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