import { Component, EventEmitter, Input, Output, SimpleChanges, WritableSignal, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartDataset, ChartEvent, Interaction, InteractionItem, InteractionOptions } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { DatePipe, DecimalPipe } from '@angular/common';
import { OuterLableDrawer, outerLabelData } from './outer-label-drawer';
import { Theme, ThemeService } from '@services/theme.service';
import { getSum } from '@services/helpers';
import { DonutData, DonutDataRing, chartDataService } from '@services/chartData.service';
Chart.register(...registerables);

export type DonutClickData = {
    catName: string,
    subcatName: string | undefined,
    movedToOtherCatNames: string[]
}

export type DonutChartType = "both" | "category" | "subcategory"

@Component({
    selector: 'mer-category-donut',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './category-donut.component.html'
})
export class CategoryDonutComponent {
    @Input("currentDate") currentDateInput: Date | undefined;
    @Input("isYearly") isYearlyInput: boolean = false;
    @Input("chartType") inputChartType: DonutChartType = "both";
    @Output("itemClick") clickEmitter = new EventEmitter<DonutClickData | null>();
    height: number = 500;

    private date$: WritableSignal<Date | undefined>;
    private isYearly$: WritableSignal<boolean>;
    private chartType$: WritableSignal<DonutChartType>;
    private datasetIndexRingMap: { [datasetIndex: number]: DonutDataRing } = {}

    chart: Chart<"doughnut", number[], string> | null = null;
    private theme: Theme | undefined;
    private donutData!: DonutData; 

    private date: string | undefined;

    private averageType: string | undefined;
    private clickJustFired = false;
    private maxTotal: number = 0;
    private minTotal: number = 0;

    private activeItems: InteractionItem[] = [];
    private clickedItems: InteractionItem[] = [];
    private outerCircum: number = 360;
    private innerCircum: number = 360;
    private chartRenderStartTime: number = 0;
    private innerRotation: number = 0;
    private prevRotation: number = 0;
    private innerRotationStartTime: number = 0;
    private weights: [number, number, number] = [0,0,0];
    private outerRingCount: number = 2;

    constructor(private themeService: ThemeService, private chartDataService: chartDataService) {
        this.date$ = signal(undefined);
        this.isYearly$ = signal(false);
        this.chartType$ = signal("both")
        var intModes = (<any>Interaction.modes);
        intModes.currentAverageSync = this.interactionModeFunc.bind(this);
        effect(() => {
            var chartData = this.isYearly$()
                ? this.chartDataService.getYearlyDonutData(this.date$())
                : this.chartDataService.getMonthlyDonutData(this.date$());
            if (chartData){
                if (this.chartType$() == "category"){
                    chartData.outerRings = [chartData.outerRings[0]];
                    chartData.innerRings = [chartData.innerRings[0]]
                } else if (this.chartType$() == "subcategory"){
                    chartData.outerRings = [chartData.outerRings[1]];
                    chartData.innerRings = [chartData.innerRings[1]]
                }
                this.theme = this.themeService.getTheme();
                this.renderChart(chartData);
            }
        })
    }

    ngOnChanges(simpleChanges: SimpleChanges) {
        this.date$.set(this.currentDateInput);
        this.isYearly$.set(this.isYearlyInput);
        this.chartType$.set(this.inputChartType);
        this.height = this.inputChartType == "both" ? 500 : 280;
    }

