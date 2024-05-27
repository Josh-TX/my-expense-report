import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { TransactionService } from '@services/transaction.service';
import { CategoryRuleService } from '@services/category-rule.service';
import { SettingsService } from '@services/settings.service';
import { GeneratorsService } from '@services/generators.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet, NavbarComponent],
    templateUrl: './app.component.html'
})
export class AppComponent {
    loaded: boolean = false;
    constructor(
        private _transactionService: TransactionService, 
        private _categoryRuleService: CategoryRuleService, 
        private _settingsService: SettingsService, 
        private _generatorService: GeneratorsService, 
    ){
        Promise.all([this._transactionService.loaded, this._categoryRuleService.loaded, this._settingsService.loaded, this._generatorService.loaded]).then(() => {
            this.loaded = true;
        })
    }
    
}
