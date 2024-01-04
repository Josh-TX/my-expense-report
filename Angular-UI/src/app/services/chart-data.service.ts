import { Injectable } from '@angular/core';
import { SettingsService } from "@services/settings.service";
import { CatMonthStat, CatYearStat, StatService, SubcatMonthStat, SubcatYearStat } from './stat.service';
import { getSum, groupBy } from '@services/helpers';
import { ColorSet, ThemeService } from './theme.service';
import { CategoryColorService } from './category-color.service';

export type DonutData = {
    isYearly: boolean,
    date: Date,
    outerRings: DonutDataRing[],
    innerRings: DonutDataRing[],
};
export type DonutDataRing = {
    items: DonutDataItem[]
};
export type DonutDataItem = {
    amount: number,
    label: string,
    catName: string,
    subcatName: string | undefined,
    colorSet: ColorSet
    movedToOther?: boolean | undefined,
    containsMoveToOtherCatNames?: string[] | undefined
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
    label: string,
    catName: string,
    subcatName?: string | undefined,
    amount: number,
    colorSet: ColorSet
};

@Injectable({
    providedIn: 'root'
})
export class chartDataService {

    constructor(
        private statService: StatService,
        private themeService: ThemeService,
        private settingsService: SettingsService,
        private categoryColorService: CategoryColorService,
        ) {
    }

    getMonthlyDonutData(month: Date | undefined): DonutData | null {
        if (!month) {
            month = this.statService.getCurrentMonth();
        }
        if (!month) {
            return null;
        }
        var currentMonthCatStats = this.statService.getCatStatsMonthlyInfo(month).filter(z => z.catName != "income");
        var recentCatStats = this.statService.getRecentCatStatsMonthlyInfo().filter(z => z.catName != "income");
        var currentMonthSubcatStats = this.statService.getSubcatStatsMonthlyInfo(month).filter(z => z.subcategory.catName != "income");
        var recentSubcatStats = this.statService.getRecentSubcatStatsMonthlyInfo().filter(z => z.subcategory.catName != "income");

        var outerItemCatRing: DonutDataItem[] = [];
        var outerItemSubcatRing: DonutDataItem[] = [];
        var innerItemCatRing: DonutDataItem[] = [];
        var innerItemSubcatRing: DonutDataItem[] = [];
        var theme = this.themeService.getTheme();
        for (var i = 0; i < recentCatStats.length; i++) {
            var recentCatStat = recentCatStats[i];
            var colorSet = theme.colorSets[i % theme.colorSets.length];
            if (recentCatStat.catName == "other"){
                colorSet = theme.otherColorSet;
            }
            innerItemCatRing.push({
                label: recentCatStat.catName,
                catName: recentCatStat.catName,
                subcatName: undefined,
                amount: recentCatStat.sumAmount / recentCatStat.monthCount,
                colorSet: colorSet
            });
            var currentMonthCatStat = currentMonthCatStats[i];
            outerItemCatRing.push({
                label: currentMonthCatStat.catName,
                catName: currentMonthCatStat.catName,
                subcatName: undefined,
                amount: currentMonthCatStat.sumAmount,
                colorSet: colorSet
            });
            var matchingCurrentMonthSubcatStats = currentMonthSubcatStats.filter(z => z.subcategory.catName == recentCatStat.catName);
            var matchingRecentSubcatStats = recentSubcatStats.filter(z => z.subcategory.catName == recentCatStat.catName);
            for (var j = 0; j < matchingRecentSubcatStats.length; j++){
                var recentSubcatStat = matchingRecentSubcatStats[j];
                innerItemSubcatRing.push({
                    label: recentSubcatStat.subcategory.subcatName,
                    catName: recentSubcatStat.subcategory.catName,
                    subcatName: recentSubcatStat.subcategory.subcatName,
                    amount: recentSubcatStat.sumAmount / recentSubcatStat.monthCount,
                    colorSet: colorSet
                });
                var currentMonthSubcatStat = matchingCurrentMonthSubcatStats[j];
                outerItemSubcatRing.push({
                    label: currentMonthSubcatStat.subcategory.subcatName,
                    catName: currentMonthSubcatStat.subcategory.catName,
                    subcatName: currentMonthSubcatStat.subcategory.subcatName,
                    amount: currentMonthSubcatStat.sumAmount,
                    colorSet: colorSet
                });
            }
        }

        
        var output = {
            isYearly: false,
            date: month,
            outerRings: [
                {items: outerItemCatRing},
                {items: outerItemSubcatRing},
            ],
            innerRings: [
                {items: innerItemCatRing},
                {items: innerItemSubcatRing},
            ]
        };
        this.moveExcessCategoriesToOther(output, theme.otherColorSet);
        return output;
    }

