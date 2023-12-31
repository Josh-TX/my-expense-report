import { Component, EventEmitter, Input, Output, SimpleChanges, WritableSignal, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartEvent, Interaction, InteractionItem, InteractionOptions, Point, TooltipItem } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Subcategory } from '@services/category.service';
import { SmallOuterLableDrawer } from './small-outer-label-drawer';
import { ColorSet, Theme, ThemeService } from '@services/theme.service';
import { getDistinctByProp, getSum, groupBy, sortBy } from '@services/helpers';
import { DonutData, SmallDonutData, chartDataService } from '@services/chartData.service';
Chart.register(...registerables);

export type SmallDonutClickData = {
    catName: string, 
    name: string
}



//I might've been able to extend the functionality of the large donut
//but it was faster (development-wise) to just copy-paste it and make the various changes
@Component({
    selector: 'mer-small-donut',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './small-donut.component.html'
})
export class SmallDonutComponent {
    @Input("currentDate") inputCurrentDate: Date | undefined;
    @Input("isSubcategory") isSubcategory: boolean = false;
    @Input("isYearly") isYearly: boolean = false;
    @Output("itemClick") clickEmitter = new EventEmitter<SmallDonutClickData | null>();
    private currentDate$: WritableSignal<Date | undefined>;
    private isYearly$: WritableSignal<boolean>;
    private isSubcategory$: WritableSignal<boolean>;

    chart: Chart<"doughnut", number[], string> | null = null;
    private theme: Theme | undefined;

    private names2: string[] = [];
    private catNames2: string[] = [];
    private amounts2: number[] = [];
    private avgAmounts2: number[] = [];
    private colorSets: ColorSet[] = [];

    private maxTotal: number = 0;
    private clickJustFired = false;

    private activeItems: InteractionItem[] = [];
    private clickedItems: InteractionItem[] = [];
    private outerCircum: number = 360;
    private innerCircum: number = 360;
    private chartRenderStartTime: number = 0;
    private innerRotation: number = 0;
    private prevRotation: number = 0;
    private innerRotationStartTime: number = 0;

    constructor(private themeService: ThemeService, private chartDataService: chartDataService) {
        this.currentDate$ = signal(undefined);
        this.isYearly$ = signal(false);
        this.isSubcategory$ = signal(false);
        var intModes = (<any>Interaction.modes);
        intModes.currentAverageSync = this.interactionModeFunc.bind(this);
        effect(() => {
            var chartData = this.chartDataService.getSmallDonutData(this.currentDate$(), this.isYearly$(), this.isSubcategory$());
            if (chartData){
                var len = chartData.items.length;
                this.theme = this.themeService.getTheme(len, chartData.items[len - 1].catName == "other");
                this.renderChart(chartData);
            }
        })
    }

    ngOnChanges(simpleChanges: SimpleChanges) {
        this.currentDate$.set(this.inputCurrentDate);
        this.isYearly$.set(this.isYearly)
        this.isSubcategory$.set(this.isSubcategory)
    }

