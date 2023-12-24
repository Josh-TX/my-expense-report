import { Component, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartDataset, ChartEvent, Interaction, InteractionItem, InteractionOptions, Point } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { CategoryInfo } from '@services/category.service';
Chart.register(...registerables);


export type BarData = {
    isYearly: boolean,
    items: BarDateItem[]
};
export type BarDateItem = {
    date: Date,
    items: BarCategoryItem[]
};
export type BarCategoryItem = {
    category: string,
    amount: number
};

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
    private textMuted: string = "#AAAAAA"

    private categoryNames: string[] = [];
    private subcategoryNames: CategoryInfo[] = [];
    private categoryAmounts: number[] = [];
    private subcategoryAmounts: number[] = [];
    private avgCategoryAmounts: number[] = [];
    private avgSubcategoryAmounts: number[] = [];
    private colors: string[] = [];

    private date: string | undefined;
    private averageType: string | undefined;

    private activeItems: InteractionItem[] = [];
    private clickedItems: InteractionItem[] = [];
    private clickActiveTimeout: any;
    private categoryCircum: number = 360;

    constructor() {
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
        var categoryNames = data.items[0].items.map(z => z.category);
        var allItems = data.items.flatMap(z => z.items);
        var datepipe = new DatePipe("en-US");
        var dateStrings = data.items.map(z => datepipe.transform(z.date, "MMM y")!);



        this.colors = ["rgb(230,0,73)", "rgb(11,180,255)", "rgb(80,233,145)", "rgb(230,216,0)", "rgb(155,25,245)", "rgb(255,163,0)", "rgb(220,10,180)", "rgb(179,212,255)", "rgb(0,191,160)"]
        var background = this.colors.map(z => z.replace("(", "a(").replace(")", ",0.25)"));
        var backgroundHover = this.colors.map(z => z.replace("(", "a(").replace(")", ",0.5)"));
        background[1] = "#007FFF01 ";

        var datasets: ChartDataset<any, number[]>[] =  categoryNames.map((name, i) => ({
            label: name,
            data: [],
            backgroundColor: background[i % background.length],
            hoverBackgroundColor: backgroundHover[i % backgroundHover.length],
            borderColor: this.colors[i % this.colors.length],
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