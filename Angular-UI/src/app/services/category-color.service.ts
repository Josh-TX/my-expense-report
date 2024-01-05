import { Injectable, WritableSignal } from '@angular/core';
import { signal,Signal, computed } from '@angular/core';
import { StatService } from './stat.service';
import { ColorSet, ThemeService } from './theme.service';
import { SettingsService } from './settings.service';

type CatColorSetMap = {[catName: string]: ColorSet }


@Injectable({
  providedIn: 'root'
})
export class CategoryColorService {

    catColorSetMap$: Signal<CatColorSetMap>;
    otherColorSet$: Signal<ColorSet>;

    constructor(
        private statService: StatService,
        private themeService: ThemeService,
        private settingsService: SettingsService,
    ) { 
        this.otherColorSet$ = computed(() => this.themeService.getTheme().otherColorSet);
        this.catColorSetMap$ = computed(() => {
            var recentCatStats = this.statService.getRecentCatStatsMonthlyInfo();
            var maxCategories = this.settingsService.getSettings().maxGraphCategories;
            var catNames = recentCatStats.map(z => z.catName).slice(0, maxCategories);
            var theme = this.themeService.getTheme();
            var map: CatColorSetMap = {};
            map["income"] = theme.incomeColorSet;
            for (var i = 0; i < catNames.length; i++){
                if (catNames[i] != "other"){
                    map[catNames[i]] = theme.colorSets[i % theme.colorSets.length];
                }
            }
            return map;
        })
    }

    getColorSet(catName: string): ColorSet {
        return this.catColorSetMap$()[catName] || this.otherColorSet$();
    }
}