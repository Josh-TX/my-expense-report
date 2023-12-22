import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { ActiveElement, ChartEvent, Interaction, InteractionItem, InteractionModeFunction, InteractionOptions } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
Chart.register(...registerables);


export type DonutData = {
    isYearly: boolean,
    date: Date,
    items: DonutCategoryItem[]
};
export type DonutCategoryItem = {
    category: string,
    amount: number,
    averageAmount: number
    items: DonutSubcategoryItem[]
};
export type DonutSubcategoryItem = {
    subcategory: string,
    amount: number,
    averageAmount: number
};


type Subcategory = {
    subcategory: string,
    category: string,
}

@Component({
    selector: 'mer-category-donut',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatTableModule],
    templateUrl: './category-donut.component.html'
})
export class CategoryDonutComponent {
    @Input("data") inputData: DonutData | null = null;
    chart: Chart<"doughnut", number[], string> | null = null;
    private initCalled: boolean = false;
    private textMuted: string = "#AAAAAA"

    private categoryNames: string[] = [];
    private subcategoryNames: Subcategory[] = [];
    private categoryAmounts: number[] = [];
    private subcategoryAmounts: number[] = [];
    private avgCategoryAmounts: number[] = [];
    private avgSubcategoryAmounts: number[] = [];

    private date: string | undefined;
    private averageType: string | undefined;
    private categoryPercentages: number[] = [];
    private averagePercentages: number[] = [];
    private activeItems: InteractionItem[] = [];
    private clickedItems: InteractionItem[] = [];
    private clickActiveTimeout: any;