    getYearlyDonutData(year: Date | undefined): DonutData | null {
        if (!year) {
            year = this.statService.getCurrentYear();
        }
        if (!year) {
            return null;
        }
        var currentYearCatStats = this.statService.getCatYearStats().filter(z => z.year.getTime() == year!.getTime() && z.catName != "income");
        var totalCatStats = this.statService.getCatStatsYearlyInfo().filter(z => z.catName != "income");
        var currentYearSubcatStats = this.statService.getSubcatYearStats().filter(z => z.year.getTime() == year!.getTime() && z.subcategory.catName != "income");
        var totalSubcatStats = this.statService.getSubcatStatsYearlyInfo().filter(z => z.subcategory.catName != "income");
        var outerItemCatRing: DonutDataItem[] = [];
        var outerItemSubcatRing: DonutDataItem[] = [];
        var innerItemCatRing: DonutDataItem[] = [];
        var innerItemSubcatRing: DonutDataItem[] = [];
        var theme = this.themeService.getTheme();
        for (var i = 0; i < totalCatStats.length; i++) {
            var totalCatStat = totalCatStats[i];
            var colorSet = theme.colorSets[i % theme.colorSets.length];
            if (totalCatStat.catName == "other"){
                colorSet = theme.otherColorSet;
            }
            innerItemCatRing.push({
                label: totalCatStat.catName,
                catName: totalCatStat.catName,
                subcatName: undefined,
                amount: totalCatStat.sumAmount / totalCatStat.yearCount,
                colorSet: colorSet
            });
            var currentYearCatStat = currentYearCatStats[i];
            outerItemCatRing.push({
                label: currentYearCatStat.catName,
                catName: currentYearCatStat.catName,
                subcatName: undefined,
                amount: currentYearCatStat.sumAmount,
                colorSet: colorSet
            });
            var matchingCurrentYearSubcatStats = currentYearSubcatStats.filter(z => z.subcategory.catName == totalCatStat.catName);
            var matchingTotalSubcatStats = totalSubcatStats.filter(z => z.subcategory.catName == totalCatStat.catName);
            for (var j = 0; j < matchingTotalSubcatStats.length; j++){
                var totalSubcatStat = matchingTotalSubcatStats[j];
                innerItemSubcatRing.push({
                    label: totalSubcatStat.subcategory.subcatName,
                    catName: totalSubcatStat.subcategory.catName,
                    subcatName: totalSubcatStat.subcategory.subcatName,
                    amount: totalSubcatStat.sumAmount / totalSubcatStat.yearCount,
                    colorSet: colorSet
                });
                var currentYearSubcatStat = matchingCurrentYearSubcatStats[j];
                outerItemSubcatRing.push({
                    label: currentYearSubcatStat.subcategory.subcatName,
                    catName: currentYearSubcatStat.subcategory.catName,
                    subcatName: currentYearSubcatStat.subcategory.subcatName,
                    amount: currentYearSubcatStat.sumAmount,
                    colorSet: colorSet
                });
            }
        }
        var output = {
            isYearly: false,
            date: year,
            outerRings: [
                {items: outerItemCatRing},
                {items: outerItemSubcatRing},
            ],
            innerRings: [
                {items: innerItemCatRing},
                {items: innerItemSubcatRing},
            ]
        };
        this.moveExcessCategoriesToOther(output, theme.otherColorSet);
        return output;
    }

    private moveExcessCategoriesToOther(donutData: DonutData, otherColorSet: ColorSet){
        var maxCategories = this.settingsService.getSettings().maxGraphCategories;
        var ringss: DonutDataRing[][] = [donutData.innerRings, donutData.outerRings];
        for (var rings of ringss){
            if (rings[0].items.length <= maxCategories){
                continue;
            }
            var catRing = rings[0].items;
            var subcatRing = rings[1].items;
            var otherCatItem = catRing.find(z => z.catName == "other");
            var otherSubcatItems = subcatRing.filter(z => z.catName == "other");
            var removedCatNames: string[] = [];
            for (var i = maxCategories - 1; i < catRing.length; i++){
                catRing[i].colorSet = otherColorSet
                if (catRing[i].catName != "other"){
                    otherSubcatItems.push({ ...catRing[i], movedToOther: true });
                }
                removedCatNames.push(catRing[i].catName);
            }
            if (!otherCatItem){
                otherCatItem = {
                    label: "other",
                    catName: "other",
                    subcatName: undefined,
                    amount: getSum(otherSubcatItems.map(z => z.amount)),
                    colorSet: otherColorSet,
                    containsMoveToOtherCatNames: otherSubcatItems.filter(z => z.movedToOther).map(z => z.catName),
                }
            } else {
                otherCatItem.amount = getSum(otherSubcatItems.map(z => z.amount))
                otherCatItem.containsMoveToOtherCatNames = otherSubcatItems.filter(z => z.movedToOther).map(z => z.catName);
            }
            catRing = [...catRing.slice(0, maxCategories-1), otherCatItem];
            subcatRing = [...subcatRing.filter(z => !removedCatNames.includes(z.catName)), ...otherSubcatItems]
            rings[0].items = catRing;
            rings[1].items = subcatRing;
        }
    }

