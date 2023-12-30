import { Component, Input, SimpleChanges, WritableSignal, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartEvent, Interaction, InteractionItem, InteractionOptions, Point } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Subcategory } from '@services/category.service';
import { OuterLableDrawer } from './outer-label-drawer';
import { Theme, ThemeService } from '@services/theme.service';
import { getDistinctByProp, getSum } from '@services/helpers';
import { DonutData, chartDataService } from '@services/chartData.service';
Chart.register(...registerables);


@Component({
    selector: 'mer-category-donut',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './category-donut.component.html'
})
export class CategoryDonutComponent {
    @Input("currentDate") inputCurrentDate: Date | undefined;
    private month$: WritableSignal<Date | undefined>;

    chart: Chart<"doughnut", number[], string> | null = null;
    private theme: Theme | undefined;

    private categoryNames: string[] = [];
    private subcategories: Subcategory[] = [];
    private categoryAmounts: number[] = [];
    private subcategoryAmounts: number[] = [];
    private avgCategoryAmounts: number[] = [];
    private avgSubcategoryAmounts: number[] = [];
    private maxTotal: number = 0;
    private minTotal: number = 0;

    private date: string | undefined;
    private averageType: string | undefined;

    private activeItems: InteractionItem[] = [];
    private clickedItems: InteractionItem[] = [];
    private clickActiveTimeout: any;
    private outerCircum: number = 360;
    private innerCircum: number = 360;
    private chartRenderStartTime: number = 0;
    private innerRotation: number = 0;
    private prevRotation: number = 0;
    private innerRotationStartTime: number = 0;

    constructor(private themeService: ThemeService, private chartDataService: chartDataService) {
        this.month$ = signal(undefined);
        var intModes = (<any>Interaction.modes);
        intModes.currentAverageSync = this.interactionModeFunc.bind(this);
        effect(() => {
            var chartData = this.chartDataService.getMonthlyDonutData(this.month$());
            if (chartData){
                var len = chartData.categoryItems.length;
                this.theme = this.themeService.getTheme(len, chartData.categoryItems[len - 1].catName == "other");
                this.renderChart(chartData);
            }
        })
    }

    ngOnChanges(simpleChanges: SimpleChanges) {
        this.month$.set(this.inputCurrentDate);
    }