    constructor() {
        var intModes = (<any>Interaction.modes);
        intModes.myCustomMode = this.interactionModeFunc.bind(this);
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

    //causes the category arc and average arc to both highlight when either is hovered
    private interactionModeFunc(chart: Chart, e: ChartEvent, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[] {
        var indexItems = Interaction.modes.index(chart, e, options, useFinalPosition);
        var pointItems = Interaction.modes.point(chart, e, options, useFinalPosition);
        this.activeItems = [];
        if (pointItems.length == 1) {
            var otherDatasetIndex = (pointItems[0].datasetIndex + 3) % 6;
            var otherIndexItem = indexItems.find(z => z.datasetIndex == otherDatasetIndex)!;
            this.activeItems = [...pointItems, otherIndexItem];
        }
        if (e.type == "click"){
            this.clickedItems = this.activeItems;
        }
        //if nothing is hovered and there are clickedItems, then make the clicked items appear active
        clearInterval(this.clickActiveTimeout)
        if (!pointItems.length && this.clickedItems.length == 2){
            //when you stop hovering over the canvas entirely, it auto-deactivates the elements
            //so I check 50ms to see if there's no active elements and if so activate clickedItems
            this.clickActiveTimeout = setInterval(() => {
                if (chart.getActiveElements().length == 0){
                    chart.setActiveElements(this.clickedItems);
                    chart.update();
                }
            }, 50);
            return this.clickedItems
        } 
        return this.activeItems;

    }

    //draws the labels in the center of the donut
    private innerLabelBeforeDraw(chart: Chart<"doughnut", number[], unknown>, args: { cancelable: true }, options: any): boolean | void {
        var ctx = chart.ctx;
        var isSubcategory = false;
        var isAverage = false;
        var index: number | undefined; //a null index means we display the total
        var color = "#444444";
        var items = this.activeItems.length == 2 
            ? this.activeItems : this.clickedItems;
        if (items.length == 2) {
            isSubcategory = items.some(z => z.datasetIndex == 1);
            isAverage = items[0].datasetIndex > 2; //the first activeItem
            index = items[0].index;//both activeItems should have the same index
            color = (<any>items[0].element.options).borderColor;
        }


        var { top, bottom, left, right, width, height } = chart.chartArea;
        var radius = height * parseFloat(<any>chart.options.cutout) / 200
        var cx = left + width / 2;
        var cy = top + height / 2;

        ctx.textBaseline = "middle";
        ctx.textAlign = "right";
        ctx.fillStyle = color;
        var xOffset = +45;
        var yOffset = -60;
        if (index != null) {
            if (isSubcategory) {
                ctx.font = "12px Arial";
                ctx.fillText(this.subcategoryNames[index].category, cx + xOffset, cy + yOffset - 18);
                ctx.font = "20px Arial";
                ctx.fillText(this.subcategoryNames[index].subcategory, cx + xOffset, cy + yOffset);
            } else {
                ctx.font = "20px Arial";
                ctx.fillText(this.categoryNames[index], cx + xOffset, cy + yOffset);
            }
        } else { //since index is null, display the total
            ctx.font = "20px Arial";
            ctx.fillText("Total", cx + xOffset, cy + yOffset);
        }

        var label = isAverage ? "monthly average" : this.date!;
        var amounts = this.getAmounts(isSubcategory, isAverage);
        var amount = index != null ? amounts[index] : amounts.reduce((a, b) => a + b, 0);
        var amountStr = "$" + new DecimalPipe('en-US').transform(amount, ".0-0")!;

        ctx.font = "12px Arial";
        ctx.textAlign = "right";
        ctx.fillStyle = this.textMuted;
        ctx.fillText(label, cx + 45, cy - 35);
        ctx.font = "36px Arial";
        ctx.fillStyle = color;
        ctx.fillText(amountStr, cx + 45, cy - 10);
        if (index != null) {
            ctx.font = "20px Arial";
            ctx.fillStyle = this.textMuted;
            ctx.fillText(this.getPercent(amounts, index), cx + 45, cy + 15);
        }

        var otherLabel = !isAverage ? "monthly average" : this.date!;
        var otherAmounts = this.getAmounts(isSubcategory, !isAverage);
        var otherAmount = index != null ? otherAmounts[index] : otherAmounts.reduce((a, b) => a + b, 0);
        var otherAmountStr = "$" + new DecimalPipe('en-US').transform(otherAmount, ".0-0")!;

        ctx.font = "12px Arial";
        ctx.fillStyle = this.textMuted;;
        ctx.fillText(otherLabel, cx + 45, cy + 57);
        ctx.font = "20px Arial";
        ctx.fillStyle = color;
        ctx.fillText(otherAmountStr, cx + 45, cy + 75);
        if (index != null) {
            ctx.font = "12px Arial";
            ctx.fillStyle = this.textMuted;
            ctx.fillText(this.getPercent(otherAmounts, index), cx + 45, cy + 92);
        }
    }

    private getAmounts(isSubcategory: boolean, isAverage: boolean): number[] {
        if (isSubcategory) {
            return isAverage
                ? this.avgSubcategoryAmounts
                : this.subcategoryAmounts
        }
        return isAverage
            ? this.avgCategoryAmounts
            : this.categoryAmounts
    }

    private getPercent(amounts: number[], index: number): string {
        var sumAmount = amounts.reduce((a, b) => a + b, 0);
        var percent = (amounts[index] / sumAmount * 100);
        var precision = percent >= 10 ? 3 : (percent > 1 ? 2 : 1);
        return percent.toPrecision(precision) + "%";
    }

    //draws the labels the radiate outward
    private outerLabelBeforeDraw(chart: Chart<any>, args: { cancelable: true }, options: any): boolean | void {
        var length1 = 25;
        var ctx = chart.ctx;
        var { top, bottom, left, right, width, height } = chart.chartArea;
        var dataset = chart.data.datasets[0];
        var meta = chart.getDatasetMeta(0);
        for (var i = 0; i < meta.data.length; i++) {
            var color = (<any>dataset.borderColor)[i];
            var element = meta.data[i];
            var { x, y } = element.tooltipPosition(false);
            //get x y relative to center
            var cx = x - (width / 2 + left);
            var cy = y - (height / 2 + top);
            var sign = cx > 0 ? 1 : -1;

            var angle = Math.atan(cy / cx);
            // if (Math.abs(angle) > Math.PI / 4){
            //     angle = Math.PI / 4 * (angle > 0 ? 1 : -1);
            // }
            var degrees = angle * 180 / Math.PI;
            var xdiff = Math.cos(angle) * length1 * sign;
            var ydiff = Math.sin(angle) * length1 * sign;
            var x2 = x + xdiff;
            var y2 = y + ydiff;
            var x3 = x2 + length1 * sign;
            var y3 = y2;
            if (Math.abs(angle) < Math.PI / 4) {
                var ratio = Math.abs(angle) / (Math.PI / 4);
                ratio = ratio + (1 - ratio) / 2;
                x3 = x2 + length1 * ratio * sign;
            }
            // if (Math.abs(angle) < Math.PI / 4){
            //     x3 = x + xdiff * 2;
            //     y3 = y + ydiff * 2;
            // }

            //var xsign = x > width/2 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.strokeStyle = color;
            ctx.stroke();

            var label = this.categoryNames[i];
            var textWidth = ctx.measureText(label);
            ctx.font = "14px Arial";
            ctx.textBaseline = "middle";
            ctx.textAlign = cx > 0 ? "left" : "right";
            ctx.fillStyle = color;
            ctx.fillText(label, x3 + 5 * sign, y3);
        }
    }



    //private outerLabelAfterDraw(chart: Chart<TType>, args: EmptyObject, options: O)

    private renderChart(data: DonutData) {
        var categoryItems = [...data.items];
        categoryItems.sort((z1, z2) => z2.amount - z1.amount);
        categoryItems.forEach(z => z.items.sort((z1, z2) => z2.amount - z1.amount));
        var subcategoryItems = categoryItems.flatMap(z => z.items);

        this.categoryNames = categoryItems.map(z => z.category);
        this.subcategoryNames = categoryItems.flatMap(catItem => catItem.items.map(z => ({ category: catItem.category, subcategory: z.subcategory })));
        this.categoryAmounts = categoryItems.map(z => z.amount);
        this.subcategoryAmounts = subcategoryItems.map(z => z.amount);
        this.avgCategoryAmounts = categoryItems.map(z => z.averageAmount);
        this.avgSubcategoryAmounts = subcategoryItems.map(z => z.averageAmount);



        this.date = data.isYearly ? data.date.getFullYear() + "" : <string>new DatePipe('en-US').transform(data.date, 'MMM y');
        this.averageType = data.isYearly ? "yearly average" : "monthly average";

        var categorySum = categoryItems.reduce((a, b) => a + b.amount, 0)
        var averageSum = categoryItems.reduce((a, b) => a + b.averageAmount, 0)
        var categoryCircum = 360;
        var averageCircum = 360;
        if (categorySum > averageSum) {
            averageCircum = 360 * averageSum / categorySum
        } else {
            categoryCircum = 360 * categorySum / averageSum
        }

        var baseColors = ["rgb(230,0,73)", "rgb(11,180,255)", "rgb(80,233,145)", "rgb(230,216,0)", "rgb(155,25,245)", "rgb(255,163,0)", "rgb(220,10,180)", "rgb(179,212,255)", "rgb(0,191,160)"]
        var subBaseColors: string[] = [];
        for (var i = 0; i < categoryItems.length; i++) {
            for (var j = 0; j < categoryItems[i].items.length; j++) {
                subBaseColors.push(baseColors[i % baseColors.length]);
            }
        }


        var background = baseColors.map(z => z.replace("(", "a(").replace(")", ",0.25)"));
        var backgroundHover = baseColors.map(z => z.replace("(", "a(").replace(")", ",0.5)"));

        var subBackground = subBaseColors.map(z => z.replace("(", "a(").replace(")", ",0.25)"));
        var subBackgroundHover = subBaseColors.map(z => z.replace("(", "a(").replace(")", ",0.5)"));
        if (this.chart) {
            this.chart.destroy();
        }
        this.chart = new Chart("donut-canvas", {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: categoryItems.map(z => z.amount),
                    backgroundColor: background,
                    hoverBackgroundColor: backgroundHover,
                    borderColor: baseColors,
                    borderWidth: 1,
                    circumference: categoryCircum,
                    weight: 1
                    //borderAlign: "inner"
                },
                {
                    data: subcategoryItems.map(z => z.amount),
                    backgroundColor: subBackground,
                    hoverBackgroundColor: subBackgroundHover,
                    borderColor: subBaseColors,
                    borderWidth: 1,
                    circumference: categoryCircum,
                    weight: 1
                    //borderAlign: "inner"
                },
                {
                    data: [],
                    backgroundColor: [],
                    hoverBackgroundColor: [],
                    borderColor: [],
                    borderWidth: 1,
                    circumference: 0,
                    weight: 0.35
                    //borderAlign: "inner"
                },

                {
                    data: categoryItems.map(z => z.averageAmount),
                    backgroundColor: background,
                    hoverBackgroundColor: backgroundHover,
                    borderColor: baseColors,
                    borderWidth: 1,
                    circumference: averageCircum,
                    weight: 0.70
                    //borderAlign: "inner"
                },
                {
                    data: subcategoryItems.map(z => z.averageAmount),
                    backgroundColor: subBackground,
                    hoverBackgroundColor: subBackgroundHover,
                    borderColor: subBaseColors,
                    borderWidth: 1,
                    circumference: averageCircum,
                    weight: 0.70
                    //borderAlign: "inner"
                }

                ]
            },
            options: {
                interaction: {
                    mode: <any>"myCustomMode"
                },
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 80,
                        right: 80,
                        top: 15,
                        bottom: 15
                    }
                },
                //aspectRatio: 1.5,
                cutout: "60%",
                plugins: {
                    tooltip: {
                        enabled: false,
                        displayColors: false,
                        callbacks: {
                            label: (context) => {
                                if (context.datasetIndex == 1) {
                                    return this.averageType;
                                } else {
                                    return this.date;
                                }
                                //return this.categories[context.dataIndex]
                            },
                            footer: (contexts => {
                                return contexts[0].parsed + ""
                            })
                        }
                    },
                    legend: {
                        // position: "left",
                        // onClick: (e) => (<any>e).stopPropagation()
                        display: false
                    }
                }
            },
            plugins: [
                {
                    id: "outerLabel",
                    beforeDraw: this.outerLabelBeforeDraw.bind(this)
                },
                {
                    id: "innerLabel",
                    beforeDraw: this.innerLabelBeforeDraw.bind(this)
                }
            ]
        });
    }
}