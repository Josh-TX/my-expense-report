import { Injectable, WritableSignal } from '@angular/core';
import { signal,Signal, computed } from '@angular/core';

export type LocalSettings = {
    darkMode?: boolean | undefined,
    reportSubcat?: boolean | undefined,
    reportAverages?: boolean | undefined,
    trxnsPageSize?: number | undefined,
    largeGraph?: boolean | undefined,
    writeToken?: string | undefined,
    readToken?: string | undefined,
}

@Injectable({
  providedIn: 'root'
})
export class LocalSettingsService {
    private localSettings: LocalSettings
    private localSettings$: WritableSignal<LocalSettings>

    constructor() { 
        var storedStr = localStorage["local-settings"];
        if (storedStr){
            this.localSettings = JSON.parse(storedStr);
        } else {
            this.localSettings = {};
        }
        this.localSettings$ = signal(this.localSettings);
    }
    setValue<K extends keyof LocalSettings>(key: K, val: LocalSettings[K]){
        this.localSettings[key] = val;
        this.localSettings$.set({...this.localSettings});
        localStorage["local-settings"] = JSON.stringify(this.localSettings);
    } 

    getValue$<K extends keyof LocalSettings>(key: K): LocalSettings[K]{
        return this.localSettings$()[key]
    }

    getValue<K extends keyof LocalSettings>(key: K): LocalSettings[K]{
        return this.localSettings[key]
    }
}