    //ChartJs' interactionModes are used to determine what sets of things are highlighted when there's a mouse event
    //This custom interactionMode causes the current arc and the corresponding average arc to both highlight when either is hovered
    private interactionModeFunc(chart: Chart, e: ChartEvent, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[] {
        var indexItems = Interaction.modes.index(chart, e, options, useFinalPosition);
        var pointItems = Interaction.modes.point(chart, e, options, useFinalPosition);
        this.activeItems = [];
        if (pointItems.length == 1) {
            var otherDatasetIndex = pointItems[0].datasetIndex == 0 ? 2 : 0;
            var otherIndexItem = indexItems.find(z => z.datasetIndex == otherDatasetIndex)!;
            this.activeItems = [...pointItems, otherIndexItem];
            sortBy(this.activeItems, z => z.datasetIndex);
        }
        if (e.type == "click"){
            this.clickedItems = this.activeItems;
            //using chart.setActiveElements is unreliable (it would deselect when the mouse leaves the canvas)
            //therefore, I'll manually update the background colors to make the clicked items appear selected
            var index = this.clickedItems.length ? this.clickedItems[0].index : null;
            var backgroundsCopy = this.colorSets.map(z => z.background);
            if (index != null){
                backgroundsCopy[index] = this.colorSets[index].hover;
            }
            chart.data.datasets[0].backgroundColor = backgroundsCopy;
            chart.data.datasets[2].backgroundColor = backgroundsCopy;
            var updated = this.rotateAverage(<any>chart);
            if (!updated){
                chart.update();
            }
            if (!this.clickJustFired){
                this.clickJustFired = true;
                var clickData: SmallDonutClickData | undefined;
                if (index != null){
                    clickData = {
                        name: this.names2[index],
                        catName: this.catNames2[index]
                    }
                }
                this.clickEmitter.emit(clickData);
                setTimeout(() => {
                    this.clickJustFired = false;
                }, 25);
            }
        }
        return this.activeItems;
    }

    //draws the labels in the center of the donut
    // private innerLabelBeforeDraw(chart: Chart<"doughnut", number[], unknown>, args: { cancelable: true }, options: any): boolean | void {
    //     var ctx = chart.ctx;
    //     var isSubcategory = false;
    //     var isAverage = false;
    //     var index: number | undefined; //a null index means we display the total
    //     var color = this.theme!.normalText;
    //     var items = this.activeItems.length == 2 
    //         ? this.activeItems : this.clickedItems;
    //     if (items.length == 2) {
    //         isSubcategory = items.some(z => z.datasetIndex == 1);
    //         isAverage = items[0].datasetIndex > 2; //the first activeItem
    //         index = items[0].index;//both activeItems should have the same index
    //         if (isSubcategory){
    //             var catIndex = getDistinctByProp(this.subcategories.slice(0, index + 1), "catName").length - 1;
    //             color = this.theme!.colorSets[catIndex].text;
    //         } else {
    //             color = this.theme!.colorSets[index].text;
    //         }
    //     }


    //     var { top, bottom, left, right, width, height } = chart.chartArea;
    //     var cx = left + width / 2;
    //     var cy = top + height / 2;

    //     ctx.textBaseline = "middle";
    //     ctx.textAlign = "right";
    //     ctx.fillStyle = color;
    //     var xOffset = +45;
    //     var yOffset = -60;
    //     if (index != null) {
    //         var primaryLabel = isSubcategory 
    //             ? this.subcategories[index].subcatName || this.subcategories[index].catName
    //             : this.categoryNames[index];
    //         var secondaryLabel = isSubcategory ? this.subcategories[index].catName : null;
    //         if (secondaryLabel) {
    //             ctx.font = "12px Arial";
    //             ctx.fillText(this.subcategories[index].catName, cx + xOffset, cy + yOffset - 18);
    //         } 
    //         if (!primaryLabel){
    //             ctx.fillStyle = this.theme!.mutedText;
    //             primaryLabel = "uncategorized"
    //         }
    //         ctx.font = "20px Arial";
    //         ctx.fillText(primaryLabel, cx + xOffset, cy + yOffset);
    //     } else { //since index is null, display the total
    //         ctx.font = "20px Arial";
    //         ctx.fillText("Total", cx + xOffset, cy + yOffset);
    //     }

    //     var label = isAverage ? "monthly average" : this.date!;
    //     var amounts = this.getAmounts(isSubcategory, isAverage);
    //     var amount = index != null ? amounts[index] : amounts.reduce((a, b) => a + b, 0);
    //     var amountStr = "$" + new DecimalPipe('en-US').transform(amount, ".0-0")!;

    //     ctx.font = "12px Arial";
    //     ctx.textAlign = "right";
    //     ctx.fillStyle = this.theme!.mutedText;
    //     ctx.fillText(label, cx + 45, cy - 35);
    //     ctx.font = "36px Arial";
    //     ctx.fillStyle = color;
    //     ctx.fillText(amountStr, cx + 45, cy - 10);
    //     if (index != null) {
    //         ctx.font = "20px Arial";
    //         ctx.fillStyle = this.theme!.mutedText;
    //         ctx.fillText(this.getPercent(amounts, index), cx + 45, cy + 15);
    //     }

    //     var otherLabel = "average";
    //     var otherAmounts = this.getAmounts(isSubcategory, !isAverage);
    //     var otherAmount = index != null ? otherAmounts[index] : otherAmounts.reduce((a, b) => a + b, 0);
    //     var otherAmountStr = "$" + new DecimalPipe('en-US').transform(otherAmount, ".0-0")!;

    //     ctx.font = "12px Arial";
    //     ctx.fillStyle = this.theme!.mutedText;
    //     ctx.fillText(otherLabel, cx + 45, cy + 57);
    //     ctx.font = "20px Arial";
    //     ctx.fillStyle = color;
    //     ctx.fillText(otherAmountStr, cx + 45, cy + 75);
    //     if (index != null) {
    //         ctx.font = "12px Arial";
    //         ctx.fillStyle = this.theme!.mutedText;
    //         ctx.fillText(this.getPercent(otherAmounts, index), cx + 45, cy + 92);
    //     }
    // }

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
            ? baseR * 0.65 + baseR * 0.35 * (0.7 / 1.9)
            : baseR;
        var smallR = isInner 
            ? baseR * 0.65
            : baseR * 0.65 + baseR * 0.35 * (0.9 / 1.9);
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
    }

