import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private _settings: Settings
  constructor(private storageService: StorageService) { 
    var data = this.storageService.retrieve("settings.json");
    if (data && typeof data == "object"){
      this._settings = data;
    } else {
      this._settings = this.createDefault();
    }
  }

  getSettings(): Settings {
    return {...this._settings};
  }

  setSettings(settingsToUpdate: Partial<Settings>) {
    this._settings = {...this._settings, ...settingsToUpdate};
    this.storageService.store("settings.json", this._settings);
  }

  resetToDefault() {
    this._settings = this.createDefault();
  }
  
  private createDefault(): Settings{
    return {
      recentMonthCount: 12,
      maxCategoryColors: 4,
      requiredDaysForLatestMonth: 25,
      maxRenderTransactionRows: 2000,
      reportColorDeadZone: 5,
      reportColorHalfDeadZone: 30,
      reportColorSevereZScore: 2.5,
      useIncomeCategory: true
    };
  }
}

export type Settings = {
  recentMonthCount: number,
  maxCategoryColors: number,
  requiredDaysForLatestMonth: number,
  maxRenderTransactionRows: number,
  reportColorDeadZone: number,
  reportColorHalfDeadZone: number,
  reportColorSevereZScore: number,
  useIncomeCategory: boolean
}