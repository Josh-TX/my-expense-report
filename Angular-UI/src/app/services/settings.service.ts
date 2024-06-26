import { Injectable, WritableSignal, signal } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private _settings$: WritableSignal<Settings>;
    public loaded: Promise<any>;

    constructor(private storageService: StorageService) {
        this._settings$ = signal(this.createDefault());
        this.loaded = this.storageService.retrieve("settings.json").then(data => {
            if (data && typeof data == "object") {
                this._settings$.set(data);
            }
        });
    }

    getSettings(): Settings {
        return { ...this._settings$() };
    }

    setSettings(settingsToUpdate: Partial<Settings>) {
        var newSettings = { ...this._settings$(), ...settingsToUpdate };
        this._settings$.set(newSettings);
        this.storageService.store("settings.json", newSettings);
    }

    resetToDefault() {
        this._settings$.set(this.createDefault());
    }

    private createDefault(): Settings {
        return {
            recentMonthCount: 24,
            maxGraphCategories: 8,
            requiredDaysForLatestMonth: 25,
            reportColorDeadZone: 5,
            reportColorSevereZScore: 2,
        };
    }
}

export type Settings = {
    recentMonthCount: number,
    maxGraphCategories: number,
    requiredDaysForLatestMonth: number,
    reportColorDeadZone: number,
    reportColorSevereZScore: number,
}