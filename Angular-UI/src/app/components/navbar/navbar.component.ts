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
import { map } from 'rxjs/operators';
import { SettingsComponent } from '../settings/settings.component';
import { RouterLink, RouterModule, ActivatedRoute, RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ThemeService } from '@services/theme.service';

@Component({
    selector: 'mer-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule, RouterOutlet, MatToolbarModule, MatIconModule, MatButtonModule,
        MatTooltipModule, MatTabsModule, LayoutModule, MatMenuModule, SettingsComponent],
    templateUrl: './navbar.component.html'
})
export class NavbarComponent {
    mobileWidth: Signal<boolean> = toSignal(this.breakpointObserver.observe("(max-width: 903px)").pipe(map(z => z.matches)), { initialValue: true });
    thinNavWidth: Signal<boolean> = toSignal(this.breakpointObserver.observe("(max-width: 599px)").pipe(map(z => z.matches)), { initialValue: true });
    routePath: WritableSignal<string> = signal("null");
    isHosted: boolean = environment.storageUrl != null;

    darkMode$: Signal<boolean>;
    constructor(
        private themeService: ThemeService,
        private breakpointObserver: BreakpointObserver,
        private dialog: MatDialog,
        private activatedRoute: ActivatedRoute) {

        this.darkMode$ = computed(() => this.themeService.getDarkMode());


            //idk what on earth is going on, but the activated route isn't working
            //the activatedRoute.url just isn't working... the only way to access the route is via this
            setInterval(() => {
                if (this.activatedRoute.children.length) {
                    var snapshot = this.activatedRoute.children[0].snapshot;
                    var path = snapshot.url.length ? snapshot.url[0].path : '';
                    this.routePath.set(path);
                }
            }, 1)
        //this.activatedRoute.root.snapshot
    }

    ngOnInit() {
    }

    openSettings() {
        var dialogRef = this.dialog.open(SettingsComponent, { autoFocus: false })
    }

    toggleTheme(){
        this.themeService.toggleDarkMode();
    }
}
