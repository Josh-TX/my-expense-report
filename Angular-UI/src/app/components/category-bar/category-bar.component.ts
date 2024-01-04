import { Component, EventEmitter, Input, Output, SimpleChanges, WritableSignal, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartDataset, ChartEvent, Interaction, InteractionItem, InteractionOptions, Point } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Subcategory } from '@services/category.service';
import { BarData, chartDataService } from '@services/chart-data.service';
import { Theme, ThemeService } from '@services/theme.service';
import { getSum } from '@services/helpers';
Chart.register(...registerables);

export type BarChartType = "large" | "short";

@Component({
    selector: 'mer-category-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './category-bar.component.html'
})
export class CategoryBarComponent {
    @Input("catName") catName: string | undefined;
    @Input("subcatName") subcatName: string | undefined;
    @Input("showSubcategories") showSubcategories: boolean = false;
    @Input("isYearly") isYearlyInput: boolean = false;
    @Input("chartType") chartType: BarChartType = "large";
    @Output("dateClick") dateClick = new EventEmitter<Date | undefined>();

    private catName$: WritableSignal<string | undefined>;
    private subcatName$: WritableSignal<string | undefined>;
    private showSubcategories$: WritableSignal<boolean>;
    private isYearly$: WritableSignal<boolean>;

    chart: Chart<"bar", number[], string> | undefined;
    height: number = 500;


    private dates: Date[] = []
    private theme!: Theme;
    private clickJustFired = false;

    constructor(private themeService: ThemeService, private chartDataService: chartDataService) {
        this.catName$ = signal(undefined);
        this.subcatName$ = signal(undefined);
        this.showSubcategories$ = signal(false);
        this.isYearly$ = signal(false);
        (<any>Interaction.modes)["indexReverse"] = this.interactionModeFunc.bind(this);
        effect(() => {
            var chartData =  this.isYearly$()
                ? this.chartDataService.getYearlyBarData(this.catName$(), this.subcatName$(), this.showSubcategories$())
                : this.chartDataService.getMonthlyBarData(this.catName$(), this.subcatName$(), this.showSubcategories$());
            if (chartData) {
                this.theme = this.themeService.getTheme();
                this.renderChart(chartData);
            }
        })
    }

    ngOnChanges(simpleChanges: SimpleChanges) {
        this.height = this.chartType == "large" ? 500 : 300;
        this.catName$.set(this.catName);
        this.subcatName$.set(this.subcatName);
        this.showSubcategories$.set(this.showSubcategories);
        this.isYearly$.set(this.isYearlyInput);
    }


    //ChartJs' interactionModes are used to determine what sets of things are highlighted when there's a mouse event
    //This custom interactionMode causes the selection to be in reverse order, which reverse the order of the tooltip
    private interactionModeFunc(chart: Chart, e: ChartEvent, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[] {
        var indexItems = Interaction.modes.index(chart, e, options, useFinalPosition);
        if (e.type == "click") {
            var date = indexItems.length ? this.dates[indexItems[0].index] : undefined;
            //this code runs twice per click, but we only wanna emit once per click
            if (!this.clickJustFired) {
                this.clickJustFired = true;
                this.dateClick.emit(date);
                setTimeout(() => {
                    this.clickJustFired = false;
                }, 25);
            }
        }
        return indexItems.reverse();
    }

    //private outerLabelAfterDraw(chart: Chart<TType>, args: EmptyObject, options: O)

    private renderChart(data: BarData) {
        var catItems = data.items[0].items;
        var datepipe = new DatePipe("en-US");
        this.dates = data.items.map(z => z.date);
        var dateFormat = this.isYearlyInput ? 'y' : 'MMM y'
        var dateStrings = data.items.map(z => datepipe.transform(z.date, dateFormat)!);

        var datasets: ChartDataset<any, number[]>[] = catItems.map((catItem, i) => {
            return {
                label: catItem.label,
                data: [],
                backgroundColor: catItem.colorSet.background,
                hoverBackgroundColor: catItem.colorSet.hover,
                borderColor: catItem.colorSet.border,
                borderWidth: 1,
                borderSkipped: false
            }
        });
        for (var dateItem of data.items) {
            for (var i = 0; i < dateItem.items.length; i++) {
                datasets[i].data.push(dateItem.items[i].amount);
            }
        }
        if (this.chart) {
            this.chart.destroy();
        }
        this.chart = new Chart("bar-canvas", {
            type: 'bar',
            data: {
                labels: dateStrings,
                datasets: datasets
            },
            options: {
                maintainAspectRatio: false,
                interaction: {
                    mode: <any>"indexReverse",
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            color: this.theme.normalText
                        }
                    },
                    y: {
                        stacked: true,
                        ticks: {
                            color: this.theme.mutedText,
                            callback: function(value, index, ticks) {
                                return '$' + new DecimalPipe("en-US").transform(<any>value, ".0-0");
                            }
                        },
                        
                    }
                },
                aspectRatio: 3,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (tooltipItem) => {
                                return " " + tooltipItem.dataset.label + ": $" + new DecimalPipe("en-US").transform(<any>tooltipItem.raw, ".0-0")
                            },

                            footer: (tooltipItems => {
                                var sumAmount = getSum(tooltipItems.map(z => <number>z.raw));
                                return "Total: $" + new DecimalPipe("en-US").transform(sumAmount, ".0-0")
                            })
                        },
                        multiKeyBackground: this.theme.normalBackground,
                        displayColors(ctx, options) {
                            return true;
                        },
                    },
                    legend: {
                        position: this.chartType == "short" ? "right" : "top",
                        reverse: true,
                        labels: {
                            color: this.theme.normalText
                        }
                    }
                }
            }
        });
    }
}