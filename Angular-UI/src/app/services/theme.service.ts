import { Injectable, WritableSignal, computed, signal, Signal, effect, untracked } from '@angular/core';
import { LocalSettingsService } from "@services/local-settings.service";

export type Theme = {
    colorSets: ColorSet[],
    otherColorSet: ColorSet,
    incomeColorSet: ColorSet,
    normalText: string,
    mutedText: string,
    normalBackground: string
}

export type ColorSet = {
    border: string,
    background: string,
    hover: string,
    text: string
}

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    //I'm using chart.js which uses <canvas>, so I can't do theme-ing exclusively via css

    private darkMode$: Signal<boolean>;
    private currentTheme$: Signal<Theme>;

    constructor(private localSettingsService: LocalSettingsService) {
        this.darkMode$ = computed(() => this.getDefaultDarkMode(this.localSettingsService.getValue$("darkMode")));
        this.currentTheme$ = computed(() => this.darkMode$() ? this.createDarkTheme() : this.createLightTheme());
        effect(() => this.updateCSS(this.darkMode$()));

    }

    toggleDarkMode() {
        this.localSettingsService.setValue("darkMode", !this.darkMode$());
    }

    getDarkMode(): boolean {
        return this.darkMode$();
    }

    getTheme(): Theme {
        var baseTheme = this.currentTheme$();
        return baseTheme;
        // var notGrayColorCount = Math.min(8, colorCount - (hasOther ? 1 : 0))
        // var copy: Theme = {
        //     colorSets: baseTheme.colorSets.slice(0, notGrayColorCount),
        //     mutedText: baseTheme.mutedText,
        //     normalText: baseTheme.normalText,
        //     normalBackground: baseTheme.normalBackground
        // }
        // if (hasOther){
        //     copy.colorSets.push(baseTheme.colorSets[8]);
        // }
        // return copy;
    }

    private createLightTheme(): Theme {
        var colors = [
            "#e60049", //red
            "#0077fd", //blue
            "#00bb4f", //green
            "#9119f5", //purple
            "#f09900", //orange
            "#00bfb7", //turquoise
            "#dc0acd", //magenta
            "#c7c100", //yellow
            "#777777"  //gray
        ];
        var texts = colors.slice(0);
        texts[8] = "#606060";
        var colorSets: ColorSet[] = [];
        for (var i = 0; i < colors.length; i++){
            colorSets.push({
                border: colors[i],
                background: this.getAlphaColor(colors[i], 0.25),
                hover: this.getAlphaColor(colors[i], 0.5),
                text: texts[i]
            })
        }
        var theme: Theme = {
            colorSets: colorSets.slice(0,8),
            otherColorSet: colorSets[8],
            incomeColorSet: {
                border: "#072207",
                background: "#009d43",
                hover: "#286428",
                text: "#286428"
            },
            mutedText: "#AAAAAA",
            normalText: "#444444",
            normalBackground: "#FFFFFF"
        };
        return theme;
    }

    private createDarkTheme(): Theme { 
        var colors = [
            '#ff5271', //red
            '#51a3ff', //blue
            '#50e991', //green
            '#9269ff', //purple
            '#ff9b3e', //orange
            '#0ac3c3', //turquoise
            '#ff81f4', //pink
            '#ffff35', //yellow
            '#cccccc', //gray
        ];
        var colorSets: ColorSet[] = [];
        for (var i = 0; i < colors.length; i++){
            colorSets.push({
                border: colors[i],
                background: this.getAlphaColor(colors[i], 0.25),
                hover: this.getAlphaColor(colors[i], 0.5),
                text: colors[i],
            })
        }
        return {
            colorSets: colorSets.slice(0,8),
            otherColorSet: colorSets[8],
            incomeColorSet: {
                border: "#072207",
                background: "#286428",
                hover: "#174317",
                text: "#286428"
            },
            mutedText: "#888888",
            normalText: "#FFFFFF",
            normalBackground: "#303030"
        };
    }

    private getAlphaColor(color: string, opacity: number): string{
        var byte = Math.round(255 * opacity);
        return color + byte.toString(16).padStart(2, '0');
    }

    //I might delete later, but this is helpful
    private changeColor(color: string, change: number): string{
        var parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        var r = parseInt(parsed![1], 16);
        var g = parseInt(parsed![2], 16);
        var b = parseInt(parsed![3], 16);
        if (change > 0){
            var avgDiff = ((255 * 3) - (r + g + b)) / 3
            r = Math.min(255, r + avgDiff * change);
            g = Math.min(255, g + avgDiff * change);
            b = Math.min(255, b + avgDiff * change);
        }
        if (change < 0){
            r = 0 + r * (1 + change);
            g = 0 + g * (1 - change);
            b = 0 + b * (1 - change);
        }
        var result = Math.round(r).toString(16).padStart(2, '0')
            + Math.round(g).toString(16).padStart(2, '0')
            + Math.round(b).toString(16).padStart(2, '0');
        return "#" + result;
    }

    private getDefaultDarkMode(darkMode: boolean | undefined): boolean{
        if (darkMode == null){
            darkMode = false
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                darkMode = true;
            }
        }
        return darkMode;
    }

    private updateCSS(darkMode: boolean){
        var themeName = darkMode ? 'dark' : 'light';
        var filename = `${themeName}-theme.css`;
        var link = document.getElementById("css-theme");
        link?.setAttribute("href", filename);
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }
}