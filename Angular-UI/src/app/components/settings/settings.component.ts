import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input'
import { FormsModule } from '@angular/forms';
import {
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,

} from '@angular/material/dialog';
import { Settings, SettingsService } from '@services/settings.service';

@Component({
    standalone: true,
    imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule, FormsModule, MatInputModule],
    templateUrl: './settings.component.html'
})
export class SettingsComponent {
    settings: Settings;

    constructor(private settingsService: SettingsService) {
        this.settings = settingsService.getSettings();
    }

    change() {
        this.settingsService.setSettings(this.settings);
    }

    reset() {
        this.settingsService.resetToDefault();
        this.settings = this.settingsService.getSettings();
    }
}