    getMonthlyBarData(catName: string | undefined, subcatName: string | undefined, showSubcategories: boolean) {
        var stats = (catName && subcatName) || showSubcategories
            ? this.statService.getSubcatMonthStats().filter(z => (!catName || z.subcategory.catName == catName) && (!subcatName || z.subcategory.subcatName == subcatName))
            : this.statService.getCatMonthStats().filter(z => !catName || z.catName == catName);
        var maxCategories = this.settingsService.getSettings().maxGraphCategories;
        if (!stats.length) {
            return
        }
        var dateItems: BarDateItem[] = [];
        var monthGroups = groupBy<SubcatMonthStat | CatMonthStat, Date>(stats, z => z.month);
        for (var monthGroup of monthGroups) {
            var catItems: BarCategoryItem[] = monthGroup.items.map(eitherMonthStat => {
                var catName = (<any>eitherMonthStat).subcategory
                     ? (<any>eitherMonthStat).subcategory.catName
                     : (<any>eitherMonthStat).catName;
                var subcatName = (<any>eitherMonthStat).subcategory?.subcatName
                return {
                    label: subcatName ?? catName,
                    catName: catName,
                    subcatName: subcatName,
                    amount: eitherMonthStat.sumAmount,
                    colorSet: this.categoryColorService.getColorSet(catName)
                }
            });
            if (catItems.length > maxCategories){
                catItems = [...catItems.slice(0, maxCategories - 1), {
                    label: "other",
                    catName: "other",
                    subcatName: undefined,
                    amount: getSum(catItems.slice(maxCategories - 1).map(z => z.amount)),
                    colorSet: this.categoryColorService.getColorSet("other")
                }];
            }
            dateItems.push({
                date: monthGroup.key,
                items: catItems
            });
        }
        //the bar chart displays the 1st item on the left side, but stats are sorted newest to oldest, hence the reverse:
        dateItems.reverse();
        return {
            isYearly: false,
            items: dateItems
        };
    }

    getYearlyBarData(catName: string | undefined, subcatName: string | undefined, showSubcategories: boolean) {
        var stats = (catName && subcatName) || showSubcategories
            ? this.statService.getSubcatYearStats().filter(z => (!catName || z.subcategory.catName == catName) && (!subcatName || z.subcategory.subcatName == subcatName))
            : this.statService.getCatYearStats().filter(z => !catName || z.catName == catName);
        var maxCategories = this.settingsService.getSettings().maxGraphCategories;
        if (!stats.length) {
            return
        }
        var dateItems: BarDateItem[] = [];
        var yearGroups = groupBy<SubcatYearStat | CatYearStat, Date>(stats, z => z.year);
        for (var yearGroup of yearGroups) {
            var catItems: BarCategoryItem[] = yearGroup.items.map(eitherYearStat => {
                var catName = (<any>eitherYearStat).subcategory
                     ? (<any>eitherYearStat).subcategory.catName
                     : (<any>eitherYearStat).catName;
                var subcatName = (<any>eitherYearStat).subcategory?.subcatName;
                return {
                    label: subcatName ?? catName,
                    catName: catName,
                    subcatName: subcatName,
                    amount: eitherYearStat.sumAmount,
                    colorSet: this.categoryColorService.getColorSet(catName)
                }
            });
            if (catItems.length > maxCategories){
                catItems = [...catItems.slice(0, maxCategories - 1), {
                    label: "other",
                    catName: "other",
                    subcatName: undefined,
                    amount: getSum(catItems.slice(maxCategories - 1).map(z => z.amount)),
                    colorSet: this.categoryColorService.getColorSet("other")
                }];
            }
            dateItems.push({
                date: yearGroup.key,
                items: catItems
            });
        }
        //the bar chart displays the 1st item on the left side, but stats are sorted newest to oldest, hence the reverse:
        dateItems.reverse();
        return {
            isYearly: true,
            items: dateItems
        };
    }
}
