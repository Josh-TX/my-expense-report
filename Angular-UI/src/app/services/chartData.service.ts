import { Injectable } from '@angular/core';
import { Settings, SettingsService } from "@services/settings.service";
import { Transaction, TransactionService } from "@services/transaction.service";
import { StatService } from './stat.service';
import { CategoryService, Subcategory } from './category.service';
import { getSum, groupBySelectorFunc, getDistinct, getDistinctBySelectorFunc, areValuesSame } from '@services/helpers';

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
        var currentCatStats = this.statService.getCatStats(month);
        if (currentCatStats.length == 1){
            return null;
        }
        var recentCatStats = this.statService.getRecentCatStats();
        var currentSubcatStats = this.statService.getSubcatStats(month);
        var recentSubcatStats = this.statService.getRecentSubcatStats();

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
}