    //draws the labels the radiate outward
    private outerLabelBeforeDraw(chart: Chart<any>, args: { cancelable: true }, options: any): boolean | void {
        var elapsedTime = new Date().getTime() - this.chartRenderStartTime;
        var animationTime = 900;
        var animationProgress = elapsedTime > animationTime ? 1 : elapsedTime / animationTime;
        var drawer = new SmallOuterLableDrawer(
            chart.ctx,
            chart.chartArea,
            this.names2,
            this.amounts2,
            this.colorSets,
            this.outerCircum,
            animationProgress
        )
        drawer.drawLabels();
    }

    /**returns true if an update was run */
    private rotateAverage(chart: Chart<"doughnut", number[], unknown>): boolean {
        var targetRotation = this.innerRotation;
        if (!this.clickedItems.length){
            targetRotation = 0;
        } else {
            var item = this.clickedItems[0];
            var amount = getSum(this.amounts2.slice(0, item.index));
            var avgAmount = getSum(this.avgAmounts2.slice(0, item.index));
            targetRotation = (amount - avgAmount) / this.maxTotal * 360
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
            chart.data.datasets[2].rotation = targetRotation;
            chart.update();
            return true;
        }
        return false;
    }

    private getPercent(amounts: number[], index: number): string {
        var sumAmount = amounts.reduce((a, b) => a + b, 0);
        var percent = (amounts[index] / sumAmount * 100);
        var precision = percent >= 10 ? 3 : (percent > 1 ? 2 : 1);
        return percent.toPrecision(precision) + "%";
    }

    private renderChart(data: SmallDonutData) {
        this.chartRenderStartTime = new Date().getTime();
        this.clickedItems = [];
        this.names2 = data.items.map(z => z.name);
        this.catNames2 = data.items.map(z => z.catName);
        this.amounts2 = data.items.map(z => z.amount);
        this.avgAmounts2 = data.items.map(z => z.averageAmount);

        var outerSum = getSum(this.amounts2);
        var innerSum =  getSum(this.avgAmounts2);
        this.maxTotal = Math.max(outerSum, innerSum);
        this.outerCircum = 360;
        this.innerCircum = 360;
        if (outerSum > innerSum) {
            this.innerCircum = 360 * innerSum / outerSum
        } else {
            this.outerCircum = 360 * outerSum / innerSum
        }
        this.innerRotation = 0;

        this.colorSets = [];
        var catNames = groupBy(data.items, z => z.catName).map(z => z.key);
        for (var i = 0; i < data.items.length; i++) {
            var index = catNames.indexOf(data.items[i].catName);
            this.colorSets.push(this.theme!.colorSets[index % this.theme!.colorSets.length]);
        }
        if (this.chart) {
            this.chart.destroy();
        }
        this.chart = new Chart("donut-canvas", {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: data.items.map(z => z.amount),
                    backgroundColor: this.colorSets.map(z => z.background),
                    hoverBackgroundColor: this.colorSets.map(z => z.hover),
                    borderColor: this.colorSets.map(z => z.border),
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
                    weight: 0.2
                },
                {
                    data: data.items.map(z => z.averageAmount),
                    backgroundColor: this.colorSets.map(z => z.background),
                    hoverBackgroundColor: this.colorSets.map(z => z.hover),
                    borderColor: this.colorSets.map(z => z.border),
                    borderWidth: 1,
                    circumference: this.innerCircum,
                    weight: 0.7
                }]
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
                cutout: "65%",
                plugins: {
                    tooltip: {
                        enabled: true,
                        displayColors: true,
                        callbacks: {
                            label: (tooltipItem) => {
                                var name = tooltipItem.datasetIndex == 0
                                     ? "current month"
                                     : "monthly average";
                                var amounts = tooltipItem.datasetIndex == 0
                                    ? this.amounts2
                                    : this.avgAmounts2;
                                return name + ": $" +  new DecimalPipe("en-US").transform(<any>tooltipItem.raw, ".0-0") + " - " + this.getPercent(amounts, tooltipItem.dataIndex);
         
                            }
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
                    id: "missingTotalSection",
                    beforeDraw: this.missingTotalSectionBeforeDraw.bind(this)
                }
            ]
        });
    }
}