    //ChartJs' interactionModes are used to determine what sets of things are highlighted when there's a mouse event
    //This custom interactionMode causes the current arc and the corresponding average arc to both highlight when either is hovered
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
            this.rotateAverage(<any>chart);
        }
        //if nothing is hovered and there are clickedItems, then make the clicked items appear active
        clearInterval(this.clickActiveTimeout)
        if (!pointItems.length && this.clickedItems.length == 2){
            //when you stop hovering over the canvas entirely, it auto-deactivates the elements
            //so I check 50ms to see if there's no active elements and if so activate clickedItems
            this.clickActiveTimeout = setInterval(() => {
                if (this.clickedItems.length == 2 && chart.getActiveElements().length == 0){
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
        var color = this.theme!.normalText;
        var items = this.activeItems.length == 2 
            ? this.activeItems : this.clickedItems;
        if (items.length == 2) {
            isSubcategory = items.some(z => z.datasetIndex == 1);
            isAverage = items[0].datasetIndex > 2; //the first activeItem
            index = items[0].index;//both activeItems should have the same index
            if (isSubcategory){
                var catIndex = getDistinctByProp(this.subcategories.slice(0, index + 1), "catName").length - 1;
                color = this.theme!.texts[catIndex];
            } else {
                color = this.theme!.texts[index];
            }
        }


        var { top, bottom, left, right, width, height } = chart.chartArea;
        var cx = left + width / 2;
        var cy = top + height / 2;

        ctx.textBaseline = "middle";
        ctx.textAlign = "right";
        ctx.fillStyle = color;
        var xOffset = +45;
        var yOffset = -60;
        if (index != null) {
            var primaryLabel = isSubcategory 
                ? this.subcategories[index].subcatName || this.subcategories[index].catName
                : this.categoryNames[index];
            var secondaryLabel = isSubcategory ? this.subcategories[index].catName : null;
            if (secondaryLabel) {
                ctx.font = "12px Arial";
                ctx.fillText(this.subcategories[index].catName, cx + xOffset, cy + yOffset - 18);
            } 
            if (!primaryLabel){
                ctx.fillStyle = this.theme!.mutedText;
                primaryLabel = "uncategorized"
            }
            ctx.font = "20px Arial";
            ctx.fillText(primaryLabel, cx + xOffset, cy + yOffset);
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
        ctx.fillStyle = this.theme!.mutedText;
        ctx.fillText(label, cx + 45, cy - 35);
        ctx.font = "36px Arial";
        ctx.fillStyle = color;
        ctx.fillText(amountStr, cx + 45, cy - 10);
        if (index != null) {
            ctx.font = "20px Arial";
            ctx.fillStyle = this.theme!.mutedText;
            ctx.fillText(this.getPercent(amounts, index), cx + 45, cy + 15);
        }

        var otherLabel = !isAverage ? "monthly average" : this.date!;
        var otherAmounts = this.getAmounts(isSubcategory, !isAverage);
        var otherAmount = index != null ? otherAmounts[index] : otherAmounts.reduce((a, b) => a + b, 0);
        var otherAmountStr = "$" + new DecimalPipe('en-US').transform(otherAmount, ".0-0")!;

        ctx.font = "12px Arial";
        ctx.fillStyle = this.theme!.mutedText;
        ctx.fillText(otherLabel, cx + 45, cy + 57);
        ctx.font = "20px Arial";
        ctx.fillStyle = color;
        ctx.fillText(otherAmountStr, cx + 45, cy + 75);
        if (index != null) {
            ctx.font = "12px Arial";
            ctx.fillStyle = this.theme!.mutedText;
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

    private missingTotalSectionBeforeDraw(chart: Chart<any>, args: { cancelable: true }, options: any): boolean | void {
        var elapsedTime = new Date().getTime() - this.chartRenderStartTime;
        var animationTime = 900;
        var animationProgress = elapsedTime > animationTime ? 1 : elapsedTime / animationTime;
        var easeOutCubic = 1 - Math.pow(1 - animationProgress, 3);
        var isInner = this.innerCircum < 360 ? true : false;
        var ctx = chart.ctx;
        var { top, bottom, left, right, width, height } = chart.chartArea;
        var cx = left + width / 2;
        var cy = top + height / 2;
        var baseR = height / 2;
        //I'm using the terms "inner" & "outer" to distingish datasets 0 & 1 from datasets 3 & 4
        //so I'm using largeR and smallR to refer to the 2 radiuses for the missing section
        var largeR = isInner 
            ? baseR * 0.6 + baseR * 0.4 * (1.4 / 3.75)
            : baseR;
        var smallR = isInner 
            ? baseR * 0.6
            : baseR * 0.6 + baseR * 0.4 * (1.75 / 3.75);
        var circum = isInner ? this.innerCircum : this.outerCircum;
        var extraAngle = 0;
        if (isInner){
            //because the inner rings can rotate, we have to adjust the extraAngle to match
            var innerRotElapsedTime = new Date().getTime() - this.innerRotationStartTime;
            var innerRotProgress = Math.min(1, innerRotElapsedTime / 800)
            var innerRotEaseOutCubic = 1 - Math.pow(1 - innerRotProgress, 3);
            var prevAngle = this.prevRotation * Math.PI / 180;
            var targetAngle = this.innerRotation * Math.PI / 180;
            extraAngle = prevAngle * (1 - innerRotEaseOutCubic) + targetAngle * innerRotEaseOutCubic;
        }
        //startAngle & endAngle assume 0 is at 12 O'clock and goes clockwise
        var startAngle = circum / 180 * Math.PI * easeOutCubic + extraAngle;
        var endAngle = Math.PI * 2 * easeOutCubic + extraAngle;
        ctx.lineDashOffset = 0;
        ctx.setLineDash([1, 4]);
        ctx.strokeStyle = this.theme!.mutedText;
        ctx.beginPath();
        //ctx.arc() starts at 3 O'clock, hence I have to subtrack PI/2
        ctx.arc(cx, cy, largeR, startAngle + - Math.PI / 2, endAngle - Math.PI / 2);
        ctx.lineTo(cx + Math.sin(endAngle) * smallR, cy - Math.cos(endAngle) * smallR);
        ctx.arc(cx, cy, smallR, endAngle - Math.PI / 2, startAngle - Math.PI / 2, true);
        ctx.fillStyle = this.theme!.mutedText + "20";
        ctx.fill();
        var requiredDegreesForLabel = isInner ? 20 : 15;
        if (360 - circum > requiredDegreesForLabel){
            var amount = this.maxTotal - this.minTotal;
            var amountStr = "$" + new DecimalPipe('en-US').transform(amount, ".0-0")!;
            var midAngle = (startAngle + endAngle - extraAngle*2) / 2 + extraAngle;
            var midR = (largeR + smallR ) / 2;
            ctx.font = "12px Arial";
            ctx.fillStyle = this.theme!.mutedText;
            ctx.textAlign = "center";
            ctx.fillText(amountStr, cx + Math.sin(midAngle) * midR, cy - Math.cos(midAngle) * midR);
        }
    }

    //draws the labels the radiate outward
    private outerLabelBeforeDraw(chart: Chart<any>, args: { cancelable: true }, options: any): boolean | void {
        var elapsedTime = new Date().getTime() - this.chartRenderStartTime;
        var animationTime = 900;
        var animationProgress = elapsedTime > animationTime ? 1 : elapsedTime / animationTime;
        var drawer = new OuterLableDrawer(
            chart.ctx,
            chart.chartArea,
            this.categoryNames,
            this.subcategories,
            this.categoryAmounts,
            this.subcategoryAmounts,
            this.theme!,
            this.outerCircum,
            animationProgress
        )
        drawer.drawLabels();
    }

    private rotateAverage(chart: Chart<"doughnut", number[], unknown>){
        var targetRotation = this.innerRotation;
        if (!this.clickedItems.length){
            targetRotation = 0;
        } else {
            var item = this.clickedItems[0];
            if (item.datasetIndex == 0 || item.datasetIndex == 3){
                var amount = getSum(this.categoryAmounts.slice(0, item.index));
                var avgAmount = getSum(this.avgCategoryAmounts.slice(0, item.index));
                targetRotation = (amount - avgAmount) / this.maxTotal * 360
            }
            if (item.datasetIndex == 1 || item.datasetIndex == 4){
                var amount = getSum(this.subcategoryAmounts.slice(0, item.index));
                var avgAmount = getSum(this.avgSubcategoryAmounts.slice(0, item.index));
                targetRotation = (amount - avgAmount) / this.maxTotal * 360
            }
        }
        if (targetRotation != this.innerRotation){
            var innerRotElapsedTime = new Date().getTime() - this.innerRotationStartTime;
            var innerRotProgress = Math.min(1, innerRotElapsedTime / 800)
            var innerRotEaseOutCubic = 1 - Math.pow(1 - innerRotProgress, 3);
            //kinda perfectionist, but prevRotation will now be accurate if an active animation was interrupted
            //this results in the missingTotalSection to align correctly, even if there's multiple clicks in under 800ms
            this.prevRotation =  this.prevRotation * (1 - innerRotEaseOutCubic) + this.innerRotation * innerRotEaseOutCubic;
            this.innerRotation = targetRotation;
            this.innerRotationStartTime = new Date().getTime()
            chart.data.datasets[3].rotation = targetRotation;
            chart.data.datasets[4].rotation = targetRotation;
            chart.update();
        }
    }

    private renderChart(data: DonutData) {
        this.chartRenderStartTime = new Date().getTime();
        this.clickedItems = [];
        var categoryItems = [...data.categoryItems];
        var subcategoryItems = categoryItems.flatMap(z => z.subcategoryItems);
        this.categoryNames = categoryItems.map(z => z.catName);
        this.subcategories = subcategoryItems.map(z => z.subcategory);
        this.categoryAmounts = categoryItems.map(z => z.amount);
        this.subcategoryAmounts = subcategoryItems.map(z => z.amount);
        this.avgCategoryAmounts = categoryItems.map(z => z.averageAmount);
        this.avgSubcategoryAmounts = subcategoryItems.map(z => z.averageAmount);

        this.date = data.isYearly ? data.date.getFullYear() + "" : <string>new DatePipe('en-US').transform(data.date, 'MMM y');
        this.averageType = data.isYearly ? "yearly average" : "monthly average";

        var categorySum = categoryItems.reduce((a, b) => a + b.amount, 0)
        var averageSum = categoryItems.reduce((a, b) => a + b.averageAmount, 0)
        this.maxTotal = Math.max(categorySum, averageSum);
        this.minTotal = Math.min(categorySum, averageSum);
        this.outerCircum = 360;
        this.innerCircum = 360;
        if (categorySum > averageSum) {
            this.innerCircum = 360 * averageSum / categorySum
        } else {
            this.outerCircum = 360 * categorySum / averageSum
        }
        this.innerRotation = 0;

        var subcatBorders: string[] = [];
        var subcatBackgrounds: string[] = [];
        var subcatHovers: string[] = [];
        var colorLen = this.theme!.borders.length;
        for (var i = 0; i < categoryItems.length; i++) {
            for (var j = 0; j < categoryItems[i].subcategoryItems.length; j++) {
                subcatBorders.push(this.theme!.borders[i % colorLen]);
                subcatBackgrounds.push(this.theme!.backgrounds[i % colorLen]);
                subcatHovers.push(this.theme!.hovers[i % colorLen]);
            }
        }
        if (this.chart) {
            this.chart.destroy();
        }
        this.chart = new Chart("donut-canvas", {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: categoryItems.map(z => z.amount),
                    backgroundColor: this.theme?.backgrounds,
                    hoverBackgroundColor: this.theme?.hovers,
                    borderColor: this.theme?.borders,
                    borderWidth: 1,
                    circumference: this.outerCircum,
                    weight: 1
                },
                {
                    data: subcategoryItems.map(z => z.amount),
                    backgroundColor: subcatBackgrounds,
                    hoverBackgroundColor: subcatHovers,
                    borderColor: subcatBorders,
                    borderWidth: 1,
                    circumference: this.outerCircum,
                    weight: 1
                },
                {
                    data: [],
                    backgroundColor: [],
                    hoverBackgroundColor: [],
                    borderColor: [],
                    borderWidth: 1,
                    circumference: 0,
                    weight: 0.35
                },

                {
                    data: categoryItems.map(z => z.averageAmount),
                    backgroundColor: this.theme?.backgrounds,
                    hoverBackgroundColor: this.theme?.hovers,
                    borderColor: this.theme?.borders,
                    borderWidth: 1,
                    circumference: this.innerCircum,
                    weight: 0.70
                },
                {
                    data: subcategoryItems.map(z => z.averageAmount),
                    backgroundColor: subcatBackgrounds,
                    hoverBackgroundColor: subcatHovers,
                    borderColor: subcatBorders,
                    borderWidth: 1,
                    circumference: this.innerCircum,
                    weight: 0.70
                }

                ]
            },
            options: {
                interaction: {
                    mode: <any>"currentAverageSync"
                },
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 80,
                        right: 80,
                        top: 22,
                        bottom: 22
                    }
                },
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
                },
                {
                    id: "missingTotalSection",
                    beforeDraw: this.missingTotalSectionBeforeDraw.bind(this)
                }
            ]
        });
    }
}