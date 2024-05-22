<p align="center">
  <br>
    <img src="my-expense-report.png" height="256"/>
  <br>
</p>

# My Expense Report

An app for tracking and analyzing your personal expenses. Available as [a web app hosted on github pages](https://josh-tx.github.io/my-expense-report), a desktop app (see [releases](https://github.com/Josh-TX/my-expense-report/releases/tag/v1.0.0)), and a [docker container](https://hub.docker.com/r/joshtxdev/my-expense-report) that you can self-host.

## Where does the data come from?

This web app doesn't have any way to integrate with financial institutions directly (like Mint), so all data has to be provided by the user. That might sound tedious, however, most financial institutions have a way to export transactions to a file. If so, that file can probably be imported into the web app without any modifications. More info in the Usage Guide below

The way transactions are categorized is also a manual process. This is primarily done by creating what's called a "Category-Rule", wherein transactions are automatically assigned a category of your choice based on a text match. These category-rules can take time to set up, but once finished it'll be automatic moving forward (depending on spending habbits). More info in the Usage Guide below

## Version Differences

All 3 versions (Web, Desktop, Self-Hosted) are nearly identical, except for the manner in which they store your data. 

#### Web (AKA browser-only)

The web app stores your data in `LocalStorage`. Your data never leaves your browser, and stays on your device. The web app is a Progressive Web App, meaning that once you've loaded the app once, you'll be able to use it without an internet connection.  

The biggest downside is that your data is basically tied to that browser. If you clear site data, it may delete LocalStorage too and you'd lose your data. If github discontinues github pages (unlikely), you'd also lose your data. Fortunately, the app allows use to export Transactions and Category-Rules. Exporting is a good backup, because you can then import Transactions and Category-Rules to a different version of the app

The web app is hosted on Github Pages and available here:

[https://josh-tx.github.io/my-expense-report](https://josh-tx.github.io/my-expense-report)

#### Desktop

The desktop app is built with Electron and stores your data on your device (on windows it stores to the user's AppData/Roaming folder). The desktop app isn't signed, so your computer will likely a warn you about possible viruses when your first launch it. 

You can download the desktop app from the [releases page](https://github.com/Josh-TX/my-expense-report/releases/tag/v1.0.0)

#### Self-Hosted

The self-hosted app is a docker container that is intended to be run on your home network. It's hosted on dockerhub at [https://hub.docker.com/r/joshtxdev/my-expense-report](https://hub.docker.com/r/joshtxdev/my-expense-report)


The container runs an expressjs server that serves the web app, however, the served web app will not save to LocalStorage. Instead, your data will be saved to the expressjs server. When running the docker container, you'll need to mount a volume to the /data directory, and bind a port to the container's port 3000. Here's an example run command

```
docker run --name expenseReport -p 3000:3000 -d myVolume:/data joshtxdev/my-expense-report
```

Another feature with self-hosted is that you can require an authkey to save data (It's still readable). The idea is that even on a private LAN, you might be ok with your family viewing data but not editing. If an authkey is required, the app will prompt you for it when saving, and if you provide a valid authkey it will be saved to localStorage, basically remembering your device. To set up the authkey, just add an `authkey` environmental variable when running the container, such as

```
docker run --name expenseReport -p 3000:3000 -d myVolume:/data -e AUTHKEY=RandomlyGeneratedString joshtxdev/my-expense-report
```

### Recommended Version?

If you know how to host a docker container, I recommend the self-hosted version. Otherwise, I recommend starting with the web version, and if you like it, switch to the desktop version. Although there shouldn't be any problems with localStorage, I trust the desktop app's storage more. Fortunately, changing versions is easy. You can export your data (Transactions and Category-Rules) from any version, and then import them into a different version. 

# Usage Guide

More details about how the web-app works.

## Importing Transactions

There are 2 ways to add transactions. Import from file (csv) and manually add.

### Import from file (csv) 
This is the most common and quick way to add transactions. Most credit card providers have a way to "export" transactions to a spreadsheet file such as xlsx, ods, or csv. Ideally you can export to csv, but if not you can export it to some other format, open it in Excel, and then save as a csv. Either way, once you have a csv file, you can import it. The import process will then auto-detect which columns are the name, date, and amount column. If the auto-detected columns are wrong, try changing the header (the first row of the CSV) to "name", "date", or "amount" to help it auto-detect correctly. The import process allows "duplicates" within the same file, but will identify & de-select any duplicates transactions whose name, amount, and date matches any existing transation. This allows you to export & import a complete year of transactions even if you already imported some of those same transactions earlier. 

### manually add transactions
instead of importing from file, you can manually add a transaction via an html form. This is slow, but can be useful if you have a single cash purchase you want to enter. If you have many transactions to manually import, it might be easier to manually enter them into a spreadsheet, export as CSV, and then import from file. 


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

## Average*

Whenever the app displays a category's Average amount, there's a big caveat to that. It really should say "Recent Average" of the last N months (with a default N of 12). You can change how many months count as "Recent" in the settings. 

The reason for this behavior is that most users will want to compare their most recent month with their "normal spending", but our "normal spending" likely changes over the years as markets change and our cicumstances change (marriage, kids etc). By reducing the average to just recent months, it allows us to do more relevant comparisons. And if you don't like this behavior, just set the recent months to 99999 and it'll be a true average. 