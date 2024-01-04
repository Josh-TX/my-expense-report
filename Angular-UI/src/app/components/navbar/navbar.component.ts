import { Component, effect, computed, Signal, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { LayoutModule, BreakpointObserver } from '@angular/cdk/layout';
import { MatMenuModule } from '@angular/material/menu';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { SettingsComponent } from '../settings/settings.component';
import { RouterLink, RouterModule, ActivatedRoute, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ThemeService } from '@services/theme.service';
import { TransactionService } from '@services/transaction.service';

@Component({
    selector: 'mer-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule, RouterOutlet, MatToolbarModule, MatIconModule, MatButtonModule, RouterLinkActive,
        MatTooltipModule, MatTabsModule, LayoutModule, MatMenuModule, SettingsComponent],
    templateUrl: './navbar.component.html'
})
export class NavbarComponent {
    mobileWidth: Signal<boolean> = toSignal(this.breakpointObserver.observe("(max-width: 903px)").pipe(map(z => z.matches)), { initialValue: true });
    thinNavWidth: Signal<boolean> = toSignal(this.breakpointObserver.observe("(max-width: 599px)").pipe(map(z => z.matches)), { initialValue: true });
    routePath: WritableSignal<string> = signal("null");

    dashboardActive: boolean = true;
    trxnActive: boolean = false;
    monthlyActive: boolean = false;
    yearlyActive: boolean = false;

    isHosted: boolean = environment.storageUrl != null;
    darkMode$: Signal<boolean>;
    isSampleData$: Signal<boolean>;

    constructor(
        private themeService: ThemeService,
        private breakpointObserver: BreakpointObserver,
        private transactionService: TransactionService,
        private dialog: MatDialog,
        private router: Router) {
        this.isSampleData$ = computed(() => this.transactionService.isSampleData())
        this.darkMode$ = computed(() => this.themeService.getDarkMode());
        this.router.events.pipe(filter(z => z instanceof NavigationEnd)).subscribe(z => this.routePath.set((<NavigationEnd>z).url));
    }

    openSettings() {
        var dialogRef = this.dialog.open(SettingsComponent, { autoFocus: false })
    }

    toggleTheme(){
        this.themeService.toggleDarkMode();
    }
}
