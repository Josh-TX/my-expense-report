import { Injectable, WritableSignal, computed, signal, Signal, effect, untracked } from '@angular/core';
import { LocalSettingsService } from "@services/localSettings.service";

export type Theme = {
    borders: string[],
    backgrounds: string[],
    hovers: string[],
    text: string[],
    normalText: string
    mutedText: string,
}

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    //I'm using chart.js which uses <canvas>, so I can't do theme-ing exclusively via css

    private darkMode$: Signal<boolean>;
    private currentTheme$: Signal<Theme>;

    constructor(private localSettingsService: LocalSettingsService) {
        var darkModeOrUndefined$= this.localSettingsService.getValue$("darkMode");
        this.darkMode$ = computed(() => this.getDefaultDarkMode(darkModeOrUndefined$()));
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
        return this.currentTheme$();
    }

    private createLightTheme(): Theme {
        //Dutch Field Categorical Pallette
        var dutchFieldPallette = ["#e60049", "#0bb4ff", "#50e991", "#e6d800", "#9b19f5", "#ffa300", "#dc0ab4", "#b3d4ff", "#00bfa0"];
        var colors = ["#e60049", "#0bb4ff", "#50e991", "#ffa300", "#9b19f5", "#e6d800", "#dc0ab4", "#b3d4ff", "#00bfa0"];
        //colors =  ["#fd7f6f", "#7eb0d5", "#b2e061", "#bd7ebe", "#ffb55a", "#ffee65", "#beb9db", "#fdcce5", "#8bd3c7"];
        return {
            borders: colors,
            backgrounds: colors.map(z => this.getAlphaColor(z, 0.25)) ,
            hovers: colors.map(z => this.getAlphaColor(z, 0.5)),
            text: colors,
            mutedText: "#AAAAAA",
            normalText: "#444444"
        };
    }

    private createDarkTheme(): Theme { 
        var colors = ['#ff3e87', '#2bd4ff', '#50e991', '#ff8f26', '#8a5dff', '#ffff35', '#ff45ef', '#b3d4ff', '#00aebf'];
        var colors = ['#ff3e87', '#2bbeff', '#50e991', '#ff8f26', '#8a5dff', '#ffff35', '#ff81f4', '#0ac3c3', '#b3d4ff'];
        return {
            borders: colors,
            backgrounds: colors.map(z => this.getAlphaColor(z, 0.15)) ,
            hovers: colors.map(z => this.getAlphaColor(z, 0.40)),
            text: colors,
            mutedText: "#888888",
            normalText: "#FFFFFF"
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