    //ChartJs' interactionModes are used to determine what sets of things are highlighted when there's a mouse event
    //This custom interactionMode causes the current arc and the corresponding average arc to both highlight when either is hovered
    private interactionModeFunc(chart: Chart, e: ChartEvent, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[] {
        var indexItems = Interaction.modes.index(chart, e, options, useFinalPosition);
        var pointItems = Interaction.modes.point(chart, e, options, useFinalPosition);
        this.activeItems = [];
        if (pointItems.length == 1) {
            var otherDatasetIndex = this.outerRingCount == 2
                ? (pointItems[0].datasetIndex + 3) % 6
                : (pointItems[0].datasetIndex + 2) % 4
            var otherIndexItem = indexItems.find(z => z.datasetIndex == otherDatasetIndex)!;
            this.activeItems = [...pointItems, otherIndexItem];
        }
        if (e.type == "click"){
            this.clickedItems = this.activeItems;
            //using chart.setActiveElements is unreliable (it would deselect when the mouse leaves the canvas)
            //therefore, I'll manually update the background colors to make the clicked items appear selected
            var index = this.clickedItems.length ? this.clickedItems[0].index : null;
            var datasetIndexes = this.outerRingCount == 2 ? [0,1,3,4] : [0,2];
            for (var datesetIndex of datasetIndexes){
                var ring =  this.datasetIndexRingMap[datesetIndex];
                var backgrounds = ring.items.map(z => z.colorSet.background);
                if (index != null && this.clickedItems.map(z => z.datasetIndex).includes(datesetIndex)){
                    backgrounds = [...backgrounds]
                    backgrounds[index] =  ring.items[index].colorSet.hover;
                }
                chart.data.datasets[datesetIndex].backgroundColor = backgrounds;
            }
            var updated = this.rotateInner(<any>chart);
            if (!updated){
                chart.update();
            }
            if (!this.clickJustFired){
                this.clickJustFired = true;
                var clickData: DonutClickData | undefined;
                if (index != null){
                    var ring = this.datasetIndexRingMap[pointItems[0].datasetIndex];
                    clickData = {
                        catName: ring.items[index].catName,
                        subcatName: ring.items[index].subcatName,
                        movedToOtherCatNames: [...(ring.items[index].containsMoveToOtherCatNames || [])]
                    };
                }
                this.clickEmitter.emit(clickData);
                setTimeout(() => {
                    this.clickJustFired = false;
                }, 25);
            }
        }
        return this.activeItems;
    }
    private innerLabelBeforeDraw(chart: Chart<"doughnut", number[], unknown>, args: { cancelable: true }, options: any): boolean | void {
        var items = this.activeItems.length == 2 
            ? this.activeItems : this.clickedItems;
        if (this.outerRingCount == 2){
            var innerActive = items.length ? items[0].datasetIndex > 2 : false;
            var mainRing = this.donutData.outerRings[0];
            var otherRing = this.donutData.innerRings[0];
            var index = 0;
            var labelColor = this.theme!.normalText;
            var label1 = "";
            var label2 = "Total";
            if (items.length){
                if (items[0].datasetIndex == 1){
                    mainRing = this.donutData.outerRings[1];
                    otherRing = this.donutData.innerRings[1];
                } else if (items[0].datasetIndex == 3){
                    mainRing = this.donutData.innerRings[0];
                    otherRing = this.donutData.outerRings[0];
                } else if (items[0].datasetIndex == 4){
                    mainRing = this.donutData.innerRings[1];
                    otherRing = this.donutData.outerRings[1];
                }
                index = items[0].index;//both activeItems should have the same index
                labelColor = mainRing.items[index].colorSet.text;
                if (items.some(z => z.datasetIndex == 0)){
                    label2 = this.donutData.outerRings[0].items[index].label;
                } else {
                    if (!this.donutData.outerRings[1].items[index].movedToOther){
                        label1 = this.donutData.outerRings[1].items[index].catName;
                    }
                    label2 = this.donutData.outerRings[1].items[index].label;
                }
            } 
            if (label1){
                this.drawCenterLabel(chart, label1, 12, -80, labelColor);
            }
            this.drawCenterLabel(chart, label2, 20, -62, labelColor);

            var label3 = innerActive ? "monthly average" : this.date!;
            this.drawCenterLabel(chart, label3, 12, -37, this.theme!.mutedText);

            var totalAmount = getSum(mainRing.items.map(z => z.amount))
            var amount = items.length 
                ? mainRing.items[index].amount
                : totalAmount;

            var label4 =  "$" + new DecimalPipe('en-US').transform(amount, ".0-0")!;
            this.drawCenterLabel(chart, label4, 36, -12, labelColor);

            if (items.length){
                var percentStr = this.getPercentStr(totalAmount, amount)
                this.drawCenterLabel(chart, percentStr, 20, +13, this.theme!.mutedText);
            }

            var label6 = !innerActive ? "monthly average" : this.date!;
            this.drawCenterLabel(chart, label6, 12, +55, this.theme!.mutedText);

            var otherTotalAmount = getSum(otherRing.items.map(z => z.amount));
            var otherAmount = items.length 
                ? otherRing.items[index].amount
                : otherTotalAmount;
            var label7 = "$" + new DecimalPipe('en-US').transform(otherAmount, ".0-0")!;
            this.drawCenterLabel(chart, label7, 20, +75, labelColor);

            if (items.length){
                var percentStr = this.getPercentStr(otherTotalAmount, otherAmount)
                this.drawCenterLabel(chart, percentStr, 12, +90, this.theme!.mutedText);
            }
        } else {
            var innerActive = items.length ? items[0].datasetIndex > 1 : false;
            var mainRing = this.donutData.outerRings[0];
            var otherRing = this.donutData.innerRings[0];
            var index = 0;
            var labelColor = this.theme!.normalText;
            var label1 = "Total";
            if (items.length){
                if (items[0].datasetIndex == 2){
                    mainRing = this.donutData.innerRings[0];
                    otherRing = this.donutData.outerRings[0];
                }
                index = items[0].index;//both activeItems should have the same index
                labelColor = mainRing.items[index].colorSet.text;
                label1 = mainRing.items[index].label;
            } 
            this.drawCenterLabel(chart, label1, 14, -35, labelColor);

            var label3 = innerActive ? "average" : this.date!;
            this.drawCenterLabel(chart, label3, 12, -17, this.theme!.mutedText);

            var totalAmount = getSum(mainRing.items.map(z => z.amount))
            var amount = items.length 
                ? mainRing.items[index].amount
                : totalAmount;

            var label4 =  "$" + new DecimalPipe('en-US').transform(amount, ".0-0")!;
            this.drawCenterLabel(chart, label4, 28, 5, labelColor);

            if (items.length){
                var percentStr = this.getPercentStr(totalAmount, amount)
                this.drawCenterLabel(chart, percentStr, 12, 25, this.theme!.mutedText);
            } else {
                this.drawCenterLabel(chart, "average", 10, 24, this.theme!.mutedText);
                var otherTotalAmount = getSum(otherRing.items.map(z => z.amount));
                var label5 =  "$" + new DecimalPipe('en-US').transform(otherTotalAmount, ".0-0")!;
                this.drawCenterLabel(chart, label5, 12, 36, this.theme!.normalText);
            }
        }
    }
    private drawCenterLabel(chart: Chart<any>, label: string, size: number, yOffset: number, color: string){
        var { top, bottom, left, right, width, height } = chart.chartArea;
        var cx = left + width / 2;
        var cy = top + height / 2;
        chart.ctx.textBaseline = "middle";
        chart.ctx.textAlign = "right";
        chart.ctx.font = size + "px Arial";
        chart.ctx.fillStyle = color;
        var x = this.outerRingCount == 2 ? cx + 45 : cx + 40;
        chart.ctx.fillText(label, x, cy + yOffset);
    }

    private getPercentStr(sumAmount: number, amount: number): string {
        var percent = (amount / sumAmount * 100);
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
        if (this.outerRingCount == 2 && 360 - circum > requiredDegreesForLabel){
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

        var labelDatas: outerLabelData[] = [{
            fontSize: 20,
            inwardDistance: 10,
            items: this.donutData.outerRings[0].items.map(z => ({
                displayText: z.label,
                amount: z.amount,
                color: z.colorSet.text,
            }))
        }]
        if (this.outerRingCount == 2){
            var subcategoryLabelData: outerLabelData = {
                fontSize: 12,
                inwardDistance: 36,
                items: this.donutData.outerRings[1].items.map(z => ({
                    displayText: z.label,
                    amount: z.amount,
                    color: z.colorSet.text,
                }))
            };
            labelDatas.push(subcategoryLabelData);
        } else {
            labelDatas[0].fontSize = 14;
        }
        var drawer = new OuterLableDrawer(
            chart.ctx,
            chart.chartArea,
            labelDatas,
            this.outerCircum,
            animationProgress
        )
        drawer.drawLabels();
    }

    /**returns true if an update was run */
    private rotateInner(chart: Chart<"doughnut", number[], unknown>): boolean{
        var targetRotation = 0;
        if (this.clickedItems.length){
            var item = this.clickedItems[0];
            var ringOffset = 0;
            if (this.outerRingCount == 2 && (item.datasetIndex == 1 || item.datasetIndex == 4)){
                var ringOffset = 1;
            }
            var outerRing = this.donutData.outerRings[ringOffset];
            var innerRing = this.donutData.innerRings[ringOffset];
            var outerAmount = getSum(outerRing.items.slice(0, item.index).map(z => z.amount));
            var innerAmount = getSum(innerRing.items.slice(0, item.index).map(z => z.amount));
            targetRotation = (outerAmount - innerAmount) / this.maxTotal * 360
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
            if (this.outerRingCount == 2){
                chart.data.datasets[3].rotation = targetRotation;
                chart.data.datasets[4].rotation = targetRotation;
            } else {
                chart.data.datasets[2].rotation = targetRotation;
            }
            chart.update();
            return true;
        }
        return false;
    }

    private toDataset(ring: DonutDataRing, weight: number, circumference: number): ChartDataset<'doughnut', number[]>{
        return {
            data: ring.items.map(z => z.amount),
            backgroundColor: ring.items.map(z => z.colorSet.background),
            hoverBackgroundColor: ring.items.map(z => z.colorSet.hover),
            borderColor: ring.items.map(z => z.colorSet.border),
            borderWidth: 1,
            circumference: circumference,
            weight: weight,
        }
    }

    private renderChart(donutData: DonutData) {
        this.donutData = donutData;
        var datasets: ChartDataset<'doughnut', number[]>[] = []
        this.outerRingCount = donutData.outerRings.length;
        if (donutData.innerRings.length == 2){
            this.weights = [1, 0.35, 0.7]
        } else {
            this.weights = [1, 0.25, 0.65]
        }



        this.chartRenderStartTime = new Date().getTime();
        this.clickedItems = [];
        this.activeItems = [];
        this.innerRotation = 0;

        this.date = donutData.isYearly ? donutData.date.getFullYear() + "" : <string>new DatePipe('en-US').transform(donutData.date, 'MMM y');
        this.averageType = donutData.isYearly ? "yearly average" : "monthly average";

        var outerSum = getSum(donutData.outerRings[0].items.map(z => z.amount))
        var innerSum = getSum(donutData.innerRings[0].items.map(z => z.amount))
        this.maxTotal = Math.max(outerSum, innerSum);
        this.minTotal = Math.min(outerSum, innerSum);
        this.outerCircum = 360;
        this.innerCircum = 360;
        if (outerSum > innerSum) {
            this.innerCircum = 360 * innerSum / outerSum
        } else {
            this.outerCircum = 360 * outerSum / innerSum
        }
        var datasetIndex = 0;
        this.datasetIndexRingMap = {};
        for (var outerRing of donutData.outerRings){
            this.datasetIndexRingMap[datasetIndex++] = outerRing;
            datasets.push(this.toDataset(outerRing, this.weights[0], this.outerCircum));
        }
        datasetIndex++;
        datasets.push({
            data: [],
            backgroundColor: [],
            hoverBackgroundColor: [],
            borderColor: [],
            borderWidth: 1,
            circumference: 0,
            weight: this.weights[1]
        })
        for (var innerRing of donutData.innerRings){
            this.datasetIndexRingMap[datasetIndex++] = innerRing;
            datasets.push(this.toDataset(innerRing, this.weights[2], this.innerCircum));
        }

        if (this.chart) {
            this.chart.destroy();
        }
        this.chart = new Chart("donut-canvas", {
            type: 'doughnut',
            data: {
                datasets: <any>datasets
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
                        enabled: false
                    },
                    legend: {
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