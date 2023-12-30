import { Component, EventEmitter, Input, Output, SimpleChanges, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartDataset, ChartEvent, Interaction, InteractionItem, InteractionOptions, Point } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Subcategory } from '@services/category.service';
import { BarData, chartDataService } from '@services/chartData.service';
import { Theme, ThemeService } from '@services/theme.service';
import { getSum } from '@services/helpers';
Chart.register(...registerables);


@Component({
    selector: 'mer-category-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './category-bar.component.html'
})
export class CategoryBarComponent {
    @Output("dateClick") dateClick = new EventEmitter<Date>();
    @Input("data") inputData: BarData | undefined;
    chart: Chart<"bar", number[], string> | undefined;
    private dates: Date[] = []
    private initCalled: boolean = false;
    private theme: Theme;
    private clickJustFired = false;

    constructor(private themeService: ThemeService, private chartDataService: chartDataService) {
        this.theme = <any>{};
        (<any>Interaction.modes)["indexReverse"] = this.interactionModeFunc.bind(this);
        effect(() => {
            var chartData = this.chartDataService.getMonthlyBarData();
            if (chartData){
                var len = chartData.items[0].items.length;
                this.theme = this.themeService.getTheme(len, chartData.items[0].items[len - 1].catName == "other");
                this.renderChart(chartData);
            }
        })
    }

    ngOnChanges(simpleChanges: SimpleChanges) {
        if (this.initCalled && this.inputData) {
            this.renderChart(this.inputData);
        }
    }

    ngOnInit() {
        this.initCalled = true;
        if (this.inputData) {
            this.renderChart(this.inputData);
        }
    }

    //ChartJs' interactionModes are used to determine what sets of things are highlighted when there's a mouse event
    //This custom interactionMode causes the selection to be in reverse order, which reverse the order of the tooltip
    private interactionModeFunc(chart: Chart, e: ChartEvent, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[] {
        var indexItems = Interaction.modes.index(chart, e, options, useFinalPosition);
        if (e.type == "click" && indexItems.length){
            //this code runs twice per click, but we only wanna emit once per click
            if (!this.clickJustFired){
                this.clickJustFired = true;
                this.dateClick.emit(this.dates[indexItems[0].index]);
                setTimeout(() => {
                    this.clickJustFired = false;
                }, 25);
            }
        }
        return indexItems.reverse();
    }

    //private outerLabelAfterDraw(chart: Chart<TType>, args: EmptyObject, options: O)

    private renderChart(data: BarData) {
        var categoryNames = data.items[0].items.map(z => z.catName);
        var datepipe = new DatePipe("en-US");
        this.dates = data.items.map(z => z.date);
        var dateStrings = data.items.map(z => datepipe.transform(z.date, "MMM y")!);
        
        var datasets: ChartDataset<any, number[]>[] =  categoryNames.map((name, i) => ({
            label: name,
            data: [],
            backgroundColor: this.theme.backgrounds[i % this.theme.backgrounds.length],
            hoverBackgroundColor: this.theme.hovers[i % this.theme.hovers.length],
            borderColor: this.theme.borders[i % this.theme.borders.length],
            borderWidth: 1,
            borderSkipped: false
        }));
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
                interaction: {
                    mode: <any>"indexReverse",
                },
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true
                    }
                },
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
                }
            }
        });
    }
}