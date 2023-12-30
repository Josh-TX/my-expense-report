import { Injectable } from '@angular/core';
import { Settings, SettingsService } from "@services/settings.service";
import { Transaction, TransactionService } from "@services/transaction.service";
import { StatService } from './stat.service';
import { CategoryService, Subcategory } from './category.service';
import { getSum, groupBy, getDistinct, getDistinctBySelectorFunc, areValuesSame } from '@services/helpers';

export type DonutData = {
    isYearly: boolean,
    date: Date,
    categoryItems: DonutCategoryItem[]
};
export type DonutCategoryItem = {
    catName: string,
    amount: number,
    averageAmount: number
    subcategoryItems: DonutSubcategoryItem[]
};
export type DonutSubcategoryItem = {
    subcategory: Subcategory,
    amount: number,
    averageAmount: number
};

export type BarData = {
    isYearly: boolean,
    items: BarDateItem[]
};
export type BarDateItem = {
    date: Date,
    items: BarCategoryItem[]
};
export type BarCategoryItem = {
    catName: string,
    amount: number
};

@Injectable({
    providedIn: 'root'
})
export class chartDataService {

    constructor(
        private statService: StatService) {
    }

    getMonthlyDonutData(month: Date | undefined): DonutData | null {
        if (!month) {
            month = this.statService.getCurrentMonth();
        }
        if (!month) {
            return null;
        }
        var currentCatStats = this.statService.getCatStatsMonthlyInfo(month);
        var recentCatStats = this.statService.getRecentCatStatsMonthlyInfo();
        var currentSubcatStats = this.statService.getSubcatStatsMonthlyInfo(month);
        var recentSubcatStats = this.statService.getRecentSubcatStatsMonthlyInfo();

        //filter out negative categories (negative based on recent, not necessarily current)
        var incomeCatNames = recentCatStats.filter(z => z.sumAmount < 0).map(z => z.catName);
        currentCatStats = currentCatStats.filter(z => !incomeCatNames.includes(z.catName));
        currentSubcatStats = currentSubcatStats.filter(z => !incomeCatNames.includes(z.subcategory.subcatName));
        recentSubcatStats = recentSubcatStats.filter(z => !incomeCatNames.includes(z.subcategory.subcatName));

        var catItems: DonutCategoryItem[] = [];
        for (var currentCatStat of currentCatStats){
            var catName = currentCatStat.catName;
            var recentCatStat = recentCatStats.find(z => z.catName == catName)!;
            var matchingCurrentSubcatStats = currentSubcatStats.filter(z => z.subcategory.catName == catName);
            var matchingRecentSubcatStats = recentSubcatStats.filter(z => z.subcategory.catName == catName);
            var subcatItems: DonutSubcategoryItem[] = [];
            for (var currentSubcatStat of matchingCurrentSubcatStats){
                var recentSubcatStat = matchingRecentSubcatStats.find(z => z.subcategory.subcatName == currentSubcatStat.subcategory.subcatName)!;
                subcatItems.push({
                    subcategory: currentSubcatStat.subcategory,
                    amount: currentSubcatStat.sumAmount,
                    averageAmount: recentSubcatStat.sumAmount / recentSubcatStat.monthCount
                });
            }
            catItems.push({
                catName: catName,
                amount: currentCatStat.sumAmount,
                averageAmount: recentCatStat.sumAmount / recentCatStat.monthCount,
                subcategoryItems: subcatItems
            });
        }
        return {
            isYearly: false,
            date: month,
            categoryItems: catItems
        }; 
    }

    getMonthlyBarData(){
        var stats = this.statService.getCatMonthStats();
        if (!stats.length) {
            return
        }
        var dateItems: BarDateItem[] = [];
        var monthGroups = groupBy(stats, z => z.month);
        for (var monthGroup of monthGroups){
            var catItems: BarCategoryItem[] = monthGroup.items.map(catMonthStat => ({
                catName: catMonthStat.catName,
                amount: catMonthStat.sumAmount
            }));
            dateItems.push({
                date: monthGroup.key,
                items: catItems
            });
        }
        return {
            isYearly: false,
            items: dateItems
        };
    }
}
