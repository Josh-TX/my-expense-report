import { Component, Input, SimpleChanges, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartDataset, ChartEvent, Interaction, InteractionItem, InteractionOptions, Point } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Subcategory } from '@services/category.service';
import { BarData, chartDataService } from '@services/chartData.service';
import { Theme, ThemeService } from '@services/theme.service';
Chart.register(...registerables);


@Component({
    selector: 'mer-category-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './category-bar.component.html'
})
export class CategoryBarComponent {
    @Input("data") inputData: BarData | undefined;
    chart: Chart<"bar", number[], string> | undefined;
    private initCalled: boolean = false;
    private theme: Theme;

    constructor(private themeService: ThemeService, private chartDataService: chartDataService) {
        this.theme = this.themeService.getTheme();
        effect(() => {
            this.theme = this.themeService.getTheme();
            var chartData = this.chartDataService.getMonthlyBarData();
            if (chartData){
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

    //private outerLabelAfterDraw(chart: Chart<TType>, args: EmptyObject, options: O)

    private renderChart(data: BarData) {
        var categoryNames = data.items[0].items.map(z => z.catName);
        var datepipe = new DatePipe("en-US");
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
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true
                    }
                }
            }
        });
    }
}